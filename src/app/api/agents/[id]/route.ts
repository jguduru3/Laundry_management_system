import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPin, isValidPin, requireAdmin } from "@/lib/auth";
import { publicAgentFields } from "@/lib/agents";
import { errorMessage } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

// Update details, pause/resume, or set a new PIN.
export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      data.name = String(body.name).trim();
    }
    if (body.zone !== undefined) data.zone = String(body.zone).trim() || null;
    if (body.vehicle !== undefined) data.vehicle = String(body.vehicle).trim() || null;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.pin !== undefined) {
      if (!isValidPin(body.pin)) return NextResponse.json({ error: "PIN must be 4 to 6 digits" }, { status: 400 });
      data.pinHash = hashPin(body.pin);
    }
    return NextResponse.json(await db.agent.update({ where: { id }, data, select: publicAgentFields }));
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// Agents with open tasks can only be paused, so no pickup or delivery is silently dropped.
export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const open = await db.order.count({
      where: {
        OR: [
          { pickupAgentId: id, status: "PENDING" },
          { deliveryAgentId: id, status: { in: ["READY", "OUT_FOR_DELIVERY"] } },
        ],
      },
    });
    if (open > 0) {
      return NextResponse.json({ error: `Reassign this agent's ${open} open task(s) first, or pause the agent instead` }, { status: 409 });
    }
    await db.agent.delete({ where: { id } });
    return NextResponse.json({ message: "Agent removed" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
