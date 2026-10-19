import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { errorMessage } from "@/lib/orders";
import { parseCoupon } from "@/lib/coupons";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
    const usage = await db.order.groupBy({
      by: ["couponCode"],
      where: { couponCode: { not: null }, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { discount: true },
    });
    return NextResponse.json(
      coupons.map((c) => {
        const u = usage.find((x) => x.couponCode === c.code);
        return { ...c, timesUsed: u?._count._all ?? 0, totalDiscount: u?._sum.discount ?? 0 };
      })
    );
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const parsed = parseCoupon(await req.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const coupon = await db.coupon.create({ data: parsed.data });
    return NextResponse.json(coupon);
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
