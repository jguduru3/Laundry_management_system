import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorMessage } from "@/lib/orders";
import { razorpayConfig, settleGatewayPayment, verifyWebhookSignature } from "@/lib/razorpay";

/*
 * Razorpay webhook (Dashboard > Webhooks, test mode). Subscribe to payment.captured, order.paid and
 * payment.failed, and set the same secret as RAZORPAY_WEBHOOK_SECRET. Unknown events are acknowledged.
 */
export async function POST(req: Request) {
  if (!razorpayConfig()?.webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(raw);
    const payment = event?.payload?.payment?.entity;

    if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id && payment?.id) {
      const order = await settleGatewayPayment({
        providerOrderId: payment.order_id,
        providerPaymentId: payment.id,
        amount: payment.amount,
        method: payment.method,
      });
      return NextResponse.json({ ok: true, matched: Boolean(order) });
    }

    if (event.event === "payment.failed" && payment?.order_id) {
      await db.payment.updateMany({
        where: { providerOrderId: payment.order_id, status: "CREATED" },
        data: { providerPaymentId: payment.id, method: payment.method ?? null },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
