import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { errorMessage } from "@/lib/orders";
import { parseCoupon } from "@/lib/coupons";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    // Quick toggle from the coupon list
    if (Object.keys(body).length === 1 && "isActive" in body) {
      return NextResponse.json(await db.coupon.update({ where: { id }, data: { isActive: Boolean(body.isActive) } }));
    }
    const parsed = parseCoupon(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    return NextResponse.json(await db.coupon.update({ where: { id }, data: parsed.data }));
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ message: "Coupon deleted" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
