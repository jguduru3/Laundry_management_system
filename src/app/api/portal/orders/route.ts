import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId, unauthorized } from "@/lib/auth";
import { createOrder, errorMessage, errorResponseStatus } from "@/lib/orders";

const portalOrderInclude = { items: { include: { service: true } }, pickupAgent: { select: { name: true, phone: true } }, deliveryAgent: { select: { name: true, phone: true } } } as const;

export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) return unauthorized();
  try {
    const orders = await db.order.findMany({
      where: { customerId },
      include: portalOrderInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// Customers book a pickup: always starts PENDING / UNPAID and is priced server-side.
export async function POST(req: Request) {
  const customerId = await getCustomerId();
  if (!customerId) return unauthorized();
  try {
    const { items, notes, pickupDate, pickupSlot, paymentMethod, deliveryType, couponCode, area, address } = await req.json();
    const order = await createOrder({
      customerId,
      items,
      notes,
      pickupDate,
      pickupSlot,
      paymentMethod,
      deliveryType,
      couponCode,
      area,
      address,
      source: "PORTAL",
    });
    const { customer: _customer, ...rest } = order;
    return NextResponse.json(rest);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorResponseStatus(error) });
  }
}
