'use client';

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Receipt, 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight
} from "lucide-react";
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
  Legend 
} from "recharts";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeOrders: number;
  pendingOrders: number;
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

const COLORS = [
  "oklch(0.6 -0.15 220)", // Blue
  "oklch(0.65 -0.15 160)", // Green
  "oklch(0.7 -0.15 300)", // Purple
  "oklch(0.75 -0.15 70)", // Yellow
  "oklch(0.68 -0.18 20)", // Coral/Red
  "oklch(0.55 -0.1 260)", // Dark Blue
  "oklch(0.8 -0.05 120)"  // Light Green
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
      value: `$${stats?.totalRevenue.toFixed(2) || "0.00"}`,
      description: "Lifetime earnings",
      icon: DollarSign,
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
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      description: "Awaiting pickup/process",
      icon: AlertCircle,
      colorClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/20"
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      description: "All time requests",
      icon: Receipt,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      borderClass: "border-emerald-500/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back to AquaClean, here is your summary.</p>
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
              className={`bg-card border ${card.borderClass} rounded-2xl p-6 shadow-sm flex items-center justify-between hover:scale-[1.02] transition-transform duration-200`}
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</p>
                <h3 className="text-2xl font-bold tracking-tight">{card.value}</h3>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${card.colorClass}`}>
                <Icon className={`h-6 w-6 ${card.pulse ? "animate-spin" : ""}`} style={{ animationDuration: card.pulse ? '8s' : undefined }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2">
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
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                    tickFormatter={(v) => `$${v}`}
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
                    stroke="#2563eb" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
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
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-purple-500" />
            <h3 className="font-bold text-base">Service Distribution</h3>
          </div>
          <div className="h-[250px] w-full flex items-center justify-center">
            {stats?.serviceBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.serviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.serviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [`${value} items ($${props.payload.revenue.toFixed(2)})`, name]}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)'
                    }} 
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">
                No items washed yet.
              </div>
            )}
          </div>
        </div>
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
                  let statusBg = "bg-muted text-muted-foreground";
                  if (order.status === "DELIVERED") statusBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                  else if (order.status === "READY") statusBg = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
                  else if (order.status === "WASHING" || order.status === "DRYING" || order.status === "IRONING") statusBg = "bg-orange-500/10 text-orange-600 dark:text-orange-400";
                  else if (order.status === "PENDING") statusBg = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";

                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors duration-150">
                      <td className="py-3 font-semibold text-foreground">{order.orderNumber}</td>
                      <td className="py-3">
                        <div className="font-medium text-foreground">{order.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBg}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-foreground">
                        ${order.totalAmount.toFixed(2)}
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
