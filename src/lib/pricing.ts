// Default flat platform fee charged once per order; the live value comes from Settings.platformFee.
export const PLATFORM_FEE = 5;

export function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface ChargeSettings {
  platformFee: number;
  expressRate: number; // percent
  deliveryFee: number;
  freeDeliveryAbove: number;
}

export interface PriceBreakdown {
  subtotal: number;
  expressCharge: number;
  discount: number;
  deliveryFee: number;
  platformFee: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/*
 * Order of charges:
 *   items subtotal
 * + express surcharge (percent of subtotal)
 * - coupon discount
 * + delivery fee (waived when subtotal + express - discount reaches the free-delivery threshold)
 * + platform fee (always)
 */
export function computeCharges(
  subtotal: number,
  opts: { express: boolean; discount: number; chargeDelivery: boolean },
  s: ChargeSettings
): PriceBreakdown {
  const expressCharge = opts.express ? round2((subtotal * s.expressRate) / 100) : 0;
  const discount = round2(Math.min(Math.max(opts.discount, 0), subtotal + expressCharge));
  const afterDiscount = subtotal + expressCharge - discount;
  const deliveryFee = opts.chargeDelivery && afterDiscount < s.freeDeliveryAbove ? s.deliveryFee : 0;
  return {
    subtotal: round2(subtotal),
    expressCharge,
    discount,
    deliveryFee,
    platformFee: s.platformFee,
    total: round2(afterDiscount + deliveryFee + s.platformFee),
  };
}

// GST is included in prices; this splits a GST-inclusive amount for the invoice.
export function gstBreakup(inclusiveAmount: number, gstRate: number) {
  const taxable = round2(inclusiveAmount / (1 + gstRate / 100));
  const gst = round2(inclusiveAmount - taxable);
  return { taxable, gst, cgst: round2(gst / 2), sgst: round2(gst - round2(gst / 2)) };
}
