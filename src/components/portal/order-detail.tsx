'use client';

import { useState } from "react";
import { Bike, CalendarClock, CalendarDays, CreditCard, KeyRound, Loader2, MapPin, MessageCircle, Phone, QrCode, ShieldCheck, Star, Truck, X, Zap } from "lucide-react";
import { formatINR } from "@/lib/pricing";
import { fullAddress } from "@/lib/hyderabad";
import { StatusBadge, StatusTracker, STATUS_META } from "@/components/order-status";
import {
  api,
  formatDate,
  itemsSubtotal,
  slotAvailable,
  todayISO,
  upiLink,
  type PortalConfig,
  type PortalOrder,
} from "./types";

interface CheckoutInit {
  keyId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; contact?: string; email?: string };
}

interface CheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

type RazorpayCtor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, cb: (res: { error?: { description?: string } }) => void) => void;
};

// Loads Razorpay Checkout once per page.
let checkoutScript: Promise<void> | null = null;
function loadCheckout() {
  if ((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay) return Promise.resolve();
  checkoutScript ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://checkout.razorpay.com/v1/checkout.js";
    el.onload = () => resolve();
    el.onerror = () => {
      checkoutScript = null;
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(el);
  });
  return checkoutScript;
}

export default function OrderDetail({
  order,
  config,
  onClose,
  onUpdated,
}: {
  order: PortalOrder;
  config: PortalConfig;
  onClose: () => void;
  onUpdated: (order: PortalOrder, message: string) => void;
}) {
  const { settings, slots } = config;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(todayISO(1));
  const [newSlot, setNewSlot] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const subtotal = itemsSubtotal(order);
  const slotLabel = slots.find((s) => s.id === order.pickupSlot)?.label;
  const payable = order.paymentStatus !== "PAID" && order.status !== "CANCELLED";
  const canPayUpi = settings.upiId && payable;
  const canPayOnline = config.onlinePayments && payable;
  const whatsapp = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Hi, I need help with order ${order.orderNumber}.`)}`
    : null;

  const act = async (action: string, body: object, message: string) => {
    setBusy(action);
    setError("");
    try {
      const updated = await api<PortalOrder>(`/api/portal/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ action, ...body }) });
      onUpdated(updated, message);
      setRescheduling(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const payOnline = async () => {
    setBusy("pay");
    setError("");
    try {
      await loadCheckout();
      const init = await api<CheckoutInit>(`/api/portal/orders/${order.id}/pay`, { method: "POST", body: JSON.stringify({ action: "create" }) });
      const Razorpay = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
      await new Promise<void>((resolve, reject) => {
        const checkout = new Razorpay({
          key: init.keyId,
          order_id: init.gatewayOrderId,
          amount: init.amount,
          currency: init.currency,
          name: init.name,
          description: init.description,
          prefill: init.prefill,
          theme: { color: "#2563eb" },
          handler: (res: CheckoutResponse) => {
            api<PortalOrder>(`/api/portal/orders/${order.id}/pay`, { method: "POST", body: JSON.stringify({ action: "verify", ...res }) })
              .then((updated) => {
                onUpdated(updated, updated.paymentStatus === "PAID" ? "Payment received. Thank you." : "Part payment received");
                resolve();
              })
              .catch(reject);
          },
          modal: { ondismiss: () => resolve() },
        });
        checkout.on("payment.failed", (res) => setError(res.error?.description || "Payment failed. You can try again."));
        checkout.open();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Order ${order.orderNumber}`}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground">Order</div>
            <h3 className="font-display text-2xl tracking-tight">{order.orderNumber}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={order.status} />
              {order.deliveryType === "EXPRESS" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                  <Zap className="h-3.5 w-3.5" /> Express
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <StatusTracker status={order.status} />
            {order.status !== "CANCELLED" && <p className="text-sm text-muted-foreground">{STATUS_META[order.status]?.hint}</p>}
          </section>

          {/* Handover code: the agent can't complete delivery without it */}
          {["READY", "OUT_FOR_DELIVERY"].includes(order.status) && order.deliveryCode && (
            <section className="rounded-2xl border border-brass-500/30 bg-brass-100/40 dark:bg-brass-500/10 p-4 flex items-center gap-4">
              <span className="h-11 w-11 rounded-xl bg-brass-500/15 text-brass-600 flex items-center justify-center shrink-0"><KeyRound className="h-5 w-5" /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Delivery code</div>
                <div className="font-display text-3xl tracking-[0.3em] leading-tight">{order.deliveryCode}</div>
                <p className="text-xs text-muted-foreground">Share it only with our agent when you receive your clothes.</p>
              </div>
            </section>
          )}

          {(() => {
            const agent = order.status === "PENDING" ? order.pickupAgent : ["READY", "OUT_FOR_DELIVERY"].includes(order.status) ? order.deliveryAgent : null;
            if (!agent) return null;
            return (
              <section className="rounded-2xl border border-border p-4 flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0"><Bike className="h-5 w-5" strokeWidth={1.75} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{order.status === "PENDING" ? "Your pickup partner" : "Your delivery partner"}</div>
                  <div className="font-medium truncate">{agent.name}</div>
                </div>
                <a href={`tel:+91${agent.phone}`} className="h-9 px-3 rounded-full border border-border text-sm font-medium inline-flex items-center gap-1.5 hover:bg-muted">
                  <Phone className="h-4 w-4" /> Call
                </a>
              </section>
            );
          })()}

          <section className="grid grid-cols-2 gap-3 text-sm">
            <Info icon={CalendarDays} label="Pickup" value={`${formatDate(order.pickupDate)}${slotLabel ? `, ${slotLabel}` : ""}`} />
            <Info icon={Truck} label="Expected delivery" value={formatDate(order.deliveryDate)} />
            <Info icon={MapPin} label="Address" value={fullAddress(order.address, order.area) || "At store"} wide />
            <Info icon={CreditCard} label="Payment" value={`${order.paymentMethod === "MOBILE" ? "UPI" : order.paymentMethod} · ${order.paymentStatus === "PAID" ? "Paid" : "Due"}`} />
            <Info icon={CalendarDays} label="Placed on" value={formatDate(order.createdAt, true)} />
          </section>

          {order.status === "PENDING" && (
            <section className="rounded-2xl border border-border p-4 space-y-3">
              {!rescheduling ? (
                <button onClick={() => setRescheduling(true)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-2 cursor-pointer">
                  <CalendarClock className="h-4 w-4" /> Reschedule pickup
                </button>
              ) : (
                <>
                  <div className="text-sm font-semibold">New pickup time</div>
                  <input type="date" min={todayISO()} max={todayISO(14)} value={newDate} onChange={(e) => { setNewDate(e.target.value); setNewSlot(""); }} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.id}
                        disabled={!slotAvailable(newDate, s.id)}
                        onClick={() => setNewSlot(s.id)}
                        className={`h-9 rounded-lg border text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${newSlot === s.id ? "bg-blue-600 border-blue-600 text-white" : "border-border hover:bg-muted"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setRescheduling(false)} className="h-9 px-3 rounded-lg text-sm hover:bg-muted cursor-pointer">Keep current</button>
                    <button
                      disabled={!newSlot || busy !== null}
                      onClick={() => act("reschedule", { pickupDate: newDate, pickupSlot: newSlot }, "Pickup rescheduled")}
                      className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                    >
                      {busy === "reschedule" && <Loader2 className="h-4 w-4 animate-spin" />} Save
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium p-3">Service</th>
                  <th className="text-right font-medium p-3">Qty</th>
                  <th className="text-right font-medium p-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3">
                      <div className="font-medium">{item.service.name}</div>
                      <div className="text-xs text-muted-foreground">{formatINR(item.unitPrice)} / {item.service.unit}</div>
                    </td>
                    <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="p-3 text-right tabular-nums">{formatINR(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="border-t border-border p-4 space-y-1.5 text-sm bg-muted/20">
              <Line label="Items subtotal" value={subtotal} />
              {order.expressCharge > 0 && <Line label="Express charge" value={order.expressCharge} />}
              {order.discount > 0 && <Line label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={-order.discount} />}
              {(order.source === "PORTAL" || order.deliveryFee > 0) && <Line label="Pickup & delivery" value={order.deliveryFee} free={order.deliveryFee === 0} />}
              <Line label="Platform fee" value={order.platformFee} />
              <div className="flex justify-between font-bold text-base pt-1"><dt>Total</dt><dd className="tabular-nums">{formatINR(order.totalAmount)}</dd></div>
            </dl>
          </section>

          {canPayOnline && (
            <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4 text-blue-600" /> Pay online</div>
                <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">Test mode</span>
              </div>
              <p className="text-xs text-muted-foreground inline-flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 mt-px shrink-0" /> UPI, cards and netbanking through Razorpay. Your order is marked paid as soon as the payment is confirmed.
              </p>
              <button
                onClick={payOnline}
                disabled={busy !== null}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                {busy === "pay" && <Loader2 className="h-4 w-4 animate-spin" />} Pay {formatINR(order.totalAmount)}
              </button>
            </section>
          )}

          {canPayUpi && (
            <section className={`rounded-2xl p-4 space-y-3 ${canPayOnline ? "border border-border" : "border border-blue-500/20 bg-blue-500/5"}`}>
              <div className="flex items-center gap-2 text-sm font-semibold"><QrCode className="h-4 w-4 text-blue-600" /> {canPayOnline ? "Or pay with a UPI app" : "Pay with UPI"}</div>
              <p className="text-xs text-muted-foreground">
                Opens GPay, PhonePe or Paytm on your phone with {formatINR(order.totalAmount)} to {settings.upiId}. Our team confirms the payment before delivery.
              </p>
              <a
                href={upiLink(settings.upiId!, settings.businessName, order.totalAmount, order.orderNumber)}
                className={`h-10 px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${canPayOnline ? "border border-border hover:bg-muted" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                {canPayOnline ? "Open UPI app" : `Pay ${formatINR(order.totalAmount)}`}
              </a>
            </section>
          )}

          {order.status === "DELIVERED" && (
            <section className="rounded-2xl border border-border p-4 space-y-3">
              {order.rating ? (
                <>
                  <div className="text-sm font-semibold">Your rating</div>
                  <Stars value={order.rating} />
                  {order.feedback && <p className="text-sm text-muted-foreground">{order.feedback}</p>}
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold">How was this order?</div>
                  <Stars value={rating} onChange={setRating} />
                  <textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Tell us what went well or what we should fix" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                  <button
                    disabled={!rating || busy !== null}
                    onClick={() => act("rate", { rating, feedback }, "Thanks for your feedback")}
                    className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                  >
                    {busy === "rate" && <Loader2 className="h-4 w-4 animate-spin" />} Submit rating
                  </button>
                </>
              )}
            </section>
          )}

          {order.notes && (
            <section className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4 text-sm">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Instructions</div>
              {order.notes}
            </section>
          )}

          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Need help? Chat with us on WhatsApp
            </a>
          )}
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        {order.status === "PENDING" && (
          <footer className="p-5 border-t border-border">
            <button
              onClick={() => confirm(`Cancel order ${order.orderNumber}?`) && act("cancel", {}, "Order cancelled")}
              disabled={busy !== null}
              className="w-full h-11 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/5 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />} Cancel order
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, free }: { label: string; value: number; free?: boolean }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className={`tabular-nums ${value < 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {free ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">FREE</span> : value < 0 ? `- ${formatINR(-value)}` : formatINR(value)}
      </dd>
    </div>
  );
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star className={`h-6 w-6 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}

function Info({ icon: Icon, label, value, wide }: { icon: typeof CalendarDays; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-3 ${wide ? "col-span-2" : ""}`}>
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}
