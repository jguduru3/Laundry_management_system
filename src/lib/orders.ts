import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { computeCharges, formatINR, type PriceBreakdown } from "@/lib/pricing";
import { getSettings, type Settings } from "@/lib/settings";
import { PICKUP_SLOTS, isServiceArea, isSlotPast } from "@/lib/hyderabad";

export const ORDER_STATUSES = ["PENDING", "PICKED_UP", "WASHING", "DRYING", "IRONING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"];
export const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE"];
export const DELIVERY_TYPES = ["STANDARD", "EXPRESS"];

export const orderInclude = {
  customer: { omit: { pinHash: true } },
  items: { include: { service: true } },
  pickupAgent: { select: { id: true, name: true, phone: true } },
  deliveryAgent: { select: { id: true, name: true, phone: true } },
} as const;

export class OrderInputError extends Error {}

export interface DraftItem {
  serviceId: string;
  quantity: number | string;
  notes?: string | null;
}

interface DraftInput {
  customerId?: string | null;
  items: DraftItem[];
  deliveryType?: string;
  couponCode?: string | null;
  source: "STAFF" | "PORTAL";
}

export interface PricedDraft {
  lines: { serviceId: string; name: string; unit: string; quantity: number; unitPrice: number; totalPrice: number; notes: string | null }[];
  charges: PriceBreakdown;
  deliveryType: string;
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  minOrderValue: number;
  meetsMinimum: boolean;
}

// Prices a draft from current service rates and settings. Coupon problems are reported, not thrown,
// so the portal can show them next to the coupon field while the rest of the quote stays usable.
export async function priceDraft(input: DraftInput, settings?: Settings): Promise<PricedDraft> {
  const s = settings ?? (await getSettings());
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new OrderInputError("Add at least one service");
  }

  const ids = input.items.map((i) => i.serviceId);
  const services = await db.service.findMany({ where: { id: { in: ids } } });
  const lines: PricedDraft["lines"] = [];
  for (const item of input.items) {
    const service = services.find((x) => x.id === item.serviceId);
    if (!service) throw new OrderInputError(`Service with ID ${item.serviceId} not found`);
    if (input.source === "PORTAL" && !service.isActive) throw new OrderInputError(`${service.name} is currently unavailable`);
    const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 1000) throw new OrderInputError(`Invalid quantity for ${service.name}`);
    lines.push({
      serviceId: service.id,
      name: service.name,
      unit: service.unit,
      quantity: qty,
      unitPrice: service.price,
      totalPrice: Math.round(qty * service.price * 100) / 100,
      notes: item.notes || null,
    });
  }
  const subtotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);
  const deliveryType = input.deliveryType === "EXPRESS" ? "EXPRESS" : "STANDARD";
  const express = deliveryType === "EXPRESS";

  let discount = 0;
  let coupon: PricedDraft["coupon"] = null;
  let couponError: string | null = null;
  const code = input.couponCode?.trim().toUpperCase() || null;
  if (code) {
    const expressCharge = express ? (subtotal * s.expressRate) / 100 : 0;
    const result = await evaluateCoupon(code, subtotal + expressCharge, input.customerId ?? null);
    if ("error" in result) couponError = result.error ?? "This coupon code is not valid";
    else {
      discount = result.discount;
      coupon = { code: result.coupon.code, description: result.coupon.description };
    }
  }

  // Counter (STAFF) orders are dropped off in person, so no delivery fee and no minimum.
  const charges = computeCharges(subtotal, { express, discount, chargeDelivery: input.source === "PORTAL" }, s);
  const meetsMinimum = input.source === "STAFF" || subtotal >= s.minOrderValue;
  return { lines, charges, deliveryType, coupon, couponError, minOrderValue: s.minOrderValue, meetsMinimum };
}

