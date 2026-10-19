import { NextResponse } from "next/server";
import { getCustomerId, unauthorized } from "@/lib/auth";
import { errorMessage, errorResponseStatus, priceDraft } from "@/lib/orders";

// Live price for the booking screen, computed exactly like order creation.
export async function POST(req: Request) {
  const customerId = await getCustomerId();
  if (!customerId) return unauthorized();
  try {
    const { items, deliveryType, couponCode } = await req.json();
    const draft = await priceDraft({ customerId, items, deliveryType, couponCode, source: "PORTAL" });
    return NextResponse.json(draft);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorResponseStatus(error) });
  }
}
