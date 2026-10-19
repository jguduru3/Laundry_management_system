// Serviceable Hyderabad localities (with their main PIN codes) and pickup windows.

export const SERVICE_AREAS: { name: string; pincode: string; zone: string }[] = [
  { name: "Madhapur", pincode: "500081", zone: "West" },
  { name: "HITEC City", pincode: "500081", zone: "West" },
  { name: "Gachibowli", pincode: "500032", zone: "West" },
  { name: "Kondapur", pincode: "500084", zone: "West" },
  { name: "Financial District", pincode: "500032", zone: "West" },
  { name: "Nanakramguda", pincode: "500032", zone: "West" },
  { name: "Kokapet", pincode: "500075", zone: "West" },
  { name: "Manikonda", pincode: "500089", zone: "West" },
  { name: "Nallagandla", pincode: "500019", zone: "West" },
  { name: "Kukatpally", pincode: "500072", zone: "North-West" },
  { name: "KPHB Colony", pincode: "500072", zone: "North-West" },
  { name: "Miyapur", pincode: "500049", zone: "North-West" },
  { name: "Bachupally", pincode: "500090", zone: "North-West" },
  { name: "Jubilee Hills", pincode: "500033", zone: "Central" },
  { name: "Banjara Hills", pincode: "500034", zone: "Central" },
  { name: "Ameerpet", pincode: "500016", zone: "Central" },
  { name: "Somajiguda", pincode: "500082", zone: "Central" },
  { name: "Begumpet", pincode: "500016", zone: "Central" },
  { name: "Mehdipatnam", pincode: "500028", zone: "Central" },
  { name: "Tolichowki", pincode: "500008", zone: "Central" },
  { name: "Secunderabad", pincode: "500003", zone: "North" },
  { name: "Malkajgiri", pincode: "500047", zone: "North" },
  { name: "Alwal", pincode: "500010", zone: "North" },
  { name: "Uppal", pincode: "500039", zone: "East" },
  { name: "Dilsukhnagar", pincode: "500060", zone: "East" },
  { name: "LB Nagar", pincode: "500074", zone: "East" },
  { name: "Malakpet", pincode: "500036", zone: "East" },
];

export const PICKUP_SLOTS = [
  { id: "07:00-10:00", label: "7 AM - 10 AM" },
  { id: "10:00-13:00", label: "10 AM - 1 PM" },
  { id: "13:00-16:00", label: "1 PM - 4 PM" },
  { id: "16:00-19:00", label: "4 PM - 7 PM" },
  { id: "19:00-22:00", label: "7 PM - 10 PM" },
];

export function isServiceArea(area: unknown): area is string {
  return typeof area === "string" && SERVICE_AREAS.some((a) => a.name === area);
}

export function slotLabel(id: string | null | undefined) {
  return PICKUP_SLOTS.find((s) => s.id === id)?.label ?? id ?? "";
}

// True when the slot has already started for the given pickup day (local server time).
export function isSlotPast(pickupDay: Date, slotId: string, now = new Date()) {
  const [start] = slotId.split("-");
  const [h, m] = start.split(":").map(Number);
  const slotStart = new Date(pickupDay);
  slotStart.setHours(h, m, 0, 0);
  return slotStart.getTime() <= now.getTime();
}

// Indian mobile numbers: accepts "+91 98765 43210", "098765-43210", "9876543210" -> "9876543210".
export function normalizeIndianMobile(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function formatIndianMobile(phone: string) {
  return /^\d{10}$/.test(phone) ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

// "Flat 3B, Paramount Colony" + "Tolichowki" -> joined, without repeating a locality already in the address.
export function fullAddress(address: string | null | undefined, area: string | null | undefined) {
  if (!address) return area ?? "";
  if (!area || address.toLowerCase().includes(area.toLowerCase())) return address;
  return `${address}, ${area}`;
}
