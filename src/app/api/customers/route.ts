import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isServiceArea, normalizeIndianMobile } from "@/lib/hyderabad";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const customers = await db.customer.findMany({
      omit: { pinHash: true },
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
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "A customer with this phone number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id, name, email, address, notes } = body;
    // Store valid Indian mobiles as 10 digits so portal sign-in matches; keep anything else as typed.
    const phone = normalizeIndianMobile(body.phone) ?? (typeof body.phone === "string" ? body.phone.trim() : body.phone);
    const area = isServiceArea(body.area) ? body.area : null;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and Phone are required fields" }, { status: 400 });
    }

    if (id) {
      // Update
      const customer = await db.customer.update({
        where: { id },
        data: { name, phone, email, address, area, notes },
        omit: { pinHash: true }
      });
      return NextResponse.json(customer);
    } else {
      // Create
      const customer = await db.customer.create({
        data: { name, phone, email, address, area, notes },
        omit: { pinHash: true }
      });
      return NextResponse.json(customer);
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "A customer with this phone number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
