import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/auth";
import { getAgent, repriceAtPickup } from "@/lib/agents";
import { OrderInputError, errorMessage, errorResponseStatus } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

const include = {
  customer: { select: { name: true, phone: true } },
  items: { include: { service: { select: { name: true, unit: true } } } },
} as const;

/*
 * Agent actions on an order assigned to them:
 *  - pickup:         { quantities: [{ itemId, quantity }], note? }  PENDING -> PICKED_UP (re-priced)
 *  - start_delivery: READY -> OUT_FOR_DELIVERY
 *  - deliver:        { code, collect?: { method: "CASH" | "MOBILE" } }  OUT_FOR_DELIVERY -> DELIVERED
 *  - note:           { note }  adds a timestamped note (customer not home, gate closed, ...)
 */
export async function PATCH(req: Request, { params }: Params) {
  const agent = await getAgent();
  if (!agent) return unauthorized();
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const order = await db.order.findUnique({ where: { id } });
    if (!order || (order.pickupAgentId !== agent.id && order.deliveryAgentId !== agent.id)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const isPickupAgent = order.pickupAgentId === agent.id;
    const isDeliveryAgent = order.deliveryAgentId === agent.id;

    if (body.action === "pickup") {
      if (!isPickupAgent) return conflict("This pickup is assigned to another agent");
      if (order.status !== "PENDING") return conflict("This order has already been picked up");
      const { updates, charges } = await repriceAtPickup(id, Array.isArray(body.quantities) ? body.quantities : []);
      const updated = await db.$transaction(async (tx) => {
        for (const u of updates) {
          await tx.orderItem.update({ where: { id: u.id }, data: { quantity: u.quantity, totalPrice: u.totalPrice } });
        }
        return tx.order.update({
          where: { id },
          data: {
            status: "PICKED_UP",
            pickedUpAt: new Date(),
            expressCharge: charges.expressCharge,
            discount: charges.discount,
            deliveryFee: charges.deliveryFee,
            totalAmount: charges.total,
            agentNotes: appendNote(order.agentNotes, agent.name, body.note),
          },
          include,
        });
      });
      return NextResponse.json(strip(updated));
    }

    if (body.action === "start_delivery") {
      if (!isDeliveryAgent) return conflict("This delivery is assigned to another agent");
      if (order.status !== "READY") return conflict("Only orders marked Ready can go out for delivery");
      const updated = await db.order.update({
        where: { id },
        data: { status: "OUT_FOR_DELIVERY", outForDeliveryAt: new Date() },
        include,
      });
      return NextResponse.json(strip(updated));
    }

    if (body.action === "deliver") {
      if (!isDeliveryAgent) return conflict("This delivery is assigned to another agent");
      if (order.status !== "OUT_FOR_DELIVERY") return conflict("Start the delivery before completing it");
      const code = String(body.code ?? "").trim();
      if (!order.deliveryCode || !sameCode(code, order.deliveryCode)) {
        throw new OrderInputError("Delivery code does not match. Ask the customer for the 4-digit code in their app.");
      }
      const data: Record<string, unknown> = { status: "DELIVERED", deliveredAt: new Date() };
      if (order.paymentStatus !== "PAID") {
        const method = body.collect?.method;
        if (method !== "CASH" && method !== "MOBILE") {
          throw new OrderInputError(`Collect the amount due and choose Cash or UPI`);
        }
        Object.assign(data, { paymentStatus: "PAID", paymentMethod: method, collectedAmount: order.totalAmount, collectedVia: method });
      }
      const updated = await db.order.update({ where: { id }, data, include });
      return NextResponse.json(strip(updated));
    }

    if (body.action === "note") {
      const note = String(body.note ?? "").trim();
      if (!note) throw new OrderInputError("Write a note first");
      const updated = await db.order.update({ where: { id }, data: { agentNotes: appendNote(order.agentNotes, agent.name, note) }, include });
      return NextResponse.json(strip(updated));
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorResponseStatus(error) });
  }
}

function conflict(error: string) {
  return NextResponse.json({ error }, { status: 409 });
}

function sameCode(a: string, b: string) {
  const x = Buffer.from(a.padEnd(8));
  const y = Buffer.from(b.padEnd(8));
  return x.length === y.length && timingSafeEqual(x, y);
}

function appendNote(existing: string | null, who: string, note: unknown) {
  const text = typeof note === "string" ? note.trim().slice(0, 500) : "";
  if (!text) return existing;
  const stamp = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return [existing, `${stamp} · ${who}: ${text}`].filter(Boolean).join("\n");
}

function strip<T extends { deliveryCode: string | null }>(o: T) {
  return { ...o, deliveryCode: undefined };
}
