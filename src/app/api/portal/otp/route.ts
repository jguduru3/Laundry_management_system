import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findCustomerByPhone, portalSignIn } from "@/lib/portal";
import { OtpError, sendOtp, verifyOtp } from "@/lib/otp";
import { errorMessage } from "@/lib/orders";
import { isServiceArea, normalizeIndianMobile } from "@/lib/hyderabad";

/*
 * SMS OTP sign-in and registration.
 *  - send:   { phone }                                         texts a 6-digit code (5 min, 30s resend cooldown, 5 per hour)
 *  - verify: { phone, code, name?, email?, address?, area? }   signs in; an unknown number without a name gets
 *            { needsProfile: true } and the same code stays valid so the client can resend it with the details.
 * Store customers without portal access are signed straight in: the code proves they own the number.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mobile = normalizeIndianMobile(body.phone);
    if (!mobile) return fail("Enter a valid 10-digit Indian mobile number");

    if (body.action === "send") {
      const result = await sendOtp(mobile);
      return NextResponse.json({ sent: true, ...result });
    }

    if (body.action === "verify") {
      const existing = await findCustomerByPhone(mobile, typeof body.phone === "string" ? body.phone.trim() : "");
      if (existing) {
        await verifyOtp(mobile, body.code, { consume: true });
        return portalSignIn(existing.id);
      }

      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        await verifyOtp(mobile, body.code, { consume: false });
        return NextResponse.json({ needsProfile: true });
      }
      if (body.area && !isServiceArea(body.area)) return fail("We do not serve this locality yet");
      await verifyOtp(mobile, body.code, { consume: true });
      const customer = await db.customer.create({
        data: {
          name: name.slice(0, 100),
          phone: mobile,
          email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
          address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
          area: body.area || null,
        },
      });
      return portalSignIn(customer.id);
    }

    return fail("Unknown action");
  } catch (error) {
    if (error instanceof OtpError) {
      const res = fail(error.message, error.status);
      if (error.retryAfter) res.headers.set("Retry-After", String(error.retryAfter));
      return res;
    }
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
