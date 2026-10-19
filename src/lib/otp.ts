import { randomInt, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { sign } from "@/lib/auth";
import { getSmsProvider } from "@/lib/sms";

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_SENDS_PER_HOUR = 5;

const HOUR_MS = 60 * 60 * 1000;

export class OtpError extends Error {
  constructor(message: string, public status = 400, public retryAfter?: number) {
    super(message);
  }
}

export function otpEnabled() {
  return getSmsProvider() !== null;
}

function hashCode(mobile: string, code: string) {
  return sign(`otp:${mobile}:${code}`);
}

// Sends a fresh code to a normalised 10-digit mobile, enforcing the resend cooldown and hourly cap.
// devCode is only returned by the console provider, which never runs in production.
export async function sendOtp(mobile: string) {
  const provider = getSmsProvider();
  if (!provider) throw new OtpError("SMS sign-in is not available right now. Please use your PIN.", 503);

  const now = Date.now();
  const existing = await db.otpChallenge.findUnique({ where: { phone: mobile } });
  if (existing) {
    const wait = Math.ceil((existing.lastSentAt.getTime() + OTP_RESEND_SECONDS * 1000 - now) / 1000);
    if (wait > 0) throw new OtpError(`Please wait ${wait}s before requesting another code`, 429, wait);
  }
  const windowOpen = existing && now - existing.windowStart.getTime() < HOUR_MS;
  if (windowOpen && existing.sendCount >= OTP_MAX_SENDS_PER_HOUR) {
    const wait = Math.ceil((existing.windowStart.getTime() + HOUR_MS - now) / 1000);
    throw new OtpError(`Too many codes requested. Try again in ${Math.ceil(wait / 60)} minutes.`, 429, wait);
  }

  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  try {
    await provider.sendOtp(mobile, code, OTP_TTL_SECONDS / 60);
  } catch (error) {
    console.error("[otp] send failed", error);
    throw new OtpError("Could not send the SMS. Please try again or use your PIN.", 502);
  }

  const data = {
    codeHash: hashCode(mobile, code),
    expiresAt: new Date(now + OTP_TTL_SECONDS * 1000),
    attempts: 0,
    lastSentAt: new Date(now),
    windowStart: windowOpen ? existing.windowStart : new Date(now),
    sendCount: windowOpen ? existing.sendCount + 1 : 1,
  };
  await db.otpChallenge.upsert({ where: { phone: mobile }, update: data, create: { phone: mobile, ...data } });

  return {
    expiresIn: OTP_TTL_SECONDS,
    resendIn: OTP_RESEND_SECONDS,
    devCode: provider.live ? undefined : code,
  };
}

// Checks a code. Wrong guesses count against the challenge; once the limit is hit a new code is needed.
// A correct code is only used up when consume is true, so the caller can ask for profile details first.
export async function verifyOtp(mobile: string, code: unknown, { consume }: { consume: boolean }) {
  if (typeof code !== "string" || !new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
    throw new OtpError(`Enter the ${OTP_LENGTH}-digit code`);
  }
  const challenge = await db.otpChallenge.findUnique({ where: { phone: mobile } });
  if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
    throw new OtpError("This code has expired. Request a new one.", 410);
  }
  // Reserve an attempt before comparing, so parallel guesses cannot exceed the limit.
  const reserved = await db.otpChallenge.updateMany({
    where: { id: challenge.id, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (reserved.count === 0) throw new OtpError("Too many wrong attempts. Request a new code.", 429);

  const expected = Buffer.from(challenge.codeHash);
  const given = Buffer.from(hashCode(mobile, code));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    const left = OTP_MAX_ATTEMPTS - challenge.attempts - 1;
    throw new OtpError(left > 0 ? `Incorrect code. ${left} attempt${left > 1 ? "s" : ""} left.` : "Too many wrong attempts. Request a new code.", 401);
  }

  if (!consume) {
    // A correct code does not count as a wrong attempt.
    await db.otpChallenge.updateMany({ where: { id: challenge.id, attempts: { gt: 0 } }, data: { attempts: { decrement: 1 } } });
    return;
  }
  // Expire rather than delete, so the hourly send limit survives a successful sign-in.
  // count is 0 if a parallel request already used this code.
  const { count } = await db.otpChallenge.updateMany({
    where: { id: challenge.id, codeHash: challenge.codeHash, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date(0) },
  });
  if (count === 0) throw new OtpError("This code has already been used. Request a new one.", 410);
}
