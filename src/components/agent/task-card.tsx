'use client';

import { useState } from "react";
import {
  Banknote,
  Check,
  ChevronDown,
  Clock,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Phone,
  Plus,
  QrCode,
  StickyNote,
  Truck,
  Zap,
} from "lucide-react";
import { formatINR } from "@/lib/pricing";
import { formatIndianMobile, fullAddress, slotLabel } from "@/lib/hyderabad";
import { StatusBadge } from "@/components/order-status";

export interface AgentTask {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryType: string;
  totalAmount: number;
  pickupDate: string | null;
  pickupSlot: string | null;
  deliveryDate: string | null;
  area: string | null;
  address: string | null;
  notes: string | null;
  agentNotes: string | null;
  collectedAmount: number | null;
  collectedVia: string | null;
  customer: { name: string; phone: string };
  items: { id: string; quantity: number; unitPrice: number; totalPrice: number; service: { name: string; unit: string } }[];
}

type Mode = "pickup" | "delivery" | "done";

export default function TaskCard({
  task,
  mode,
  onAction,
}: {
  task: AgentTask;
  mode: Mode;
  onAction: (id: string, body: object, success: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(task.items.map((i) => [i.id, i.quantity])));
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<"CASH" | "MOBILE">(task.paymentMethod === "MOBILE" ? "MOBILE" : "CASH");
  const [note, setNote] = useState("");

  const address = fullAddress(task.address, task.area);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Hyderabad`)}`;
  const phoneDigits = task.customer.phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/${phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits}?text=${encodeURIComponent(
    mode === "pickup"
      ? `Hi ${task.customer.name.split(" ")[0]}, I am on my way to collect your laundry (order ${task.orderNumber}).`
      : `Hi ${task.customer.name.split(" ")[0]}, I am on my way with your laundry (order ${task.orderNumber}). Please keep your 4-digit delivery code ready.`
  )}`;
  const newSubtotal = task.items.reduce((t, i) => t + (qty[i.id] ?? i.quantity) * i.unitPrice, 0);
  const oldSubtotal = task.items.reduce((t, i) => t + i.totalPrice, 0);
  const due = task.paymentStatus !== "PAID";

  const run = async (key: string, body: object, success: string) => {
    setBusy(key);
    const ok = await onAction(task.id, body, success);
    setBusy(null);
    if (ok) setNote("");
  };

  const step = (itemId: string, unit: string, dir: number) => {
    const inc = unit === "kg" ? 0.5 : 1;
    setQty((q) => ({ ...q, [itemId]: Math.max(inc, Number(((q[itemId] ?? 0) + dir * inc).toFixed(1))) }));
  };

  return (
    <article className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 flex items-start gap-3 cursor-pointer">
        <div className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center ${mode === "pickup" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" : mode === "delivery" ? "bg-brass-500/15 text-brass-600" : "bg-emerald-500/10 text-emerald-600"}`}>
          {mode === "pickup" ? <Clock className="h-5 w-5" strokeWidth={1.75} /> : mode === "delivery" ? <Truck className="h-5 w-5" strokeWidth={1.75} /> : <Check className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xl leading-none">{task.orderNumber}</span>
            {task.deliveryType === "EXPRESS" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brass-600"><Zap className="h-3 w-3" /> Express</span>
            )}
          </div>
          <div className="text-sm font-medium mt-1 truncate">{task.customer.name}</div>
          <div className="text-xs text-muted-foreground truncate">{address || "No address"}</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
            {mode === "pickup" && (
              <span className="px-2 py-0.5 rounded-full bg-muted font-medium">
                {task.pickupDate ? new Date(task.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""} · {slotLabel(task.pickupSlot) || "Any time"}
              </span>
            )}
            {mode !== "pickup" && <StatusBadge status={task.status} />}
            <span className={`ml-auto font-semibold tabular-nums ${due ? "text-foreground" : "text-emerald-600"}`}>
              {formatINR(task.totalAmount)} {due ? "due" : "paid"}
            </span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground mt-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Contact */}
          <div className="grid grid-cols-3 gap-2">
            <a href={`tel:${phoneDigits.length === 10 ? `+91${phoneDigits}` : phoneDigits}`} className="h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted">
              <Phone className="h-4 w-4" /> Call
            </a>
            <a href={mapUrl} target="_blank" rel="noreferrer" className="h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted">
              <Navigation className="h-4 w-4" /> Map
            </a>
            <a href={waUrl} target="_blank" rel="noreferrer" className="h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted">
              <MessageCircle className="h-4 w-4" /> Chat
            </a>
          </div>
          <div className="text-xs text-muted-foreground flex gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {address || "No address on file"} · {formatIndianMobile(task.customer.phone)}
          </div>

          {task.notes && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3 text-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">Customer instructions</div>
              {task.notes}
            </div>
          )}

          {/* Items */}
          <div className="rounded-2xl border border-border divide-y divide-border">
            {task.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.service.name}</div>
                  <div className="text-xs text-muted-foreground">{formatINR(i.unitPrice)} / {i.service.unit}</div>
                </div>
                {mode === "pickup" ? (
                  <div className="flex items-center rounded-lg border border-border">
                    <button aria-label={`Less ${i.service.name}`} onClick={() => step(i.id, i.service.unit, -1)} className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded-l-lg cursor-pointer"><Minus className="h-4 w-4" /></button>
                    <span className="min-w-14 text-center text-sm font-semibold tabular-nums">{qty[i.id]} {i.service.unit}</span>
                    <button aria-label={`More ${i.service.name}`} onClick={() => step(i.id, i.service.unit, 1)} className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded-r-lg cursor-pointer"><Plus className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <span className="text-sm tabular-nums">{i.quantity} {i.service.unit}</span>
                )}
              </div>
            ))}
          </div>

          {mode === "pickup" && (
            <div className="space-y-3">
              {Math.abs(newSubtotal - oldSubtotal) > 0.001 && (
                <p className="text-xs rounded-lg bg-blue-500/5 text-blue-700 dark:text-blue-300 px-3 py-2">
                  Items subtotal changes from {formatINR(oldSubtotal)} to {formatINR(newSubtotal)}. The bill is re-priced when you confirm.
                </p>
              )}
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pickup note (stains, damage, bag count)" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <button
                disabled={busy !== null}
                onClick={() => run("pickup", { action: "pickup", quantities: task.items.map((i) => ({ itemId: i.id, quantity: qty[i.id] })), note }, `${task.orderNumber} picked up`)}
                className="w-full h-12 rounded-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {busy === "pickup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm pickup
              </button>
            </div>
          )}

          {mode === "delivery" && task.status === "READY" && (
            <button
              disabled={busy !== null}
              onClick={() => run("start", { action: "start_delivery" }, `${task.orderNumber} is out for delivery`)}
              className="w-full h-12 rounded-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} Start delivery
            </button>
          )}

          {mode === "delivery" && task.status === "OUT_FOR_DELIVERY" && (
            <div className="space-y-3">
              {due && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold">Collect {formatINR(task.totalAmount)}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {([["CASH", "Cash", Banknote], ["MOBILE", "UPI", QrCode]] as const).map(([id, label, Icon]) => (
                      <button key={id} onClick={() => setMethod(id)} className={`h-11 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer ${method === id ? "border-blue-900 bg-blue-900 text-white" : "border-border hover:bg-muted"}`}>
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Delivery code from customer</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="0000"
                  className="w-full h-12 px-3 rounded-xl border border-border bg-background text-center text-2xl tracking-[0.6em] font-display"
                />
              </label>
              <button
                disabled={busy !== null || code.length !== 4}
                onClick={() => run("deliver", { action: "deliver", code, collect: due ? { method } : undefined }, `${task.orderNumber} delivered`)}
                className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {busy === "deliver" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {due ? `Collected ${formatINR(task.totalAmount)} · Mark delivered` : "Mark delivered"}
              </button>
            </div>
          )}

          {mode === "done" && task.collectedAmount != null && (
            <p className="text-sm text-muted-foreground">Collected {formatINR(task.collectedAmount)} by {task.collectedVia === "MOBILE" ? "UPI" : "cash"}.</p>
          )}

          {/* Pickups take their note with the confirmation; deliveries can log notes any time */}
          {mode === "delivery" && (
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (customer not home...)" className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-border bg-background text-sm" />
              <button disabled={!note.trim() || busy !== null} onClick={() => run("note", { action: "note", note }, "Note saved")} className="h-10 px-3 rounded-xl border border-border text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                <StickyNote className="h-4 w-4" /> Save
              </button>
            </div>
          )}

          {task.agentNotes && <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground rounded-xl bg-muted/60 p-3">{task.agentNotes}</pre>}
        </div>
      )}
    </article>
  );
}
