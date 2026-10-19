import { Waves } from "lucide-react";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div
      className={`${className} relative rounded-[0.8rem] bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-white shadow-md shadow-blue-900/20 ring-1 ring-inset ring-white/15 shrink-0 overflow-hidden`}
    >
      {/* soft top highlight for a glazed finish */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
      <Waves className="relative h-1/2 w-1/2" strokeWidth={1.75} />
    </div>
  );
}

export function BrandLogo({ subtitle = "Laundry & Dry Cleaning" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <BrandMark />
      <div className="min-w-0">
        <div className="font-display text-[1.45rem] leading-none tracking-tight">AquaClean</div>
        <span className="mt-1 block max-w-[9.5rem] sm:max-w-none truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}
