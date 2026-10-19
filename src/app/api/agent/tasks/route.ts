import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/auth";
import { getAgent, startOfToday } from "@/lib/agents";
import { errorMessage } from "@/lib/orders";

const taskInclude = {
  customer: { select: { name: true, phone: true } },
  items: { include: { service: { select: { name: true, unit: true } } } },
} as const;

// The agent's run sheet: pickups due up to today, deliveries in hand, and today's completed work.
export async function GET() {
  const agent = await getAgent();
  if (!agent) return unauthorized();
  try {
    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [pickups, upcoming, deliveries, doneToday] = await Promise.all([
      db.order.findMany({
        where: { pickupAgentId: agent.id, status: "PENDING", pickupDate: { lt: tomorrow } },
        include: taskInclude,
        orderBy: [{ pickupDate: "asc" }, { pickupSlot: "asc" }],
      }),
      db.order.count({ where: { pickupAgentId: agent.id, status: "PENDING", pickupDate: { gte: tomorrow } } }),
      db.order.findMany({
        where: { deliveryAgentId: agent.id, status: { in: ["READY", "OUT_FOR_DELIVERY"] } },
        include: taskInclude,
        orderBy: [{ deliveryDate: "asc" }],
      }),
      db.order.findMany({
        where: {
          OR: [
            { pickupAgentId: agent.id, pickedUpAt: { gte: today } },
            { deliveryAgentId: agent.id, deliveredAt: { gte: today } },
          ],
        },
        include: taskInclude,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Never send the handover code to the agent: the customer reads it out at the door.
    const strip = <T extends { deliveryCode: string | null }>(o: T) => ({ ...o, deliveryCode: undefined });
    const delivered = doneToday.filter((o) => o.deliveryAgentId === agent.id && o.deliveredAt && o.deliveredAt >= today);
    const cash = delivered.filter((o) => o.collectedVia === "CASH").reduce((t, o) => t + (o.collectedAmount ?? 0), 0);
    const upi = delivered.filter((o) => o.collectedVia === "MOBILE").reduce((t, o) => t + (o.collectedAmount ?? 0), 0);

    return NextResponse.json({
      agent,
      pickups: pickups.map(strip),
      deliveries: deliveries.map(strip),
      done: doneToday.map(strip),
      summary: {
        pickupsDue: pickups.length,
        upcomingPickups: upcoming,
        deliveriesInHand: deliveries.length,
        pickedUpToday: doneToday.filter((o) => o.pickupAgentId === agent.id && o.pickedUpAt && o.pickedUpAt >= today).length,
        deliveredToday: delivered.length,
        cashCollected: Math.round(cash * 100) / 100,
        upiCollected: Math.round(upi * 100) / 100,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
