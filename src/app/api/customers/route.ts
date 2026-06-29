import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Map to include calculated stats
    const mapped = customers.map(c => {
      const totalSpend = c.orders
        .filter(o => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        ...c,
        orderCount: c.orders.length,
        totalSpend: Number(totalSpend.toFixed(2))
      };
    });

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, phone, email, address, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and Phone are required fields" }, { status: 400 });
    }

    if (id) {
      // Update
      const customer = await db.customer.update({
        where: { id },
        data: { name, phone, email, address, notes }
      });
      return NextResponse.json(customer);
    } else {
      // Create
      const customer = await db.customer.create({
        data: { name, phone, email, address, notes }
      });
      return NextResponse.json(customer);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
