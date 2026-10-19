import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const totalOrders = await db.order.count();
    
    const orders = await db.order.findMany({
      include: {
        items: {
          include: {
            service: true
          }
        }
      }
    });

    const activeOrders = orders.filter(o => 
      ['PENDING', 'PICKED_UP', 'WASHING', 'DRYING', 'IRONING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
    ).length;

    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    const totalRevenue = orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const billable = orders.filter(o => o.status !== 'CANCELLED');
    const sum = (pick: (o: typeof orders[number]) => number) => Number(billable.reduce((t, o) => t + pick(o), 0).toFixed(2));
    const platformFeeRevenue = sum(o => o.platformFee);
    const charges = {
      platformFees: platformFeeRevenue,
      deliveryFees: sum(o => o.deliveryFee),
      expressCharges: sum(o => o.expressCharge),
      discounts: sum(o => o.discount),
    };

    const rated = orders.filter(o => o.rating);
    const averageRating = rated.length ? Number((rated.reduce((t, o) => t + (o.rating ?? 0), 0) / rated.length).toFixed(1)) : null;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const todaysPickups = await db.order.findMany({
      where: { status: 'PENDING', pickupDate: { gte: startOfDay, lt: endOfDay } },
      include: { customer: { select: { name: true, phone: true } }, pickupAgent: { select: { name: true } } },
      orderBy: [{ pickupSlot: 'asc' }, { createdAt: 'asc' }],
    });
    const outForDelivery = orders.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'READY').length;

    // Sales by date
    // Keyed by calendar day so sorting doesn't depend on parsing a display label.
    const salesByDay = new Map<number, number>();
    orders.forEach(o => {
      if (o.status !== 'CANCELLED') {
        const day = new Date(o.createdAt);
        day.setHours(0, 0, 0, 0);
        salesByDay.set(day.getTime(), (salesByDay.get(day.getTime()) || 0) + o.totalAmount);
      }
    });

    const salesTrend = [...salesByDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, amount]) => ({
        date: new Date(day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        amount: Number(amount.toFixed(2))
      }));

    // Services breakdown
    const serviceCounts: { [key: string]: { count: number, revenue: number } } = {};
    orders.forEach(o => {
      if (o.status !== 'CANCELLED') {
        o.items.forEach(item => {
          const serviceName = item.service.name;
          if (!serviceCounts[serviceName]) {
            serviceCounts[serviceName] = { count: 0, revenue: 0 };
          }
          serviceCounts[serviceName].count += item.quantity;
          serviceCounts[serviceName].revenue += item.totalPrice;
        });
      }
    });
    const serviceBreakdown = Object.entries(serviceCounts).map(([name, data]) => ({
      name,
      value: data.count,
      revenue: Number(data.revenue.toFixed(2))
    }));

    return NextResponse.json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      platformFeeRevenue,
      charges,
      averageRating,
      ratingCount: rated.length,
      outForDelivery,
      todaysPickups: todaysPickups.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer.name,
        phone: o.customer.phone,
        area: o.area,
        address: o.address,
        pickupSlot: o.pickupSlot,
        deliveryType: o.deliveryType,
        agent: o.pickupAgent?.name ?? null,
      })),
      totalOrders,
      activeOrders,
      pendingOrders,
      salesTrend,
      serviceBreakdown,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
