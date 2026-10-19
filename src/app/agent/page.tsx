'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, ClipboardCheck, Loader2, LogOut, PackageOpen, Phone, QrCode, RefreshCw, Truck, Clock } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/pricing";
import TaskCard, { type AgentTask } from "@/components/agent/task-card";

interface Agent {
  id: string;
  name: string;
  phone: string;
  zone: string | null;
  vehicle: string | null;
}

interface RunSheet {
  agent: Agent;
  pickups: AgentTask[];
  deliveries: AgentTask[];
  done: AgentTask[];
  summary: {
    pickupsDue: number;
    upcomingPickups: number;
    deliveriesInHand: number;
    pickedUpToday: number;
    deliveredToday: number;
    cashCollected: number;
    upiCollected: number;
  };
}

type Tab = "pickups" | "deliveries" | "done";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export default function AgentPage() {
  const { toast } = useToast();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [checking, setChecking] = useState(true);
  const [sheet, setSheet] = useState<RunSheet | null>(null);
  const [tab, setTab] = useState<Tab>("pickups");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    call<{ agent: Agent | null }>("/api/agent/auth")
      .then(({ agent }) => setAgent(agent))
      .finally(() => setChecking(false));
  }, []);

  const load = useCallback(() => {
    setRefreshing(true);
    return call<RunSheet>("/api/agent/tasks")
      .then(setSheet)
      .catch((e) => toast({ title: "Could not load tasks", description: e.message, variant: "destructive" }))
      .finally(() => setRefreshing(false));
  }, [toast]);

  const agentId = agent?.id;
  useEffect(() => {
    if (!agentId) return;
    const first = setTimeout(load, 0);
    const t = setInterval(load, 60000); // pick up new assignments from the store
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [agentId, load]);

  const onAction = async (id: string, body: object, success: string) => {
    try {
      await call(`/api/agent/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast({ title: success });
      await load();
      return true;
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
      return false;
    }
  };

  const signOut = async () => {
    await call("/api/agent/auth", { method: "DELETE" });
    setAgent(null);
    setSheet(null);
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  if (!agent) return <AgentLogin onSignedIn={setAgent} />;

  const list = sheet ? (tab === "pickups" ? sheet.pickups : tab === "deliveries" ? sheet.deliveries : sheet.done) : [];
  const s = sheet?.summary;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <BrandLogo subtitle="Delivery Partner" />
          <div className="flex items-center gap-2">
            <button onClick={() => load()} aria-label="Refresh" className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted cursor-pointer">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={signOut} aria-label="Sign out" className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted cursor-pointer">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-16">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white p-6">
          <div className="absolute inset-0 bg-grain opacity-80" />
          <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-brass-500/20 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.16em] text-blue-100/80">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="font-display text-4xl mt-2">Hi, {agent.name.split(" ")[0]}</h1>
            <p className="text-sm text-blue-50/80 mt-1">{agent.zone ? `${agent.zone} Hyderabad` : "All zones"}{agent.vehicle ? ` · ${agent.vehicle}` : ""}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 p-3">
                <div className="text-[10px] uppercase tracking-wider text-blue-100/80 flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Cash in hand</div>
                <div className="font-display text-2xl mt-1 tabular-nums">{formatINR(s?.cashCollected ?? 0)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 p-3">
                <div className="text-[10px] uppercase tracking-wider text-blue-100/80 flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" /> UPI collected</div>
                <div className="font-display text-2xl mt-1 tabular-nums">{formatINR(s?.upiCollected ?? 0)}</div>
              </div>
            </div>
            <p className="text-xs text-blue-50/70 mt-3">
              {s ? `${s.pickedUpToday} picked up and ${s.deliveredToday} delivered today` : "Loading your run sheet..."}
              {s && s.upcomingPickups > 0 ? ` · ${s.upcomingPickups} pickups scheduled for later days` : ""}
            </p>
          </div>
        </section>

        <nav className="grid grid-cols-3 gap-1 p-1 rounded-full bg-muted">
          {([
            ["pickups", "Pickups", Clock, s?.pickupsDue],
            ["deliveries", "Deliveries", Truck, s?.deliveriesInHand],
            ["done", "Done", ClipboardCheck, sheet?.done.length],
          ] as const).map(([id, label, Icon, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`h-10 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${tab === id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {label}
              {count ? <span className="text-[11px] tabular-nums px-1.5 rounded-full bg-blue-900 text-white">{count}</span> : null}
            </button>
          ))}
        </nav>

        <section className="space-y-3">
          {!sheet ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-10 text-center">
              <PackageOpen className="h-8 w-8 mx-auto text-muted-foreground" strokeWidth={1.5} />
              <p className="font-display text-2xl mt-3">All clear</p>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === "pickups" ? "No pickups due right now." : tab === "deliveries" ? "No deliveries assigned to you." : "Nothing completed yet today."}
              </p>
            </div>
          ) : (
            list.map((t) => <TaskCard key={`${tab}-${t.id}`} task={t} mode={tab === "pickups" ? "pickup" : tab === "deliveries" ? "delivery" : "done"} onAction={onAction} />)
          )}
        </section>
      </main>
    </div>
  );
}

function AgentLogin({ onSignedIn }: { onSignedIn: (a: Agent) => void }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { agent } = await call<{ agent: Agent }>("/api/agent/auth", { method: "POST", body: JSON.stringify({ phone, pin }) });
      onSignedIn(agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full h-12 px-4 rounded-2xl border border-border bg-card text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 bg-background">
      <div className="flex items-center justify-between max-w-sm w-full mx-auto">
        <BrandLogo subtitle="Delivery Partner" />
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"><ArrowLeft className="h-4 w-4" /> Home</Link>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brass-600">Partner app</p>
            <h1 className="font-display text-4xl tracking-tight mt-2">Start your run</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in with the mobile number and PIN from the store.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">Mobile number</span>
            <div className="relative">
              <Phone className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" className={`${input} pl-11`} />
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">PIN</span>
            <input required type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" placeholder="••••" className={`${input} tracking-[0.4em]`} />
          </label>
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <button disabled={busy} className="w-full h-12 rounded-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
