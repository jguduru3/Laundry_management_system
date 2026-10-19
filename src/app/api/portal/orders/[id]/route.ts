import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId, unauthorized } from "@/lib/auth";
import { OrderInputError, errorMessage, errorResponseStatus, estimateDelivery, validatePickup } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

type Params = { params: Promise<{ id: string }> };

const include = { items: { include: { service: true } }, pickupAgent: { select: { name: true, phone: true } }, deliveryAgent: { select: { name: true, phone: true } } } as const;

async function findOwnOrder(id: string, customerId: string) {
  return db.order.findFirst({ where: { id, customerId }, include });
}

export async function GET(req: Request, { params }: Params) {
  const customerId = await getCustomerId();
  if (!customerId) return unauthorized();
  try {
    const { id } = await params;
    const order = await findOwnOrder(id, customerId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

/*
 * Customer actions on their own order:
 *  - cancel:     only while PENDING (not yet picked up)
 *  - reschedule: { pickupDate, pickupSlot } only while PENDING
 *  - rate:       { rating 1-5, feedback? } only once DELIVERED, once
 */
export async function PATCH(req: Request, { params }: Params) {
  const customerId = await getCustomerId();
  if (!customerId) return unauthorized();
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const order = await findOwnOrder(id, customerId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (body.action === "cancel") {
      if (order.status !== "PENDING") return conflict("Orders can only be cancelled before pickup");
      if (await db.payment.count({ where: { orderId: id, status: "PAID" } })) {
        return conflict("This order has been paid online. Please contact us to cancel it and arrange a refund.");
      }
      return NextResponse.json(await db.order.update({ where: { id }, data: { status: "CANCELLED" }, include }));
    }

    if (body.action === "reschedule") {
      if (order.status !== "PENDING") return conflict("Pickup can only be rescheduled before it happens");
      const pickupDate = validatePickup(body.pickupDate, body.pickupSlot);
      const deliveryDate = estimateDelivery(pickupDate, order.deliveryType, await getSettings());
      return NextResponse.json(
        await db.order.update({ where: { id }, data: { pickupDate, pickupSlot: body.pickupSlot, deliveryDate }, include })
      );
    }

    if (body.action === "rate") {
      if (order.status !== "DELIVERED") return conflict("You can rate an order after it is delivered");
      if (order.rating) return conflict("This order has already been rated");
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new OrderInputError("Rating must be 1 to 5");
      const feedback = typeof body.feedback === "string" ? body.feedback.trim().slice(0, 1000) || null : null;
      return NextResponse.json(
        await db.order.update({ where: { id }, data: { rating, feedback, ratedAt: new Date() }, include })
      );
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorResponseStatus(error) });
  }
}

function conflict(error: string) {
  return NextResponse.json({ error }, { status: 409 });
}
