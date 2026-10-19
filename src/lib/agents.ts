import { db } from "@/lib/db";
import { getAgentId } from "@/lib/auth";
import { computeCharges } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { OrderInputError } from "@/lib/orders";

export const publicAgentFields = { id: true, name: true, phone: true, zone: true, vehicle: true, isActive: true } as const;

// The signed-in, active agent (or null).
export async function getAgent() {
  const id = await getAgentId();
  if (!id) return null;
  const agent = await db.agent.findUnique({ where: { id }, select: publicAgentFields });
  return agent?.isActive ? agent : null;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/*
 * Pickup confirmation: the agent weighs/counts the clothes and corrects quantities.
 * Items are re-priced at the rate stored on each line; express, coupon and delivery fee are
 * recomputed for the new subtotal; the platform fee stays as charged.
 */
export async function repriceAtPickup(orderId: string, quantities: { itemId: string; quantity: number }[]) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new OrderInputError("Order not found");

  const updates = order.items.map((item) => {
    const change = quantities.find((q) => q.itemId === item.id);
    const quantity = change ? Number(change.quantity) : item.quantity;
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) {
      throw new OrderInputError("Each quantity must be more than 0");
    }
    return { id: item.id, quantity, totalPrice: Math.round(quantity * item.unitPrice * 100) / 100 };
  });
  const subtotal = updates.reduce((t, u) => t + u.totalPrice, 0);

  const s = await getSettings();
  const express = order.deliveryType === "EXPRESS";
  const expressCharge = express ? (subtotal * s.expressRate) / 100 : 0;
  let discount = 0;
  if (order.couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: order.couponCode } });
    if (coupon && subtotal + expressCharge >= coupon.minOrder) {
      discount = coupon.type === "PERCENT" ? ((subtotal + expressCharge) * coupon.value) / 100 : coupon.value;
      if (coupon.type === "PERCENT" && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    }
  }
  const charges = computeCharges(
    subtotal,
    { express, discount, chargeDelivery: order.source === "PORTAL" },
    { ...s, platformFee: order.platformFee }
  );

  return { updates, charges };
}
