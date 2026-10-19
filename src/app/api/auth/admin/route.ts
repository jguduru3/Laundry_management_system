import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkAdminPassword, clearSessionCookie, getAdminSession, setSessionCookie } from "@/lib/auth";

// GET: is the current browser signed in as staff?
export async function GET() {
  return NextResponse.json({ authenticated: await getAdminSession() });
}

// POST: sign in with the staff password.
export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  return setSessionCookie(NextResponse.json({ authenticated: true }), ADMIN_COOKIE, "admin");
}

// DELETE: sign out.
export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ authenticated: false }), ADMIN_COOKIE);
}
