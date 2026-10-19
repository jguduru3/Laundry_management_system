import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { errorMessage } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const used = await db.orderItem.count({ where: { serviceId: id } });
    if (used > 0) {
      // Keep order history intact: services that were ever ordered are deactivated instead of deleted.
      const service = await db.service.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ message: "Service is used in past orders, so it was deactivated instead", service });
    }
    await db.service.delete({ where: { id } });
    return NextResponse.json({ message: "Service deleted" });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
