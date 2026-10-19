import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPin, isValidPin, requireAdmin } from "@/lib/auth";
import { publicAgentFields, startOfToday } from "@/lib/agents";
import { normalizeIndianMobile } from "@/lib/hyderabad";
import { errorMessage } from "@/lib/orders";

// Staff: all agents with their live workload and today's collections.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const today = startOfToday();
    const agents = await db.agent.findMany({ select: publicAgentFields, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    const withStats = await Promise.all(
      agents.map(async (a) => {
        const [pickupsPending, deliveriesPending, deliveredToday, collected] = await Promise.all([
          db.order.count({ where: { pickupAgentId: a.id, status: "PENDING" } }),
          db.order.count({ where: { deliveryAgentId: a.id, status: { in: ["READY", "OUT_FOR_DELIVERY"] } } }),
          db.order.count({ where: { deliveryAgentId: a.id, deliveredAt: { gte: today } } }),
          db.order.groupBy({
            by: ["collectedVia"],
            where: { deliveryAgentId: a.id, deliveredAt: { gte: today }, collectedVia: { not: null } },
            _sum: { collectedAmount: true },
          }),
        ]);
        const sum = (via: string) => collected.find((c) => c.collectedVia === via)?._sum.collectedAmount ?? 0;
        return { ...a, pickupsPending, deliveriesPending, deliveredToday, cashToday: sum("CASH"), upiToday: sum("MOBILE") };
      })
    );
    return NextResponse.json(withStats);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phone = normalizeIndianMobile(body.phone);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    if (!isValidPin(body.pin)) return NextResponse.json({ error: "PIN must be 4 to 6 digits" }, { status: 400 });
    const agent = await db.agent.create({
      data: {
        name,
        phone,
        pinHash: hashPin(body.pin),
        zone: String(body.zone ?? "").trim() || null,
        vehicle: String(body.vehicle ?? "").trim() || null,
      },
      select: publicAgentFields,
    });
    return NextResponse.json(agent);
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "An agent with this mobile number already exists" }, { status: 409 });
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
