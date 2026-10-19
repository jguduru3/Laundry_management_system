import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AGENT_COOKIE, clearSessionCookie, isValidPin, setSessionCookie, verifyPin } from "@/lib/auth";
import { getAgent, publicAgentFields } from "@/lib/agents";
import { normalizeIndianMobile } from "@/lib/hyderabad";
import { errorMessage } from "@/lib/orders";

// GET: the signed-in agent (or null).
export async function GET() {
  return NextResponse.json({ agent: await getAgent() });
}

// POST: sign in with mobile number + PIN.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizeIndianMobile(body.phone);
    if (!phone || !isValidPin(body.pin)) {
      return NextResponse.json({ error: "Enter your 10-digit mobile number and PIN" }, { status: 400 });
    }
    const agent = await db.agent.findUnique({ where: { phone } });
    if (!agent || !verifyPin(body.pin, agent.pinHash)) {
      return NextResponse.json({ error: "Mobile number or PIN is incorrect" }, { status: 401 });
    }
    if (!agent.isActive) {
      return NextResponse.json({ error: "Your account is paused. Please contact the store." }, { status: 403 });
    }
    const res = NextResponse.json({ agent: await db.agent.findUnique({ where: { id: agent.id }, select: publicAgentFields }) });
    return setSessionCookie(res, AGENT_COOKIE, `agent:${agent.id}`);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// DELETE: sign out.
export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ agent: null }), AGENT_COOKIE);
}
