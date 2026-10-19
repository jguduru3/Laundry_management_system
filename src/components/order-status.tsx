import {
  Check,
  CircleDashed,
  Droplets,
  Wind,
  Flame,
  PackageCheck,
  Truck,
  XCircle,
  PackagePlus,
  Bike,
  type LucideIcon,
} from "lucide-react";

export const STATUS_FLOW = ["PENDING", "PICKED_UP", "WASHING", "DRYING", "IRONING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export const STATUS_META: Record<string, { label: string; hint: string; icon: LucideIcon; badge: string }> = {
  PENDING: { label: "Pickup Scheduled", hint: "We have your order and will collect it soon", icon: CircleDashed, badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20" },
  PICKED_UP: { label: "Picked Up", hint: "Collected from your doorstep and tagged at our facility", icon: PackagePlus, badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-orange-500/20" },
  WASHING: { label: "Washing", hint: "Your garments are being cleaned", icon: Droplets, badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-sky-500/20" },
  DRYING: { label: "Drying", hint: "Gently drying at the right temperature", icon: Wind, badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-cyan-500/20" },
  IRONING: { label: "Ironing", hint: "Pressing and folding", icon: Flame, badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-violet-500/20" },
  READY: { label: "Ready", hint: "Quality checked and packed", icon: PackageCheck, badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-500/20" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", hint: "Our delivery partner is on the way", icon: Bike, badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-indigo-500/20" },
  DELIVERED: { label: "Delivered", hint: "Order completed", icon: Truck, badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20" },
  CANCELLED: { label: "Cancelled", hint: "This order was cancelled", icon: XCircle, badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-rose-500/20" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${meta.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export function StatusTracker({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-rose-500/5 border border-rose-500/15 p-4 text-sm text-rose-700 dark:text-rose-400">
        <XCircle className="h-5 w-5 shrink-0" />
        This order was cancelled.
      </div>
    );
  }
  const current = STATUS_FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-8 gap-0.5">
      {STATUS_FLOW.map((step, idx) => {
        const meta = STATUS_META[step];
        const Icon = idx < current ? Check : meta.icon;
        const done = idx < current;
        const active = idx === current;
        return (
          <li key={step} className="flex flex-col items-center text-center gap-2 relative">
            {idx > 0 && (
              <span className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${idx <= current ? "bg-blue-600" : "bg-border"}`} />
            )}
            <span
              className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                done
                  ? "bg-blue-600 border-blue-600 text-white"
                  : active
                    ? "bg-card border-blue-600 text-blue-600 shadow-[0_0_0_4px] shadow-blue-600/15"
                    : "bg-card border-border text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className={`text-[10px] font-medium leading-tight ${active ? "text-foreground" : "text-muted-foreground hidden sm:block"}`}>
              {meta.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
