import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "aq_admin";
export const CUSTOMER_COOKIE = "aq_customer";
const SESSION_DAYS = 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return s;
}

export function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

// Session token format: <subject>.<expiresAtMs>.<hmac>
export function createToken(subject: string) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const body = `${subject}.${expires}`;
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [subject, expires, mac] = parts;
  const expected = Buffer.from(sign(`${subject}.${expires}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  return subject;
}

export function setSessionCookie(res: NextResponse, name: string, subject: string) {
  res.cookies.set(name, createToken(subject), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export async function getAdminSession() {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value) === "admin";
}

export async function getCustomerId() {
  const store = await cookies();
  return verifyToken(store.get(CUSTOMER_COOKIE)?.value);
}

export const AGENT_COOKIE = "aq_agent";

// Agent tokens carry an "agent:" prefix so a customer or staff token can never pass as one.
export async function getAgentId() {
  const store = await cookies();
  const subject = verifyToken(store.get(AGENT_COOKIE)?.value);
  return subject?.startsWith("agent:") ? subject.slice(6) : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Returns a 401 response when the caller is not signed in as staff, otherwise null.
export async function requireAdmin() {
  return (await getAdminSession()) ? null : unauthorized();
}

export function checkAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  const a = Buffer.from(sign(password));
  const b = Buffer.from(sign(expected));
  return timingSafeEqual(a, b);
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4,6}$/.test(pin);
}
