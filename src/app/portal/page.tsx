'use client';

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Home,
  Loader2,
  LogOut,
  PackageOpen,
  Plus,
  Shirt,
  UserRound,
  Wallet,
  Activity,
  Star,
} from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { StatusBadge, StatusTracker } from "@/components/order-status";
import { formatINR } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";
import AuthPanel from "@/components/portal/auth-panel";
import BookPickup from "@/components/portal/book-pickup";
import OrderDetail from "@/components/portal/order-detail";
import ProfilePanel from "@/components/portal/profile-panel";
import { api, formatDate, type PortalConfig, type PortalCustomer, type PortalOrder, type PortalService } from "@/components/portal/types";

type Tab = "overview" | "book" | "orders" | "profile";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "book", label: "Book pickup", icon: Plus },
  { id: "orders", label: "My orders", icon: ClipboardList },
  { id: "profile", label: "Profile", icon: UserRound },
];

const ACTIVE = ["PENDING", "PICKED_UP", "WASHING", "DRYING", "IRONING", "READY", "OUT_FOR_DELIVERY"];

export default function PortalPage() {
  const { toast } = useToast();
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [checking, setChecking] = useState(true);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [services, setServices] = useState<PortalService[]>([]);
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [selected, setSelected] = useState<PortalOrder | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "past">("all");

  const notify = useCallback(
    (title: string, description?: string, error?: boolean) =>
      toast({ title, description, variant: error ? "destructive" : "default" }),
    [toast]
  );


  useEffect(() => {
    api<{ customer: PortalCustomer | null; otpEnabled: boolean }>("/api/portal/auth")
      .then(({ customer, otpEnabled }) => {
        setCustomer(customer);
        setOtpEnabled(otpEnabled);
      })
      .finally(() => setChecking(false));
    api<PortalConfig>("/api/settings").then(setConfig).catch(() => {});
  }, []);

  const customerId = customer?.id;
  useEffect(() => {
    if (!customerId) return;
    Promise.all([api<PortalOrder[]>("/api/portal/orders"), api<PortalService[]>("/api/services")])
      .then(([o, s]) => {
        setOrders(o);
        setServices(s);
      })
      .catch((e) => notify("Could not load your orders", e.message, true));
  }, [customerId, notify]);

  const signOut = async () => {
    await api("/api/portal/auth", { method: "DELETE" });
    setCustomer(null);
    setOrders([]);
    setTab("overview");
  };

  const upsertOrder = (order: PortalOrder) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      return exists ? prev.map((o) => (o.id === order.id ? order : o)) : [order, ...prev];
    });
    setSelected((cur) => (cur && cur.id === order.id ? order : cur));
  };

  if (checking || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) return <AuthPanel areas={config.areas} otpEnabled={otpEnabled} onSignedIn={(c) => { setCustomer(c); setTab("overview"); }} />;

  const activeOrders = orders.filter((o) => ACTIVE.includes(o.status));
  const totalSpent = orders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.totalAmount, 0);
  const toRate = orders.find((o) => o.status === "DELIVERED" && !o.rating);
  const filteredOrders = orders.filter((o) =>
    orderFilter === "all" ? true : orderFilter === "active" ? ACTIVE.includes(o.status) : !ACTIVE.includes(o.status)
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <BrandLogo subtitle="Customer Portal" />
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition cursor-pointer ${
                  tab === id ? "bg-blue-600/10 text-blue-700 dark:text-blue-400" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-sm font-semibold">{customer.name}</div>
              <div className="text-xs text-muted-foreground">{customer.phone}</div>
            </div>
            <button onClick={signOut} aria-label="Sign out" title="Sign out" className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted cursor-pointer">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-10">
        {tab === "overview" && (
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white p-6 sm:p-8">
              <div className="absolute inset-0 bg-grain opacity-80" />
              <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-brass-500/20 blur-3xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                  <p className="text-blue-100 text-sm">Welcome back</p>
                  <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-1">{customer.name.split(" ")[0]}</h1>
                  <p className="text-blue-50/90 mt-2 max-w-md text-sm">
                    {activeOrders.length > 0
                      ? `You have ${activeOrders.length} order${activeOrders.length > 1 ? "s" : ""} in progress.`
                      : "Nothing in the wash right now. Schedule a pickup whenever you are ready."}
                  </p>
                </div>
                <button onClick={() => setTab("book")} className="self-start sm:self-auto h-11 px-6 rounded-full bg-white text-blue-900 font-medium text-sm inline-flex items-center gap-2 shadow-lg hover:bg-blue-50 transition-colors cursor-pointer">
                  Book a pickup <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            {toRate && (
              <button onClick={() => setSelected(toRate)} className="w-full text-left rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3 cursor-pointer hover:bg-amber-500/10 transition">
                <span className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0"><Star className="h-5 w-5" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">Rate order {toRate.orderNumber}</div>
                  <div className="text-xs text-muted-foreground">Delivered {formatDate(toRate.deliveryDate)}. Your feedback helps us improve.</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Stat icon={Activity} label="In progress" value={String(activeOrders.length)} tone="text-blue-600 bg-blue-500/10" />
              <Stat icon={ClipboardList} label="Total orders" value={String(orders.length)} tone="text-violet-600 bg-violet-500/10" />
              <Stat icon={Wallet} label="Total spent" value={formatINR(totalSpent)} tone="text-emerald-600 bg-emerald-500/10" />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-tight">Live tracking</h2>
                {orders.length > 0 && (
                  <button onClick={() => setTab("orders")} className="text-sm text-blue-600 dark:text-blue-400 font-medium inline-flex items-center gap-1 cursor-pointer">
                    All orders <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
              {activeOrders.length === 0 ? (
                <EmptyState onBook={() => setTab("book")} />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {activeOrders.map((o) => (
                    <button key={o.id} onClick={() => setSelected(o)} className="text-left rounded-2xl border border-border bg-card p-5 space-y-5 hover:border-blue-500/40 hover:shadow-md transition cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{o.orderNumber}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {o.items.length} service{o.items.length > 1 ? "s" : ""} · Pickup {formatDate(o.pickupDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold tabular-nums">{formatINR(o.totalAmount)}</div>
                          <div className="text-xs text-muted-foreground">{o.paymentStatus === "PAID" ? "Paid" : "Pay on delivery"}{o.deliveryType === "EXPRESS" ? " · Express" : ""}</div>
                        </div>
                      </div>
                      <StatusTracker status={o.status} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "book" && (
          <BookPickup
            services={services}
            customer={customer}
            config={config}
            onBooked={(order) => {
              upsertOrder(order);
              setTab("overview");
              setSelected(order);
              notify("Pickup scheduled", `${order.orderNumber} · ${formatINR(order.totalAmount)}`);
            }}
          />
        )}

        {tab === "orders" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl tracking-tight">My orders</h2>
                <p className="text-sm text-muted-foreground mt-1">Every order placed online or at the store.</p>
              </div>
              <div className="inline-flex p-1 rounded-xl bg-muted self-start">
                {(["all", "active", "past"] as const).map((f) => (
                  <button key={f} onClick={() => setOrderFilter(f)} className={`h-8 px-3.5 rounded-lg text-sm font-medium capitalize cursor-pointer ${orderFilter === f ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {filteredOrders.length === 0 ? (
              <EmptyState onBook={() => setTab("book")} />
            ) : (
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {filteredOrders.map((o) => (
                  <button key={o.id} onClick={() => setSelected(o)} className="w-full text-left p-4 sm:p-5 flex items-center gap-4 hover:bg-muted/40 transition cursor-pointer">
                    <span className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Shirt className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{o.orderNumber}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {o.items.map((i) => i.service.name).join(", ")} · {formatDate(o.createdAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold tabular-nums">{formatINR(o.totalAmount)}</div>
                      <div className={`text-xs ${o.paymentStatus === "PAID" ? "text-emerald-600" : "text-muted-foreground"}`}>{o.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "profile" && <ProfilePanel customer={customer} areas={config.areas} onSaved={setCustomer} notify={notify} />}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur grid grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer ${tab === id ? "text-blue-600" : "text-muted-foreground"}`}>
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </nav>

      {selected && <OrderDetail order={selected} config={config} onClose={() => setSelected(null)} onUpdated={(o, message) => { upsertOrder(o); notify(message, o.orderNumber); }} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Home; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
      <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-display text-3xl leading-tight tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ onBook }: { onBook: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <span className="mx-auto h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
        <PackageOpen className="h-6 w-6 text-muted-foreground" />
      </span>
      <h3 className="mt-4 font-semibold">No orders here yet</h3>
      <p className="text-sm text-muted-foreground mt-1">Book a pickup and track it live from this page.</p>
      <button onClick={onBook} className="mt-5 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
        <Plus className="h-4 w-4" /> Book a pickup
      </button>
    </div>
  );
}
