import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, errorMessage, orderInclude } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const order = await db.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { status, paymentStatus, paymentMethod, deliveryDate, notes, pickupSlot, pickupAgentId, deliveryAgentId } = await req.json();

    if (status && !ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status ${status}` }, { status: 400 });
    }
    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return NextResponse.json({ error: `Invalid payment status ${paymentStatus}` }, { status: 400 });
    }
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: `Invalid payment method ${paymentMethod}` }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate);
    if (notes !== undefined) updateData.notes = notes;
    if (pickupSlot !== undefined) updateData.pickupSlot = pickupSlot || null;

    // Assign or clear the pickup / delivery agent (only active agents can be assigned).
    for (const [field, value] of [["pickupAgentId", pickupAgentId], ["deliveryAgentId", deliveryAgentId]] as const) {
      if (value === undefined) continue;
      if (value) {
        const agent = await db.agent.findUnique({ where: { id: value } });
        if (!agent || !agent.isActive) return NextResponse.json({ error: "Choose an active agent" }, { status: 400 });
      }
      updateData[field] = value || null;
    }
    // Keep the timeline consistent when staff move an order along by hand.
    if (status === "PICKED_UP") updateData.pickedUpAt = new Date();
    if (status === "OUT_FOR_DELIVERY") updateData.outForDeliveryAt = new Date();
    if (status === "DELIVERED") updateData.deliveredAt = new Date();

    const order = await db.order.update({ where: { id }, data: updateData, include: orderInclude });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    await db.order.delete({ where: { id } });
    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
