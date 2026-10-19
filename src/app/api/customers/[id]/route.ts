import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { errorMessage, orderInclude } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      omit: { pinHash: true },
      include: { orders: { include: { items: orderInclude.items }, orderBy: { createdAt: "desc" } } },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ ...customer, hasPortalAccess: await hasPin(id) });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// Staff can reset a customer's portal PIN so they can activate it again with an order number.
export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { resetPin } = await req.json();
    if (!resetPin) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    await db.customer.update({ where: { id }, data: { pinHash: null } });
    return NextResponse.json({ message: "Portal PIN reset" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const active = await db.order.count({
      where: { customerId: id, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    });
    if (active > 0) {
      return NextResponse.json({ error: `Customer has ${active} active order(s); complete or cancel them first` }, { status: 409 });
    }
    await db.customer.delete({ where: { id } });
    return NextResponse.json({ message: "Customer deleted" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

async function hasPin(id: string) {
  const c = await db.customer.findUnique({ where: { id }, select: { pinHash: true } });
  return Boolean(c?.pinHash);
}
