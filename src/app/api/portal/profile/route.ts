import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerId, hashPin, isValidPin, unauthorized, verifyPin } from "@/lib/auth";
import { publicCustomerFields } from "@/lib/portal";
import { errorMessage } from "@/lib/orders";
import { isServiceArea } from "@/lib/hyderabad";

// Update name / email / address, and optionally change the PIN (requires the current PIN).
export async function PATCH(req: Request) {
  const customerId = await getCustomerId();
  if (!customerId) return unauthorized();
  try {
    const { name, email, address, area, currentPin, newPin } = await req.json();
    const data: { name?: string; email?: string | null; address?: string | null; area?: string | null; pinHash?: string } = {};

    if (name !== undefined) {
      if (!String(name).trim()) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      data.name = String(name).trim();
    }
    if (email !== undefined) data.email = String(email).trim() || null;
    if (address !== undefined) data.address = String(address).trim() || null;
    if (area !== undefined) {
      if (area && !isServiceArea(area)) return NextResponse.json({ error: "We do not serve this locality yet" }, { status: 400 });
      data.area = area || null;
    }

    if (newPin) {
      if (!isValidPin(newPin)) return NextResponse.json({ error: "New PIN must be 4 to 6 digits" }, { status: 400 });
      const current = await db.customer.findUnique({ where: { id: customerId }, select: { pinHash: true } });
      if (!verifyPin(String(currentPin ?? ""), current?.pinHash ?? null)) {
        return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
      }
      data.pinHash = hashPin(newPin);
    }

    const customer = await db.customer.update({ where: { id: customerId }, data, select: publicCustomerFields });
    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
