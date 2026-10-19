export interface PortalCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  area: string | null;
  createdAt: string;
}

export type { PublicSettings } from "@/lib/settings";

export interface PortalConfig {
  settings: import("@/lib/settings").PublicSettings;
  areas: { name: string; pincode: string; zone: string }[];
  slots: { id: string; label: string }[];
  onlinePayments?: boolean;
}

export interface Quote {
  lines: { serviceId: string; name: string; unit: string; quantity: number; unitPrice: number; totalPrice: number }[];
  charges: { subtotal: number; expressCharge: number; discount: number; deliveryFee: number; platformFee: number; total: number };
  deliveryType: string;
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  minOrderValue: number;
  meetsMinimum: boolean;
}

export interface PortalService {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string | null;
  isActive: boolean;
}

export interface PortalOrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  service: PortalService;
}

export interface PortalOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  source: string;
  deliveryType: string;
  expressCharge: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  couponCode: string | null;
  totalAmount: number;
  notes: string | null;
  pickupDate: string | null;
  pickupSlot: string | null;
  area: string | null;
  address: string | null;
  rating: number | null;
  feedback: string | null;
  deliveryCode?: string | null;
  pickupAgent?: { name: string; phone: string } | null;
  deliveryAgent?: { name: string; phone: string } | null;
  deliveryDate: string | null;
  createdAt: string;
  items: PortalOrderItem[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  wash: "Laundry",
  ironing: "Steam Ironing",
  dry_clean: "Dry Cleaning",
  household: "Household",
  specialty: "Shoes & Specialty",
};

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export function formatDate(value: string | null, withTime = false) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function itemsSubtotal(order: { items: { totalPrice: number }[] }) {
  return order.items.reduce((sum, i) => sum + i.totalPrice, 0);
}

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Slots that have already started today cannot be booked.
export function slotAvailable(dateISO: string, slotId: string) {
  if (dateISO !== todayISO()) return true;
  const [h, m] = slotId.split("-")[0].split(":").map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  return start.getTime() > Date.now();
}

export function upiLink(upiId: string, payee: string, amount: number, note: string) {
  const params = new URLSearchParams({ pa: upiId, pn: payee, am: amount.toFixed(2), cu: "INR", tn: note });
  return `upi://pay?${params.toString()}`;
}
