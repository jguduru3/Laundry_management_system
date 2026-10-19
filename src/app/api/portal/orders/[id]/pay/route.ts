import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId, unauthorized } from "@/lib/auth";
import { errorMessage } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import {
  GatewayError,
  captureGatewayPayment,
  createGatewayOrder,
  fetchGatewayPayment,
  razorpayConfig,
  settleGatewayPayment,
  toPaise,
  verifyCheckoutSignature,
} from "@/lib/razorpay";

type Params = { params: Promise<{ id: string }> };

const include = { items: { include: { service: true } } } as const;

/*
 * Razorpay Checkout for the signed-in customer's own order (test mode only).
 *  - create: opens (or reuses) a Razorpay order for the amount still due and returns Checkout options
 *  - verify: { razorpay_order_id, razorpay_payment_id, razorpay_signature } from the Checkout handler;
 *            the signature is checked server-side before the order is marked paid
 * The webhook at /api/payments/razorpay/webhook settles the same payment if the browser never returns.
 */
export async function POST(req: Request, { params }: Params) {
  const customerId = await getCustomerId();
  if (!customerId) return unauthorized();
  const cfg = razorpayConfig();
  if (!cfg) return fail("Online payment is not available. Please pay by UPI or at delivery.", 503);

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const order = await db.order.findFirst({ where: { id, customerId }, include: { customer: true } });
    if (!order) return fail("Order not found", 404);

    if (body.action === "create") {
      if (order.status === "CANCELLED") return fail("This order was cancelled", 409);
      if (order.paymentStatus === "PAID") return fail("This order is already paid", 409);

      const paid = await db.payment.aggregate({ where: { orderId: id, status: "PAID" }, _sum: { amount: true } });
      const due = toPaise(order.totalAmount) - (paid._sum.amount ?? 0);
      if (due < 100) return fail("Nothing left to pay on this order", 409);

      let payment = await db.payment.findFirst({ where: { orderId: id, status: "CREATED", amount: due }, orderBy: { createdAt: "desc" } });
      if (!payment) {
        const gatewayOrder = await createGatewayOrder(due, order.orderNumber, { orderId: order.id, orderNumber: order.orderNumber });
        payment = await db.payment.create({ data: { orderId: id, providerOrderId: gatewayOrder.id, amount: due } });
      }

      const settings = await getSettings();
      return NextResponse.json({
        keyId: cfg.keyId,
        gatewayOrderId: payment.providerOrderId,
        amount: payment.amount,
        currency: payment.currency,
        name: settings.businessName,
        description: `Order ${order.orderNumber}`,
        prefill: { name: order.customer.name, contact: order.customer.phone, email: order.customer.email ?? undefined },
      });
    }

    if (body.action === "verify") {
      const gatewayOrderId = String(body.razorpay_order_id ?? "");
      const gatewayPaymentId = String(body.razorpay_payment_id ?? "");
      const payment = await db.payment.findFirst({ where: { orderId: id, providerOrderId: gatewayOrderId } });
      if (!payment || !gatewayPaymentId) return fail("Payment not found for this order", 404);
      if (!verifyCheckoutSignature(gatewayOrderId, gatewayPaymentId, body.razorpay_signature)) {
        return fail("Payment could not be verified. If money was debited it will be confirmed shortly.", 400);
      }

      // Signature proves the payment belongs to this Razorpay order. Fetching it adds the method and
      // captures it when the account uses manual capture; if Razorpay is unreachable the webhook catches up.
      let method: string | null = null;
      let amount = payment.amount;
      try {
        let gp = await fetchGatewayPayment(gatewayPaymentId);
        if (gp.status === "authorized") gp = await captureGatewayPayment(gatewayPaymentId, gp.amount);
        method = gp.method;
        amount = gp.amount;
      } catch (error) {
        console.error("[razorpay] payment lookup failed, settling on verified signature", error);
      }

      await settleGatewayPayment({ providerOrderId: gatewayOrderId, providerPaymentId: gatewayPaymentId, amount, method });
      return NextResponse.json(await db.order.findUnique({ where: { id }, include }));
    }

    return fail("Unsupported action");
  } catch (error) {
    if (error instanceof GatewayError) {
      console.error("[razorpay]", error.message);
      return fail("The payment service is not responding. Please try again in a moment.", 502);
    }
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
