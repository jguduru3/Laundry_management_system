'use client';

import { useEffect, useState } from "react";
import { Banknote, Bike, ExternalLink, KeyRound, Loader2, Pause, Phone, Play, Plus, QrCode, Trash2, Truck, UserRound, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/pricing";
import { formatIndianMobile } from "@/lib/hyderabad";

interface AgentRow {
  id: string;
  name: string;
  phone: string;
  zone: string | null;
  vehicle: string | null;
  isActive: boolean;
  pickupsPending: number;
  deliveriesPending: number;
  deliveredToday: number;
  cashToday: number;
  upiToday: number;
}

const ZONES = ["West", "North-West", "Central", "North", "East"];
const input = "w-full h-10 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const label = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";
const EMPTY = { name: "", phone: "", pin: "", zone: "", vehicle: "" };

export default function AgentsView() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(Array.isArray(d) ? d : []));

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(Array.isArray(d) ? d : []));
  }, []);

  const send = async (url: string, method: string, body?: object) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const a = await send("/api/agents", "POST", form);
      toast({ title: "Agent added", description: `${a.name} can sign in at /agent with their mobile number and PIN.` });
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast({ title: "Could not add agent", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, title: string) => {
    try {
      await fn();
      toast({ title });
      load();
    } catch (err) {
      toast({ title: "Action failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  const resetPin = (a: AgentRow) => {
    const pin = prompt(`New 4 to 6 digit PIN for ${a.name}`);
    if (!pin) return;
    act(() => send(`/api/agents/${a.id}`, "PATCH", { pin }), `PIN updated for ${a.name}`);
  };

  const totals = (agents ?? []).reduce(
    (t, a) => ({ cash: t.cash + a.cashToday, upi: t.upi + a.upiToday, delivered: t.delivered + a.deliveredToday, open: t.open + a.pickupsPending + a.deliveriesPending }),
    { cash: 0, upi: 0, delivered: 0, open: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-display text-4xl tracking-tight">Delivery Agents</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Pickup and delivery partners, their workload and today&apos;s collections.</p>
        </div>
        <div className="flex gap-2 self-start">
          <a href="/agent" target="_blank" className="flex items-center gap-2 border border-border hover:bg-muted text-sm font-medium px-4 py-2.5 rounded-full">
            <ExternalLink className="h-4 w-4" /> Agent app
          </a>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2.5 rounded-full cursor-pointer">
            <Plus className="h-4 w-4" /> Add agent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { t: "Open tasks", v: String(totals.open), icon: Clock },
          { t: "Delivered today", v: String(totals.delivered), icon: Truck },
          { t: "Cash with agents", v: formatINR(totals.cash), icon: Banknote },
          { t: "UPI collected", v: formatINR(totals.upi), icon: QrCode },
        ].map(({ t, v, icon: Icon }) => (
          <div key={t} className="bg-card border border-border rounded-3xl p-5 shadow-sm">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em] flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {t}</p>
            <p className="font-display text-3xl mt-2 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {agents === null ? (
        <div className="py-20 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
      ) : agents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">No agents yet. Add your first pickup and delivery partner.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {agents.map((a) => (
            <div key={a.id} className={`bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5 ${a.isActive ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0"><UserRound className="h-5 w-5" strokeWidth={1.75} /></span>
                  <div className="min-w-0">
                    <div className="font-display text-2xl leading-none truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Phone className="h-3 w-3" /> {formatIndianMobile(a.phone)}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${a.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  {a.isActive ? "Active" : "Paused"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>{a.zone ? `${a.zone} zone` : "All zones"}</span>
                {a.vehicle && <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> {a.vehicle}</span>}
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Pickups", a.pickupsPending],
                  ["Deliveries", a.deliveriesPending],
                  ["Done today", a.deliveredToday],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-muted/60 py-3">
                    <dd className="font-display text-2xl tabular-nums">{v}</dd>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{k}</dt>
                  </div>
                ))}
              </dl>
              <div className="flex justify-between text-sm border-t border-border pt-4">
                <span className="text-muted-foreground">Cash to settle</span>
                <span className="font-semibold tabular-nums">{formatINR(a.cashToday)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => act(() => send(`/api/agents/${a.id}`, "PATCH", { isActive: !a.isActive }), a.isActive ? `${a.name} paused` : `${a.name} is active`)} className="flex-1 h-9 rounded-full border border-border text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-muted cursor-pointer">
                  {a.isActive ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
                </button>
                <button onClick={() => resetPin(a)} className="flex-1 h-9 rounded-full border border-border text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-muted cursor-pointer">
                  <KeyRound className="h-3.5 w-3.5" /> New PIN
                </button>
                <button
                  aria-label={`Remove ${a.name}`}
                  onClick={() => confirm(`Remove ${a.name}?`) && act(() => send(`/api/agents/${a.id}`, "DELETE"), `${a.name} removed`)}
                  className="h-9 w-9 rounded-full border border-border inline-flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <form onSubmit={create} className="bg-card border border-border rounded-3xl w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h3 className="font-display text-2xl">New agent</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={label}>Full name</label><input required className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className={label}>Mobile</label><input required inputMode="tel" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98xxxxxxxx" /></div>
              <div><label className={label}>PIN (4-6 digits)</label><input required inputMode="numeric" maxLength={6} className={input} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} /></div>
              <div>
                <label className={label}>Zone</label>
                <select className={input} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                  <option value="">All zones</option>
                  {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div><label className={label}>Vehicle</label><input className={input} value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="TS09 AB 1234, bike" /></div>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium rounded-full border border-border hover:bg-muted cursor-pointer">Cancel</button>
              <button disabled={saving} className="px-5 py-2 text-sm font-medium rounded-full bg-blue-900 hover:bg-blue-800 text-white inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add agent
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
