import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const services = await db.service.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(services);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, category, price, unit, description, isActive } = body;

    if (!name || !category || price === undefined || !unit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (id) {
      // Update
      const service = await db.service.update({
        where: { id },
        data: { 
          name, 
          category, 
          price: parseFloat(price), 
          unit, 
          description, 
          isActive: isActive !== undefined ? isActive : true 
        }
      });
      return NextResponse.json(service);
    } else {
      // Create
      const service = await db.service.create({
        data: { 
          name, 
          category, 
          price: parseFloat(price), 
          unit, 
          description,
          isActive: true
        }
      });
      return NextResponse.json(service);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
