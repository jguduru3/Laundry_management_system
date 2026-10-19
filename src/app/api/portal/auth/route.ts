import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CUSTOMER_COOKIE, clearSessionCookie, hashPin, isValidPin, verifyPin } from "@/lib/auth";
import { findCustomerByPhone, getPortalCustomer, portalSignIn } from "@/lib/portal";
import { otpEnabled } from "@/lib/otp";
import { errorMessage } from "@/lib/orders";
import { isServiceArea, normalizeIndianMobile } from "@/lib/hyderabad";

// GET: current portal customer (or null) and whether SMS OTP sign-in is available.
export async function GET() {
  return NextResponse.json({ customer: await getPortalCustomer(), otpEnabled: otpEnabled() });
}

/*
 * POST actions:
 *  - login:    { phone, pin }
 *  - register: { name, phone, pin, email?, address?, area? }  creates a new customer
 *  - activate: { phone, orderNumber, pin }                     for customers first registered at the counter:
 *              one of their order numbers proves ownership, then a PIN is set
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const raw = typeof body.phone === "string" ? body.phone.trim() : "";
    const mobile = normalizeIndianMobile(raw);
    const pin = body.pin;

    if (!raw) return fail("Phone number is required");
    if (!isValidPin(pin)) return fail("PIN must be 4 to 6 digits");

    const existing = await findCustomerByPhone(mobile, raw);

    if (action === "login") {
      if (existing && !existing.pinHash) {
        return fail("Portal access is not activated for this number yet. Use Activate with one of your order numbers.", 403);
      }
      if (!existing || !verifyPin(pin, existing.pinHash)) return fail("Phone number or PIN is incorrect", 401);
      return signIn(existing.id);
    }

    if (action === "register") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return fail("Name is required");
      if (!mobile) return fail("Enter a valid 10-digit Indian mobile number");
      if (existing) {
        return fail(
          existing.pinHash
            ? "An account with this phone number already exists. Please sign in."
            : "This number is already registered at our store. Use Activate with one of your order numbers.",
          409
        );
      }
      if (body.area && !isServiceArea(body.area)) return fail("We do not serve this locality yet");
      const customer = await db.customer.create({
        data: {
          name,
          phone: mobile,
          email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
          address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
          area: body.area || null,
          pinHash: hashPin(pin),
        },
      });
      return signIn(customer.id);
    }

    if (action === "activate") {
      const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim().toUpperCase() : "";
      if (!existing) return fail("No customer found with this phone number. Create an account instead.", 404);
      if (existing.pinHash) return fail("Portal access is already active for this number. Please sign in.", 409);
      const order = await db.order.findFirst({ where: { customerId: existing.id, orderNumber } });
      if (!order) return fail("Order number does not match this phone number", 401);
      await db.customer.update({ where: { id: existing.id }, data: { pinHash: hashPin(pin) } });
      return signIn(existing.id);
    }

    return fail("Unknown action");
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// DELETE: sign out.
export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ customer: null }), CUSTOMER_COOKIE);
}

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function signIn(customerId: string) {
  return portalSignIn(customerId);
}
