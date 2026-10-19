import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createOrder, errorMessage, errorResponseStatus, orderInclude } from "@/lib/orders";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } }
      ];
    }

    const orders = await db.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const newOrder = await createOrder({ ...body, source: "STAFF" });
    return NextResponse.json(newOrder);
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: errorMessage(error) }, { status: errorResponseStatus(error) });
  }
}
