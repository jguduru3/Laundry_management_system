'use client';

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  StickyNote,
  Tag,
  Truck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { formatINR } from "@/lib/pricing";
import {
  api,
  CATEGORY_LABELS,
  slotAvailable,
  todayISO,
  type PortalConfig,
  type PortalCustomer,
  type PortalOrder,
  type PortalService,
  type Quote,
} from "./types";

const PAYMENT_OPTIONS = [
  { id: "MOBILE", label: "UPI (GPay, PhonePe, Paytm)" },
  { id: "CASH", label: "Cash on delivery" },
  { id: "CARD", label: "Card on delivery" },
];

const fieldClass = "w-full h-10 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function BookPickup({
  services,
  customer,
  config,
  onBooked,
}: {
  services: PortalService[];
  customer: PortalCustomer;
  config: PortalConfig;
  onBooked: (order: PortalOrder) => void;
}) {
  const { settings, areas, slots } = config;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [deliveryType, setDeliveryType] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [pickupSlot, setPickupSlot] = useState("");
  const [area, setArea] = useState(customer.area || "");
  const [address, setAddress] = useState(customer.address || "");
  const [paymentMethod, setPaymentMethod] = useState("MOBILE");
  const [notes, setNotes] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const active = services.filter((s) => s.isActive);
  const categories = ["all", ...Array.from(new Set(active.map((s) => s.category)))];
  const visible = active.filter(
    (s) => (category === "all" || s.category === category) && s.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const items = useMemo(
    () => Object.entries(cart).filter(([, q]) => q > 0).map(([serviceId, quantity]) => ({ serviceId, quantity })),
    [cart]
  );
  const itemCount = items.length;

  // The server prices every change, so the total shown is exactly what will be charged.
  useEffect(() => {
    if (itemCount === 0) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setQuoting(true);
      api<Quote>("/api/portal/quote", { method: "POST", body: JSON.stringify({ items, deliveryType, couponCode }) })
        .then((q) => !cancelled && setQuote(q))
        .catch((e) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setQuoting(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [items, itemCount, deliveryType, couponCode]);

  const shownQuote = itemCount > 0 ? quote : null;
  const firstOpenSlot = slots.find((s) => slotAvailable(pickupDate, s.id))?.id ?? "";
  const effectiveSlot = pickupSlot && slotAvailable(pickupDate, pickupSlot) ? pickupSlot : "";

  const step = (s: PortalService, delta: number) => {
    const inc = s.unit === "kg" ? 0.5 : 1;
    const start = s.unit === "kg" && !cart[s.id] && delta > 0 ? 2.5 : (cart[s.id] || 0) + delta * inc; // typical minimum load
    setCart({ ...cart, [s.id]: Math.max(0, Number(start.toFixed(1))) });
  };

  const missing = [
    itemCount === 0 && "add at least one service",
    shownQuote && !shownQuote.meetsMinimum && `reach the ${formatINR(shownQuote.minOrderValue)} minimum`,
    !area && "choose your locality",
    !address.trim() && "add your address",
    !effectiveSlot && "pick a time slot",
  ].filter(Boolean) as string[];

  const placeOrder = async () => {
    setError("");
    setBusy(true);
    try {
      const order = await api<PortalOrder>("/api/portal/orders", {
        method: "POST",
        // A code the quote refused is shown as an error but never sent, so it can't block the booking.
        body: JSON.stringify({ items, pickupDate, pickupSlot: effectiveSlot, paymentMethod, notes, deliveryType, couponCode: shownQuote?.coupon ? couponCode : null, area, address }),
      });
      setCart({});
      setNotes("");
      setCouponCode("");
      setCouponInput("");
      onBooked(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  };

  const c = shownQuote?.charges;
  const subtotal = c?.subtotal ?? 0;
  const toFree = settings.freeDeliveryAbove - (subtotal + (c?.expressCharge ?? 0) - (c?.discount ?? 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <section className="space-y-5 min-w-0">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Book a pickup</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add items now; laundry is weighed and garments are counted at pickup. Minimum order {formatINR(settings.minOrderValue)}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search saree, blanket, shoes..." className={`${fieldClass} pl-9`} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition cursor-pointer ${
                category === cat ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {cat === "all" ? "All services" : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((s) => {
            const qty = cart[s.id] || 0;
            return (
              <div key={s.id} className={`min-w-0 rounded-2xl border bg-card p-4 flex flex-col gap-3 transition ${qty > 0 ? "border-blue-500/50 ring-4 ring-blue-500/5" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</div>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{CATEGORY_LABELS[s.category] || s.category}</span>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="text-sm">
                    <span className="font-bold text-base">{formatINR(s.price)}</span>
                    <span className="text-muted-foreground"> / {s.unit}</span>
                  </div>
                  {qty === 0 ? (
                    <button onClick={() => step(s, 1)} className="h-9 px-3.5 rounded-lg border border-border text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-muted cursor-pointer">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  ) : (
                    <div className="flex items-center rounded-lg bg-blue-600 text-white">
                      <button aria-label={`Decrease ${s.name}`} onClick={() => step(s, -1)} className="h-9 w-9 flex items-center justify-center hover:bg-blue-700 rounded-l-lg cursor-pointer">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-14 text-center text-sm font-semibold tabular-nums">{qty} {s.unit}</span>
                      <button aria-label={`Increase ${s.name}`} onClick={() => step(s, 1)} className="h-9 w-9 flex items-center justify-center hover:bg-blue-700 rounded-r-lg cursor-pointer">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {visible.length === 0 && <p className="text-sm text-muted-foreground col-span-full py-6 text-center">No services match your search.</p>}
        </div>
      </section>

      {/* Checkout */}
      <aside className="rounded-2xl border border-border bg-card p-5 space-y-5 lg:sticky lg:top-24">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="h-4 w-4 text-blue-600" /> Checkout
        </div>

        {/* Delivery speed */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "STANDARD", icon: Truck, title: "Standard", sub: `${settings.standardHours} hours` },
            { id: "EXPRESS", icon: Zap, title: "Express", sub: `${settings.expressHours} hours · +${settings.expressRate}%` },
          ] as const).map(({ id, icon: Icon, title, sub }) => (
            <button
              key={id}
              onClick={() => setDeliveryType(id)}
              className={`rounded-xl border p-3 text-left transition cursor-pointer ${deliveryType === id ? "border-blue-600 bg-blue-600/5 ring-4 ring-blue-500/10" : "border-border hover:bg-muted/50"}`}
            >
              <Icon className={`h-4 w-4 ${deliveryType === id ? "text-blue-600" : "text-muted-foreground"}`} />
              <div className="text-sm font-semibold mt-1.5">{title}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </button>
          ))}
        </div>

        {/* Pickup */}
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Locality</span>
            <select value={area} onChange={(e) => setArea(e.target.value)} className={fieldClass}>
              <option value="">Select your area in Hyderabad</option>
              {areas.map((a) => <option key={a.name} value={a.name}>{a.name} ({a.pincode})</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">Pickup address</span>
            <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, building, street, landmark" className={`${fieldClass} h-auto py-2`} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Pickup date</span>
            <input type="date" min={todayISO()} max={todayISO(14)} value={pickupDate} onChange={(e) => { setPickupDate(e.target.value); setPickupSlot(""); }} className={fieldClass} />
          </label>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Time slot</span>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => {
                const open = slotAvailable(pickupDate, slot.id);
                const chosen = effectiveSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    disabled={!open}
                    onClick={() => setPickupSlot(slot.id)}
                    className={`h-9 rounded-lg border text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                      chosen ? "border-blue-600 bg-blue-600 text-white" : "border-border hover:bg-muted"
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
            {!firstOpenSlot && <p className="text-xs text-amber-600">No slots left today. Choose tomorrow.</p>}
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Payment at delivery</span>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={fieldClass}>
              {PAYMENT_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold inline-flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Instructions</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Stains, delicate items, gate or security details" className={`${fieldClass} h-auto py-2`} />
          </label>
        </div>

        {/* Coupon */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Offer code</span>
          {couponCode && shownQuote?.coupon ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Check className="h-4 w-4" /> {shownQuote.coupon.code}
              </span>
              <button aria-label="Remove coupon" onClick={() => { setCouponCode(""); setCouponInput(""); }} className="p-1 rounded hover:bg-muted cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="e.g. WELCOME20" className={`${fieldClass} uppercase`} />
              <button onClick={() => setCouponCode(couponInput.trim())} disabled={!couponInput.trim() || itemCount === 0} className="h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50 cursor-pointer">
                Apply
              </button>
            </div>
          )}
          {couponCode && shownQuote?.couponError && <p className="text-xs text-rose-600 dark:text-rose-400">{shownQuote.couponError}</p>}
          {shownQuote?.coupon?.description && <p className="text-xs text-muted-foreground">{shownQuote.coupon.description}</p>}
        </div>

        {/* Bill */}
        <dl className="space-y-1.5 text-sm border-t border-border pt-4">
          {shownQuote?.lines.map((l) => (
            <div key={l.serviceId} className="flex justify-between gap-3 text-muted-foreground">
              <dt className="truncate">{l.name} <span className="tabular-nums">x {l.quantity}</span></dt>
              <dd className="tabular-nums shrink-0">{formatINR(l.totalPrice)}</dd>
            </div>
          ))}
          <Row label="Items subtotal" value={subtotal} strong />
          {c && c.expressCharge > 0 && <Row label={`Express (${settings.expressRate}%)`} value={c.expressCharge} />}
          {c && c.discount > 0 && <Row label={`Discount${shownQuote?.coupon ? ` (${shownQuote.coupon.code})` : ""}`} value={-c.discount} accent />}
          <Row label="Pickup & delivery" value={c?.deliveryFee ?? 0} free={!!c && c.deliveryFee === 0} />
          <Row label="Platform fee" value={c?.platformFee ?? settings.platformFee} />
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
            <dt className="inline-flex items-center gap-2">Total {quoting && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}</dt>
            <dd className="tabular-nums">{formatINR(c?.total ?? 0)}</dd>
          </div>
          <p className="text-[11px] text-muted-foreground">Inclusive of GST. Final amount is confirmed after weighing at pickup.</p>
        </dl>

        {c && toFree > 0 && c.deliveryFee > 0 && (
          <p className="text-xs rounded-lg bg-blue-500/5 text-blue-700 dark:text-blue-400 px-3 py-2">
            Add {formatINR(toFree)} more for free pickup and delivery.
          </p>
        )}

        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground inline-flex gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> To continue, {missing.join(", ")}.
          </p>
        )}

        <button
          onClick={placeOrder}
          disabled={busy || missing.length > 0 || quoting}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm pickup {c ? `· ${formatINR(c.total)}` : ""}
        </button>
      </aside>
    </div>
  );
}

function Row({ label, value, strong, accent, free }: { label: string; value: number; strong?: boolean; accent?: boolean; free?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-foreground font-medium pt-1" : "text-muted-foreground"}`}>
      <dt>{label}</dt>
      <dd className={`tabular-nums ${accent ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {free ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">FREE</span> : value < 0 ? `- ${formatINR(-value)}` : formatINR(value)}
      </dd>
    </div>
  );
}
