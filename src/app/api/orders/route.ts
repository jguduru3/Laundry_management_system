import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.customer = {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } }
        ]
      };
    }

    const orders = await db.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            service: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, items, paymentMethod, paymentStatus, status, notes, pickupDate, deliveryDate } = body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing customerId or items" }, { status: 400 });
    }

    // Resolve services and calculate total
    let totalAmount = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      const service = await db.service.findUnique({
        where: { id: item.serviceId }
      });
      if (!service) {
        return NextResponse.json({ error: `Service with ID ${item.serviceId} not found` }, { status: 400 });
      }
      const qty = parseFloat(item.quantity);
      const price = service.price;
      const itemTotal = qty * price;
      totalAmount += itemTotal;

      orderItemsToCreate.push({
        serviceId: service.id,
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        notes: item.notes || null
      });
    }

    // Generate sequential order number
    const latestOrder = await db.order.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    let nextNum = 1001;
    if (latestOrder && latestOrder.orderNumber.startsWith('LND-')) {
      const currentNum = parseInt(latestOrder.orderNumber.replace('LND-', ''), 10);
      if (!isNaN(currentNum)) {
        nextNum = currentNum + 1;
      }
    }
    const orderNumber = `LND-${nextNum}`;

    // Create Order and OrderItems
    const newOrder = await db.order.create({
      data: {
        orderNumber,
        customerId,
        status: status || 'PENDING',
        paymentStatus: paymentStatus || 'UNPAID',
        paymentMethod: paymentMethod || 'CASH',
        totalAmount,
        notes: notes || null,
        pickupDate: pickupDate ? new Date(pickupDate) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        items: {
          create: orderItemsToCreate
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            service: true
          }
        }
      }
    });

    return NextResponse.json(newOrder);
  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
