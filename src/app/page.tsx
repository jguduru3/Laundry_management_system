import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  CalendarCheck,
  Clock,
  Droplets,
  Flame,
  Footprints,
  Home,
  Leaf,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Shirt,
  Sparkles,
  Truck,
  Wind,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { db } from "@/lib/db";
import { formatINR, computeCharges } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { SERVICE_AREAS, PICKUP_SLOTS } from "@/lib/hyderabad";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { id: "wash", label: "Laundry by weight", icon: Droplets },
  { id: "ironing", label: "Steam ironing", icon: Flame },
  { id: "dry_clean", label: "Dry cleaning", icon: Wind },
  { id: "household", label: "Household", icon: Home },
  { id: "specialty", label: "Shoes and specialty", icon: Footprints },
];

export default async function LandingPage() {
  const [services, settings, offers] = await Promise.all([
    db.service.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    getSettings(),
    db.coupon.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const washIron = services.find((s) => s.unit === "kg" && s.name.toLowerCase().includes("iron")) ?? services.find((s) => s.unit === "kg");
  const sample = washIron ? washIron.price * 4 : 400;
  const sampleBill = computeCharges(sample, { express: false, discount: 0, chargeDelivery: true }, settings);
  const zones = Array.from(new Set(SERVICE_AREAS.map((a) => a.zone)));
  const waLink = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo subtitle="Laundry & Dry Cleaning · Hyderabad" />
          <nav className="flex items-center gap-2">
            <a href="#pricing" className="hidden md:inline-flex h-9 px-3 items-center text-sm text-muted-foreground hover:text-foreground">Rate card</a>
            <a href="#areas" className="hidden md:inline-flex h-9 px-3 items-center text-sm text-muted-foreground hover:text-foreground">Areas</a>
            <Link href="/admin" className="hidden sm:inline-flex h-9 px-3 items-center text-sm text-muted-foreground hover:text-foreground">Staff</Link>
            <Link href="/portal" className="shrink-0 whitespace-nowrap h-9 px-4 rounded-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium inline-flex items-center gap-1.5 transition-colors">
              Sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_15%_0%,rgba(52,78,128,0.10),transparent),radial-gradient(50%_50%_at_95%_20%,rgba(196,160,92,0.10),transparent)]" />
        <div className="absolute inset-0 -z-10 bg-grain opacity-60" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-24 grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card/70 backdrop-blur px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-500" /> Doorstep care in {SERVICE_AREAS.length} Hyderabad localities
            </span>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-[5.25rem] tracking-tight leading-[0.98]">
              Laundry picked up,<br />
              <span className="italic pr-3 bg-gradient-to-r from-blue-700 via-blue-500 to-sky-500 bg-clip-text text-transparent">cleaned and delivered.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground max-w-xl">
              From daily wear to silk sarees and sherwanis. Pick a slot, track every stage live, pay by UPI on delivery.
              Wash and iron from {washIron ? formatINR(washIron.price) : ""}/kg.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/portal" className="group h-12 pl-6 pr-5 rounded-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium inline-flex items-center gap-2.5 shadow-lg shadow-blue-900/20 transition-colors">
                <CalendarCheck className="h-4 w-4" /> Schedule a pickup
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#pricing" className="h-12 px-6 rounded-full border border-border bg-card hover:bg-muted text-sm font-medium inline-flex items-center gap-2 transition-colors">
                See rate card
              </a>
            </div>
            <dl className="mt-12 pt-8 border-t border-border grid grid-cols-3 max-w-md gap-6">
              {[
                { k: `${settings.standardHours}h`, v: "Standard delivery" },
                { k: `${settings.expressHours}h`, v: "Express available" },
                { k: formatINR(settings.freeDeliveryAbove).replace(".00", ""), v: "Free delivery above" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-3xl tracking-tight">{s.k}</dt>
                  <dd className="text-xs text-muted-foreground mt-1">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Sample live order */}
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-blue-600/15 via-sky-400/10 to-brass-300/20 blur-3xl" />
            <div className="rounded-[1.75rem] border border-border/80 bg-card/90 backdrop-blur shadow-2xl p-7 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Gachibowli · 10 AM - 1 PM</div>
                  <div className="font-display text-2xl tracking-tight">LND-1042</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-blue-500/15">
                  <Flame className="h-3.5 w-3.5" /> Ironing
                </span>
              </div>
              <ol className="grid grid-cols-5 gap-2">
                {[Truck, Droplets, Flame, PackageCheck, Truck].map((Icon, i) => (
                  <li key={i} className="flex flex-col items-center gap-2">
                    <span className={`h-9 w-9 rounded-full flex items-center justify-center border-2 ${i < 2 ? "bg-blue-600 border-blue-600 text-white" : i === 2 ? "border-blue-600 text-blue-600" : "border-border text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`h-1 w-full rounded-full ${i <= 2 ? "bg-blue-600" : "bg-border"}`} />
                  </li>
                ))}
              </ol>
              <div className="rounded-2xl bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{washIron?.name ?? "Laundry"}, 4 kg</span><span className="tabular-nums">{formatINR(sample)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pickup &amp; delivery</span><span className="tabular-nums">{sampleBill.deliveryFee ? formatINR(sampleBill.deliveryFee) : "FREE"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span className="tabular-nums">{formatINR(sampleBill.platformFee)}</span></div>
                <div className="flex justify-between font-bold pt-2 border-t border-border"><span>Total, incl. GST</span><span className="tabular-nums">{formatINR(sampleBill.total)}</span></div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Clock className="h-4 w-4" /></span>
                <div>
                  <div className="font-medium">Out for delivery tomorrow</div>
                  <div className="text-xs text-muted-foreground">Pay by UPI or cash at the door</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offers */}
      {offers.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {offers.slice(0, 2).map((o) => (
              <div key={o.id} className="rounded-2xl border border-dashed border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-4">
                <span className="h-11 w-11 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center"><BadgePercent className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <div className="font-semibold">{o.description || (o.type === "PERCENT" ? `${o.value}% off` : `${formatINR(o.value)} off`)}</div>
                  <div className="text-xs text-muted-foreground">Use code <span className="font-mono font-semibold text-foreground">{o.code}</span>{o.minOrder ? ` on orders above ${formatINR(o.minOrder)}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how" className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brass-600 mb-3">The process</p>
            <h2 className="font-display text-4xl sm:text-[2.75rem] leading-tight tracking-tight">How it works</h2>
            <p className="text-muted-foreground mt-2">Five pickup windows a day, from 7 AM to 10 PM.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { icon: CalendarCheck, title: "Book a slot", text: `Choose services and one of ${PICKUP_SLOTS.length} pickup windows.` },
              { icon: PackageCheck, title: "Tagged at pickup", text: "Clothes are weighed, counted and tagged in front of you." },
              { icon: Shirt, title: "Cleaned with care", text: "Fabric-specific wash, dry clean or steam press. Track it live." },
              { icon: Truck, title: "Delivered", text: `Back in ${settings.standardHours} hours, or ${settings.expressHours} with Express.` },
            ].map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="rounded-3xl border border-border bg-card p-7 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center"><Icon className="h-5 w-5" /></span>
                  <span className="text-sm font-mono text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-display text-2xl tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rate card */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brass-600 mb-3">Transparent pricing</p>
            <h2 className="font-display text-4xl sm:text-[2.75rem] leading-tight tracking-tight">Rate card</h2>
            <p className="text-muted-foreground mt-2">All prices include GST. Laundry is charged on weight measured at pickup.</p>
          </div>
          <Link href="/portal" className="text-sm font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
            Start an order <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {CATEGORIES.map(({ id, label, icon: Icon }) => {
            const items = services.filter((s) => s.category === id);
            if (items.length === 0) return null;
            return (
              <div key={id} className="min-w-0 rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-9 w-9 rounded-lg bg-muted text-blue-600 flex items-center justify-center"><Icon className="h-4 w-4" /></span>
                  <h3 className="font-semibold">{label}</h3>
                </div>
                <ul className="divide-y divide-border/60">
                  {items.map((s) => (
                    <li key={s.id} className="py-2.5 flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{s.name.replace(/^Dry Clean - /, "")}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                      </div>
                      <div className="shrink-0 text-sm"><span className="font-bold">{formatINR(s.price)}</span><span className="text-muted-foreground">/{s.unit}</span></div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Charges */}
          <div className="min-w-0 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-9 w-9 rounded-lg bg-muted text-blue-600 flex items-center justify-center"><Zap className="h-4 w-4" /></span>
              <h3 className="font-semibold">Delivery and charges</h3>
            </div>
            <ul className="divide-y divide-border/60 text-sm">
              {[
                ["Standard turnaround", `${settings.standardHours} hours`],
                ["Express turnaround", `${settings.expressHours} hours, +${settings.expressRate}%`],
                ["Pickup and delivery", `${formatINR(settings.deliveryFee)}, free above ${formatINR(settings.freeDeliveryAbove)}`],
                ["Platform fee", `${formatINR(settings.platformFee)} per order`],
                ["Minimum order", formatINR(settings.minOrderValue)],
                ["Payment", "UPI, cash or card at delivery"],
              ].map(([k, v]) => (
                <li key={k} className="py-2.5 flex justify-between gap-4">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Areas */}
      <section id="areas" className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brass-600 mb-3">Coverage</p>
            <h2 className="font-display text-4xl sm:text-[2.75rem] leading-tight tracking-tight">Where we pick up</h2>
          <p className="text-muted-foreground mt-2">Not listed? Message us on WhatsApp; we are adding new localities every month.</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {zones.map((zone) => (
              <div key={zone} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{zone} Hyderabad</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SERVICE_AREAS.filter((a) => a.zone === zone).map((a) => (
                    <span key={a.name} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                      <MapPin className="h-3 w-3 text-blue-600" /> {a.name}
                      <span className="text-muted-foreground">{a.pincode}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust + CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 p-8 sm:p-14 text-white">
          <div className="absolute inset-0 bg-grain opacity-80" />
          <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-brass-500/20 blur-3xl" />
          <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div>
              <h2 className="font-display text-4xl sm:text-[2.75rem] leading-tight tracking-tight">Ready for fresher laundry?</h2>
              <p className="text-blue-50/90 mt-2">Create an account in under a minute. Store customers can activate online access with any receipt number.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/portal" className="h-11 px-6 rounded-full bg-white text-blue-900 text-sm font-medium inline-flex items-center gap-2 hover:bg-blue-50 transition-colors">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" className="h-11 px-6 rounded-full bg-white/10 ring-1 ring-white/25 text-sm font-medium inline-flex items-center gap-2 hover:bg-white/15 transition-colors">
                    <MessageCircle className="h-4 w-4" /> WhatsApp us
                  </a>
                )}
              </div>
            </div>
            <ul className="space-y-3 text-sm text-blue-50">
              {[
                { icon: ShieldCheck, t: "Free re-clean if you are not happy, within 48 hours" },
                { icon: Leaf, t: "Skin-safe, eco-friendly detergents" },
                { icon: Sparkles, t: "Silk, zari and embroidery handled by hand" },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="h-8 w-8 shrink-0 rounded-lg bg-white/15 ring-1 ring-white/20 flex items-center justify-center"><Icon className="h-4 w-4" /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-6 sm:grid-cols-[1.5fr_1fr_1fr] text-sm text-muted-foreground">
          <div className="space-y-3">
            <BrandLogo subtitle="Laundry & Dry Cleaning · Hyderabad" />
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /> {settings.address}</p>
            <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 mt-0.5" /> {settings.phone}</p>
            {settings.gstin && <p>GSTIN {settings.gstin}</p>}
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-foreground">Customers</div>
            <Link href="/portal" className="block hover:text-foreground">Book a pickup</Link>
            <a href="#pricing" className="block hover:text-foreground">Rate card</a>
            <a href="#areas" className="block hover:text-foreground">Service areas</a>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-foreground">Business</div>
            <Link href="/admin" className="block hover:text-foreground">Staff console</Link>
            <Link href="/agent" className="block hover:text-foreground">Delivery partner app</Link>
            {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="block hover:text-foreground">WhatsApp support</a>}
          </div>
        </div>
      </footer>
    </div>
  );
}
