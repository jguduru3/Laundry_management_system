import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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
      ['PENDING', 'WASHING', 'DRYING', 'IRONING', 'READY'].includes(o.status)
    ).length;

    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    const totalRevenue = orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Sales by date
    const salesByDate: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.status !== 'CANCELLED') {
        const dateStr = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        salesByDate[dateStr] = (salesByDate[dateStr] || 0) + o.totalAmount;
      }
    });
    
    // Sort sales trend by date
    const salesTrend = Object.entries(salesByDate).map(([date, amount]) => ({
      date,
      amount
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
