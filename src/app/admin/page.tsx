'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import Sidebar from "@/components/sidebar";
import DashboardView from "@/components/dashboard-view";
import OrdersView from "@/components/orders-view";
import CustomersView from "@/components/customers-view";
import ServicesView from "@/components/services-view";
import SettingsView from "@/components/settings-view";
import AgentsView from "@/components/agents-view";
import { BrandLogo } from "@/components/brand";

export default function AdminPage() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/admin").then((r) => r.json()).then((d) => setAuthed(Boolean(d.authenticated))).catch(() => setAuthed(false));
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/admin", { method: "DELETE" });
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authed) return <StaffLogin onSuccess={() => setAuthed(true)} />;

  const renderContent = () => {
    switch (currentTab) {
      case "dashboard":
        return <DashboardView onNavigateToOrders={() => setCurrentTab("orders")} />;
      case "orders":
        return <OrdersView />;
      case "customers":
        return <CustomersView />;
      case "services":
        return <ServicesView />;
      case "settings":
        return <SettingsView />;
      case "agents":
        return <AgentsView />;
      default:
        return <DashboardView onNavigateToOrders={() => setCurrentTab("orders")} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} onSignOut={signOut} />
      <main className="flex-1 min-w-0 min-h-screen p-4 sm:p-6 lg:pl-[18rem] lg:pr-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto py-4">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function StaffLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) onSuccess();
    else setError((await res.json().catch(() => ({}))).error || "Sign in failed");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><BrandLogo subtitle="Staff Console" /></div>
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center"><Lock className="h-5 w-5" /></span>
            <div>
              <h1 className="font-bold text-lg leading-tight">Staff sign in</h1>
              <p className="text-xs text-muted-foreground">Orders, customers and pricing</p>
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">Password</span>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <button disabled={busy} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </button>
        </form>
        <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 w-full justify-center">
          <ArrowLeft className="h-4 w-4" /> Back to website
        </Link>
      </div>
    </div>
  );
}
