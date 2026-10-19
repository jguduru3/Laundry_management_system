import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE, getCustomerId, setSessionCookie } from "@/lib/auth";
import { formatIndianMobile } from "@/lib/hyderabad";

export const publicCustomerFields = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  area: true,
  createdAt: true,
} as const;

// Resolves the signed-in portal customer, or null when there is no valid session.
export async function getPortalCustomer() {
  const id = await getCustomerId();
  if (!id) return null;
  return db.customer.findUnique({ where: { id }, select: publicCustomerFields });
}

// Numbers are stored as 10 digits; older counter records may hold the number as typed.
export function findCustomerByPhone(mobile: string | null, raw = "") {
  const candidates = new Set<string>();
  if (raw) candidates.add(raw);
  if (mobile) for (const v of [mobile, `+91${mobile}`, `+91 ${mobile}`, `91${mobile}`, `0${mobile}`, formatIndianMobile(mobile)]) candidates.add(v);
  return db.customer.findFirst({ where: { phone: { in: [...candidates] } } });
}

// Starts a portal session and returns the customer's public fields.
export async function portalSignIn(customerId: string) {
  const customer = await db.customer.findUnique({ where: { id: customerId }, select: publicCustomerFields });
  return setSessionCookie(NextResponse.json({ customer }), CUSTOMER_COOKIE, customerId);
}
