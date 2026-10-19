'use client';

import { useState, useEffect } from "react";
import { 
  IndianRupee,
  Star,
  MapPin,
  CalendarClock,
  Zap, 
  Receipt, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight
} from "lucide-react";
import { StatusBadge } from "@/components/order-status";
import { formatINR } from "@/lib/pricing";
import { formatIndianMobile, fullAddress, slotLabel } from "@/lib/hyderabad";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
} from "recharts";

interface DashboardStats {
  totalRevenue: number;
  platformFeeRevenue: number;
  totalOrders: number;
  activeOrders: number;
  pendingOrders: number;
  charges: { platformFees: number; deliveryFees: number; expressCharges: number; discounts: number };
  averageRating: number | null;
  ratingCount: number;
  outForDelivery: number;
  todaysPickups: Array<{ id: string; orderNumber: string; customer: string; phone: string; area: string | null; address: string | null; pickupSlot: string | null; deliveryType: string; agent: string | null }>;
  salesTrend: Array<{ date: string; amount: number }>;
  serviceBreakdown: Array<{ name: string; value: number; revenue: number }>;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: { name: string; phone: string };
  status: string;
  totalAmount: number;
  createdAt: string;
}

// Brand-matched series colours: ink navy, dusty azure, brass, sage, clay, slate, mist
const COLORS = [
  "#34507f",
  "#6f9cc4",
  "#c4a05c",
  "#7fa38c",
  "#c27a62",
  "#5c6478",
  "#a9bfd6",
];

export default function DashboardView({ onNavigateToOrders }: { onNavigateToOrders: () => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const statsRes = await fetch("/api/dashboard/stats");
        const statsData = await statsRes.json();
        setStats(statsData);

        const ordersRes = await fetch("/api/orders?status=ALL");
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData.slice(0, 5));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-10 w-24 bg-muted rounded-lg" />
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-2xl p-6" />
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-card border border-border rounded-2xl lg:col-span-2" />
          <div className="h-80 bg-card border border-border rounded-2xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: formatINR(stats?.totalRevenue ?? 0),
      description: `Incl. ${formatINR(stats?.charges.platformFees ?? 0)} platform and ${formatINR(stats?.charges.deliveryFees ?? 0)} delivery fees`,
      icon: IndianRupee,
      colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/20"
    },
    {
      title: "Active Orders",
      value: stats?.activeOrders || 0,
      description: "In wash or processing",
      icon: RefreshCw,
      colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      borderClass: "border-orange-500/20",
      pulse: true
    },
    {
      title: "Pickups Today",
      value: stats?.todaysPickups.length || 0,
      description: `${stats?.pendingOrders || 0} pickups scheduled overall`,
      icon: CalendarClock,
      colorClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/20"
    },
    {
      title: "Customer Rating",
      value: stats?.averageRating ? `${stats.averageRating} / 5` : "No ratings",
      description: `${stats?.ratingCount || 0} rated of ${stats?.totalOrders || 0} orders`,
      icon: Star,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      borderClass: "border-emerald-500/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-4xl tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Today&apos;s pickups, live orders and earnings.</p>
        </div>
        <button 
          onClick={onNavigateToOrders}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/15 transition-all duration-200 cursor-pointer"
        >
          New Order <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i} 
              className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow duration-300"
            >
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">{card.title}</p>
                <h3 className="font-display text-3xl tracking-tight">{card.value}</h3>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${card.colorClass}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="min-w-0 bg-card border border-border rounded-3xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-base">Revenue Trend</h3>
          </div>
          <div className="h-[250px] w-full">
            {stats?.salesTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.salesTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34507f" stopOpacity={0.18}/>
                      <stop offset="95%" stopColor="#34507f" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--muted-foreground)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#34507f" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No revenue data logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Services Breakdown Chart */}
        <div className="min-w-0 bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
            <h3 className="font-bold text-base">Service Distribution</h3>
          </div>
          {stats?.serviceBreakdown.length ? (
            <>
              <div className="relative h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.serviceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {stats.serviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [`${value} items (${formatINR(props.payload.revenue)})`, name]}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '12px',
                        color: 'var(--foreground)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-3xl leading-none">{stats.serviceBreakdown.length}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-1">services</span>
                </div>
              </div>
              {/* Top services by revenue; the full list is in the tooltip */}
              <ul className="mt-3 space-y-2 text-xs">
                {[...stats.serviceBreakdown]
                  .map((s, i) => ({ ...s, color: COLORS[i % COLORS.length] }))
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((s) => (
                    <li key={s.name} className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate text-muted-foreground">{s.name}</span>
                      <span className="ml-auto tabular-nums font-medium">{formatINR(s.revenue)}</span>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              No items washed yet.
            </div>
          )}
        </div>
      </div>

      {/* Today's pickup run, grouped by slot for the delivery team */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-5 w-5 text-blue-500" />
          <h3 className="font-bold text-base">Today&apos;s Pickups</h3>
          <span className="text-xs text-muted-foreground">({stats?.todaysPickups.length || 0})</span>
        </div>
        {stats?.todaysPickups.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stats.todaysPickups.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-4 space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.orderNumber}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">{slotLabel(p.pickupSlot) || "Any time"}</span>
                </div>
                <div className="text-sm">{p.customer} <span className="text-muted-foreground">· {formatIndianMobile(p.phone)}</span></div>
                <div className="text-xs text-muted-foreground flex gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="truncate">{fullAddress(p.address, p.area) || "No address"}</span>
                </div>
                <div className={`text-xs ${p.agent ? "text-muted-foreground" : "text-amber-600 font-medium"}`}>
                  {p.agent ? `Agent: ${p.agent}` : "No agent assigned"}
                </div>
                {p.deliveryType === "EXPRESS" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-600"><Zap className="h-3 w-3" /> Express</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">No pickups scheduled for today.</div>
        )}
      </div>

      {/* Recent Orders List */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-base">Recent Orders</h3>
          </div>
          <button 
            onClick={onNavigateToOrders}
            className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            View All Orders <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {recentOrders.length ? (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground font-semibold">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors duration-150">
                      <td className="py-3 font-semibold text-foreground">{order.orderNumber}</td>
                      <td className="py-3">
                        <div className="font-medium text-foreground">{order.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{formatIndianMobile(order.customer.phone)}</div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 text-right font-bold text-foreground">
                        {formatINR(order.totalAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No orders found in the database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
