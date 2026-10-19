'use client';

import { useState } from "react";
import { KeyRound, Loader2, UserRound } from "lucide-react";
import { api, type PortalCustomer } from "./types";

const inputClass = "w-full h-10 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function ProfilePanel({
  customer,
  areas,
  onSaved,
  notify,
}: {
  customer: PortalCustomer;
  areas: { name: string; pincode: string }[];
  onSaved: (c: PortalCustomer) => void;
  notify: (title: string, description?: string, error?: boolean) => void;
}) {
  const [details, setDetails] = useState({ name: customer.name, email: customer.email || "", address: customer.address || "", area: customer.area || "" });
  const [pins, setPins] = useState({ currentPin: "", newPin: "" });
  const [busy, setBusy] = useState<"details" | "pin" | null>(null);

  const save = async (kind: "details" | "pin") => {
    setBusy(kind);
    try {
      const { customer: updated } = await api<{ customer: PortalCustomer }>("/api/portal/profile", {
        method: "PATCH",
        body: JSON.stringify(kind === "details" ? details : pins),
      });
      onSaved(updated);
      if (kind === "pin") setPins({ currentPin: "", newPin: "" });
      notify(kind === "details" ? "Profile updated" : "PIN changed");
    } catch (err) {
      notify("Could not save", err instanceof Error ? err.message : undefined, true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Signed in as {customer.phone}. Contact the store to change your phone number.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-blue-600" /> Contact details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold">Full name</span>
            <input className={inputClass} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold">Email</span>
            <input type="email" className={inputClass} value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
          </label>
          <label className="space-y-1.5 block sm:col-span-2">
            <span className="text-xs font-semibold">Locality</span>
            <select className={inputClass} value={details.area} onChange={(e) => setDetails({ ...details, area: e.target.value })}>
              <option value="">Select your area in Hyderabad</option>
              {areas.map((a) => <option key={a.name} value={a.name}>{a.name} ({a.pincode})</option>)}
            </select>
          </label>
          <label className="space-y-1.5 block sm:col-span-2">
            <span className="text-xs font-semibold">Pickup and delivery address</span>
            <textarea rows={2} className={`${inputClass} h-auto py-2`} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
          </label>
        </div>
        <div className="flex justify-end">
          <button onClick={() => save("details")} disabled={busy !== null} className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer">
            {busy === "details" && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-blue-600" /> Change PIN</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold">Current PIN</span>
            <input type="password" inputMode="numeric" maxLength={6} className={inputClass} value={pins.currentPin} onChange={(e) => setPins({ ...pins, currentPin: e.target.value })} autoComplete="current-password" />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold">New PIN (4 to 6 digits)</span>
            <input type="password" inputMode="numeric" maxLength={6} className={inputClass} value={pins.newPin} onChange={(e) => setPins({ ...pins, newPin: e.target.value })} autoComplete="new-password" />
          </label>
        </div>
        <div className="flex justify-end">
          <button onClick={() => save("pin")} disabled={busy !== null || !pins.currentPin || !pins.newPin} className="h-10 px-4 rounded-xl border border-border hover:bg-muted text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            {busy === "pin" && <Loader2 className="h-4 w-4 animate-spin" />} Update PIN
          </button>
        </div>
      </section>
    </div>
  );
}
