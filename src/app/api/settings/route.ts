import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings, publicSettings } from "@/lib/settings";
import { SERVICE_AREAS, PICKUP_SLOTS } from "@/lib/hyderabad";
import { errorMessage } from "@/lib/orders";
import { razorpayEnabled } from "@/lib/razorpay";

// Public: business details, charges, serviceable areas, pickup slots and whether online payment is on.
export async function GET() {
  try {
    const s = await getSettings();
    return NextResponse.json({ settings: publicSettings(s), areas: SERVICE_AREAS, slots: PICKUP_SLOTS, onlinePayments: razorpayEnabled() });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

const TEXT_FIELDS = ["businessName", "phone", "whatsapp", "email", "address", "gstin", "upiId"] as const;
const MONEY_FIELDS = ["platformFee", "deliveryFee", "freeDeliveryAbove", "minOrderValue"] as const;

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const data: Record<string, string | number | null> = {};

    for (const f of TEXT_FIELDS) {
      if (body[f] === undefined) continue;
      const v = String(body[f] ?? "").trim();
      if ((f === "businessName" || f === "phone" || f === "address") && !v) {
        return NextResponse.json({ error: `${f} cannot be empty` }, { status: 400 });
      }
      data[f] = v || null;
    }
    if (data.upiId && !/^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(String(data.upiId))) {
      return NextResponse.json({ error: "UPI ID looks invalid (expected name@bank)" }, { status: 400 });
    }
    if (data.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(data.gstin).toUpperCase())) {
      return NextResponse.json({ error: "GSTIN looks invalid (15 characters, e.g. 36ABCDE1234F1Z5)" }, { status: 400 });
    }
    if (data.gstin) data.gstin = String(data.gstin).toUpperCase();

    for (const f of MONEY_FIELDS) {
      if (body[f] === undefined) continue;
      const n = Number(body[f]);
      if (!Number.isFinite(n) || n < 0 || n > 100000) return NextResponse.json({ error: `${f} must be a positive amount` }, { status: 400 });
      data[f] = Math.round(n * 100) / 100;
    }
    for (const [f, max] of [["gstRate", 28], ["expressRate", 200]] as const) {
      if (body[f] === undefined) continue;
      const n = Number(body[f]);
      if (!Number.isFinite(n) || n < 0 || n > max) return NextResponse.json({ error: `${f} must be between 0 and ${max}` }, { status: 400 });
      data[f] = n;
    }
    for (const f of ["standardHours", "expressHours"] as const) {
      if (body[f] === undefined) continue;
      const n = Number(body[f]);
      if (!Number.isInteger(n) || n < 1 || n > 240) return NextResponse.json({ error: `${f} must be 1 to 240 hours` }, { status: 400 });
      data[f] = n;
    }

    await getSettings();
    const s = await db.setting.update({ where: { id: "default" }, data });
    return NextResponse.json({ settings: publicSettings(s) });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