async function evaluateCoupon(code: string, eligibleAmount: number, customerId: string | null) {
  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) return { error: "This coupon code is not valid" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { error: "This coupon has expired" };
  if (eligibleAmount < coupon.minOrder) return { error: `Add items worth ${formatINR(coupon.minOrder - eligibleAmount)} more to use ${code}` };
  if (coupon.firstOrderOnly && customerId) {
    const previous = await db.order.count({ where: { customerId, status: { not: "CANCELLED" } } });
    if (previous > 0) return { error: `${code} is valid on your first order only` };
  }
  if (customerId) {
    const used = await db.order.count({ where: { customerId, couponCode: code, status: { not: "CANCELLED" } } });
    if (used > 0) return { error: `You have already used ${code}` };
  }
  let discount = coupon.type === "PERCENT" ? (eligibleAmount * coupon.value) / 100 : coupon.value;
  if (coupon.type === "PERCENT" && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return { coupon, discount: Math.round(discount * 100) / 100 };
}

interface NewOrderInput {
  customerId: string;
  items: DraftItem[];
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  notes?: string | null;
  pickupDate?: string | null;
  pickupSlot?: string | null;
  deliveryDate?: string | null;
  deliveryType?: string;
  couponCode?: string | null;
  area?: string | null;
  address?: string | null;
  source: "STAFF" | "PORTAL";
}

export function validatePickup(pickupDate: string | null | undefined, pickupSlot: string | null | undefined) {
  if (!pickupDate) throw new OrderInputError("Choose a pickup date");
  const day = new Date(`${pickupDate.slice(0, 10)}T00:00:00`);
  if (isNaN(day.getTime())) throw new OrderInputError("Invalid pickup date");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDay = new Date(today);
  maxDay.setDate(maxDay.getDate() + 14);
  if (day < today) throw new OrderInputError("Pickup date must be today or later");
  if (day > maxDay) throw new OrderInputError("Pickups can be booked up to 14 days ahead");
  if (!pickupSlot || !PICKUP_SLOTS.some((s) => s.id === pickupSlot)) throw new OrderInputError("Choose a pickup time slot");
  if (isSlotPast(day, pickupSlot)) throw new OrderInputError("That pickup slot has already started. Pick a later slot.");
  return day;
}

export function estimateDelivery(pickup: Date, deliveryType: string, s: Settings) {
  const hours = deliveryType === "EXPRESS" ? s.expressHours : s.standardHours;
  return new Date(pickup.getTime() + hours * 60 * 60 * 1000);
}

export async function createOrder(input: NewOrderInput) {
  const { customerId } = input;
  if (!customerId) throw new OrderInputError("Missing customer");
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new OrderInputError("Customer not found");

  const s = await getSettings();
  const draft = await priceDraft({ ...input, source: input.source }, s);
  if (draft.couponError) throw new OrderInputError(draft.couponError);
  if (!draft.meetsMinimum) throw new OrderInputError(`Minimum order value is ${formatINR(s.minOrderValue)} (items subtotal)`);

  let pickupDate: Date;
  let area = input.area || customer.area || null;
  const address = input.address?.trim() || customer.address || null;
  if (input.source === "PORTAL") {
    pickupDate = validatePickup(input.pickupDate, input.pickupSlot);
    if (!isServiceArea(area)) throw new OrderInputError("Choose a serviceable Hyderabad locality");
    if (!address) throw new OrderInputError("Add a pickup address");
  } else {
    pickupDate = input.pickupDate ? new Date(input.pickupDate) : new Date();
    if (area && !isServiceArea(area)) area = null;
  }

  const status = input.status && ORDER_STATUSES.includes(input.status) ? input.status : "PENDING";
  const paymentStatus = input.paymentStatus && PAYMENT_STATUSES.includes(input.paymentStatus) ? input.paymentStatus : "UNPAID";
  const paymentMethod = input.paymentMethod && PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : "CASH";
  const { charges } = draft;

  // Two bookings at the same moment can pick the same number; retry with the next one.
  for (let attempt = 0; ; attempt++) {
    try {
      return await insertOrder(await nextOrderNumber());
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== "P2002" || attempt >= 4) throw error;
    }
  }

  function insertOrder(orderNumber: string) {
    return db.order.create({
      data: {
        orderNumber,
        deliveryCode: String(randomInt(0, 10000)).padStart(4, "0"),
        customerId,
        status,
        paymentStatus,
        paymentMethod,
        source: input.source,
        deliveryType: draft.deliveryType,
        expressCharge: charges.expressCharge,
        deliveryFee: charges.deliveryFee,
        platformFee: charges.platformFee,
        discount: charges.discount,
        couponCode: draft.coupon?.code ?? null,
        totalAmount: charges.total,
        notes: input.notes || null,
        pickupDate,
        pickupSlot: input.pickupSlot || null,
        area,
        address,
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : estimateDelivery(pickupDate, draft.deliveryType, s),
        items: {
          create: draft.lines.map((l) => ({
            serviceId: l.serviceId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalPrice: l.totalPrice,
            notes: l.notes,
          })),
        },
      },
      include: orderInclude,
    });
  }
}

// Highest existing number + 1. Based on the numbers themselves, not createdAt, so imported or
// back-dated orders can't make it reuse a number.
async function nextOrderNumber() {
  const existing = await db.order.findMany({ where: { orderNumber: { startsWith: "LND-" } }, select: { orderNumber: true } });
  const max = existing.reduce((m, o) => Math.max(m, parseInt(o.orderNumber.slice(4), 10) || 0), 1000);
  return `LND-${max + 1}`;
}

export function errorResponseStatus(error: unknown) {
  return error instanceof OrderInputError ? 400 : 500;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}
