import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

// Razorpay Checkout in TEST MODE ONLY. Needs RAZORPAY_KEY_ID (rzp_test_...) and RAZORPAY_KEY_SECRET;
// RAZORPAY_WEBHOOK_SECRET enables /api/payments/razorpay/webhook. Live keys (rzp_live_...) are refused.

const API = "https://api.razorpay.com/v1";
const env = (key: string) => process.env[key]?.trim() || "";

export function razorpayConfig() {
  const keyId = env("RAZORPAY_KEY_ID");
  const keySecret = env("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return null;
  if (!keyId.startsWith("rzp_test_")) {
    console.warn("[razorpay] only rzp_test_ keys are allowed; online payments are disabled");
    return null;
  }
  return { keyId, keySecret, webhookSecret: env("RAZORPAY_WEBHOOK_SECRET") || null };
}

export const razorpayEnabled = () => razorpayConfig() !== null;

export const toPaise = (rupees: number) => Math.round(rupees * 100);

function safeEqualHex(expected: string, given: unknown) {
  if (typeof given !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class GatewayError extends Error {}

async function call<T>(path: string, init: { method?: string; body?: object } = {}): Promise<T> {
  const cfg = razorpayConfig();
  if (!cfg) throw new Error("Online payments are not configured");
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GatewayError(`Razorpay: ${data.error?.description || res.status}`);
  return data as T;
}

export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface GatewayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string; // created, authorized, captured, refunded, failed
  method: string;
}

export function createGatewayOrder(amount: number, receipt: string, notes: Record<string, string>) {
  return call<GatewayOrder>("/orders", { method: "POST", body: { amount, currency: "INR", receipt, notes } });
}

export function fetchGatewayPayment(paymentId: string) {
  return call<GatewayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function captureGatewayPayment(paymentId: string, amount: number) {
  return call<GatewayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    body: { amount, currency: "INR" },
  });
}

// Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret).
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: unknown) {
  const cfg = razorpayConfig();
  if (!cfg) return false;
  const expected = createHmac("sha256", cfg.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

// Webhook signature: HMAC_SHA256(raw request body, webhook secret) in the X-Razorpay-Signature header.
export function verifyWebhookSignature(rawBody: string, signature: unknown) {
  const secret = razorpayConfig()?.webhookSecret;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

const METHOD_TO_ORDER: Record<string, string> = { upi: "MOBILE", card: "CARD" };

/*
 * Records a successful gateway payment and settles the order. Safe to call more than once for the
 * same payment (checkout callback and webhook both land here). The order becomes PAID when the
 * amount received covers its current total, otherwise PARTIAL.
 */
export async function settleGatewayPayment(input: {
  providerOrderId: string;
  providerPaymentId: string;
  amount?: number;
  method?: string | null;
}) {
  const payment = await db.payment.findUnique({ where: { providerOrderId: input.providerOrderId }, include: { order: true } });
  if (!payment) return null;

  return db.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        providerPaymentId: input.providerPaymentId,
        method: input.method ?? payment.method,
        ...(input.amount ? { amount: input.amount } : {}),
      },
    });
    if (claimed.count === 0) return payment.order; // already settled

    const paid = await tx.payment.aggregate({ where: { orderId: payment.orderId, status: "PAID" }, _sum: { amount: true } });
    const fullyPaid = (paid._sum.amount ?? 0) >= toPaise(payment.order.totalAmount);
    const mappedMethod = input.method ? METHOD_TO_ORDER[input.method] : undefined;
    return tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: fullyPaid ? "PAID" : "PARTIAL", ...(mappedMethod ? { paymentMethod: mappedMethod } : {}) },
    });
  });
}
