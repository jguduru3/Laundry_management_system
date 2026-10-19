'use client';

import { useEffect, useState } from "react";
import { BadgePercent, Building2, Loader2, Plus, ReceiptIndianRupee, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/pricing";
import type { PublicSettings } from "@/lib/settings";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  firstOrderOnly: boolean;
  isActive: boolean;
  expiresAt: string | null;
  timesUsed: number;
  totalDiscount: number;
}

const input = "w-full h-10 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const label = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

const EMPTY_COUPON = { code: "", description: "", type: "PERCENT", value: "", maxDiscount: "", minOrder: "0", firstOrderOnly: false, expiresAt: "" };

export default function SettingsView() {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);

  const loadCoupons = () =>
    fetch("/api/coupons").then((r) => r.json()).then((data) => Array.isArray(data) && setCoupons(data));

  useEffect(() => {
    Promise.all([fetch("/api/settings").then((r) => r.json()), fetch("/api/coupons").then((r) => r.json())])
      .then(([s, c]) => {
        const settings = s.settings as PublicSettings;
        setForm(Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, v == null ? "" : String(v)])));
        if (Array.isArray(c)) setCoupons(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Settings saved", description: "New charges apply to orders placed from now on." });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(couponForm) });
    const data = await res.json();
    if (!res.ok) return toast({ title: "Could not create coupon", description: data.error, variant: "destructive" });
    toast({ title: "Coupon created", description: data.code });
    setCouponOpen(false);
    setCouponForm(EMPTY_COUPON);
    loadCoupons();
  };

  const toggleCoupon = async (c: Coupon) => {
    await fetch(`/api/coupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) });
    loadCoupons();
  };

  const deleteCoupon = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}? Past orders keep their discount.`)) return;
    await fetch(`/api/coupons/${c.id}`, { method: "DELETE" });
    loadCoupons();
  };

  if (loading) return <div className="py-20 text-center animate-pulse text-muted-foreground">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-display text-4xl tracking-tight">Settings</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Business details, order charges and offers.</p>
        </div>
        <button onClick={save} disabled={saving} className="self-start flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl cursor-pointer">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-600" /> Business details</h3>
          <p className="text-xs text-muted-foreground -mt-2">Printed on receipts and used for WhatsApp and UPI.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className={label}>Business name</label><input className={input} value={form.businessName} onChange={set("businessName")} /></div>
            <div><label className={label}>Phone</label><input className={input} value={form.phone} onChange={set("phone")} /></div>
            <div><label className={label}>WhatsApp (with 91)</label><input className={input} value={form.whatsapp} onChange={set("whatsapp")} placeholder="919000012345" /></div>
            <div><label className={label}>Email</label><input className={input} value={form.email} onChange={set("email")} /></div>
            <div><label className={label}>UPI ID</label><input className={input} value={form.upiId} onChange={set("upiId")} placeholder="business@okaxis" /></div>
            <div className="sm:col-span-2"><label className={label}>Address</label><textarea rows={2} className={`${input} h-auto py-2`} value={form.address} onChange={set("address")} /></div>
            <div><label className={label}>GSTIN (optional)</label><input className={`${input} uppercase`} value={form.gstin} onChange={set("gstin")} placeholder="36ABCDE1234F1Z5" /></div>
            <div><label className={label}>GST rate % (prices inclusive)</label><input type="number" min="0" max="28" className={input} value={form.gstRate} onChange={set("gstRate")} /></div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><ReceiptIndianRupee className="h-4 w-4 text-blue-600" /> Order charges</h3>
          <p className="text-xs text-muted-foreground -mt-2">Applied to new orders. Existing orders keep the charges they were placed with.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label}>Platform fee per order (₹)</label><input type="number" min="0" className={input} value={form.platformFee} onChange={set("platformFee")} /></div>
            <div><label className={label}>Minimum order, items (₹)</label><input type="number" min="0" className={input} value={form.minOrderValue} onChange={set("minOrderValue")} /></div>
            <div><label className={label}>Pickup and delivery fee (₹)</label><input type="number" min="0" className={input} value={form.deliveryFee} onChange={set("deliveryFee")} /></div>
            <div><label className={label}>Free delivery above (₹)</label><input type="number" min="0" className={input} value={form.freeDeliveryAbove} onChange={set("freeDeliveryAbove")} /></div>
            <div><label className={label}>Express surcharge (%)</label><input type="number" min="0" max="200" className={input} value={form.expressRate} onChange={set("expressRate")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Standard (h)</label><input type="number" min="1" className={input} value={form.standardHours} onChange={set("standardHours")} /></div>
              <div><label className={label}>Express (h)</label><input type="number" min="1" className={input} value={form.expressHours} onChange={set("expressHours")} /></div>
            </div>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            Example: an online order with {formatINR(300)} of items pays {formatINR(300)} + {formatINR(Number(form.deliveryFee) || 0)} delivery + {formatINR(Number(form.platformFee) || 0)} platform fee
            {" "}= {formatINR(300 + (300 >= Number(form.freeDeliveryAbove) ? 0 : Number(form.deliveryFee) || 0) + (Number(form.platformFee) || 0))}.
          </div>
        </section>
      </div>

      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2"><BadgePercent className="h-4 w-4 text-blue-600" /> Offer codes</h3>
          <button onClick={() => setCouponOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-border hover:bg-muted cursor-pointer">
            <Plus className="h-4 w-4" /> New coupon
          </button>
        </div>
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No coupons yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground text-left border-b border-border">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Discount</th>
                  <th className="py-2 pr-4">Conditions</th>
                  <th className="py-2 pr-4">Used</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4">
                      <div className="font-mono font-semibold">{c.code}</div>
                      <div className="text-xs text-muted-foreground">{c.description}</div>
                    </td>
                    <td className="py-3 pr-4">{c.type === "PERCENT" ? `${c.value}%${c.maxDiscount ? ` up to ${formatINR(c.maxDiscount)}` : ""}` : formatINR(c.value)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      Min {formatINR(c.minOrder)}{c.firstOrderOnly ? " · first order" : ""}
                      {c.expiresAt ? ` · until ${new Date(c.expiresAt).toLocaleDateString("en-IN")}` : ""}
                    </td>
                    <td className="py-3 pr-4 text-xs">{c.timesUsed}x · {formatINR(c.totalDiscount)}</td>
                    <td className="py-3 pr-4">
                      <button onClick={() => toggleCoupon(c)} className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${c.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {c.isActive ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => deleteCoupon(c)} aria-label={`Delete ${c.code}`} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {couponOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <form onSubmit={createCoupon} className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h3 className="font-bold">New coupon</h3>
              <button type="button" onClick={() => setCouponOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div><label className={label}>Code</label><input required className={`${input} uppercase`} value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="DIWALI15" /></div>
              <div>
                <label className={label}>Type</label>
                <select className={input} value={couponForm.type} onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}>
                  <option value="PERCENT">Percent</option>
                  <option value="FLAT">Flat amount</option>
                </select>
              </div>
              <div><label className={label}>{couponForm.type === "PERCENT" ? "Percent off" : "Amount off (₹)"}</label><input required type="number" min="1" className={input} value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} /></div>
              <div><label className={label}>Max discount (₹)</label><input type="number" min="1" disabled={couponForm.type === "FLAT"} className={input} value={couponForm.maxDiscount} onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })} /></div>
              <div><label className={label}>Minimum order (₹)</label><input type="number" min="0" className={input} value={couponForm.minOrder} onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })} /></div>
              <div><label className={label}>Expires on</label><input type="date" className={input} value={couponForm.expiresAt} onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })} /></div>
              <div className="col-span-2"><label className={label}>Description</label><input className={input} value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} placeholder="Shown to customers when applied" /></div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={couponForm.firstOrderOnly} onChange={(e) => setCouponForm({ ...couponForm, firstOrderOnly: e.target.checked })} />
                First order only
              </label>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button type="button" onClick={() => setCouponOpen(false)} className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted cursor-pointer">Cancel</button>
              <button className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
