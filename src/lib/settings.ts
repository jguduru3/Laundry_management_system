import { db } from "@/lib/db";

export async function getSettings() {
  return db.setting.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

// Fields safe to show on public pages (landing page, customer portal).
export function publicSettings(s: Settings) {
  return {
    businessName: s.businessName,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    address: s.address,
    gstin: s.gstin,
    gstRate: s.gstRate,
    upiId: s.upiId,
    platformFee: s.platformFee,
    expressRate: s.expressRate,
    deliveryFee: s.deliveryFee,
    freeDeliveryAbove: s.freeDeliveryAbove,
    minOrderValue: s.minOrderValue,
    standardHours: s.standardHours,
    expressHours: s.expressHours,
  };
}

export type PublicSettings = ReturnType<typeof publicSettings>;
