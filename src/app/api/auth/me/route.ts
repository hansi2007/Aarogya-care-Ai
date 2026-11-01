import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("aarogya_session")?.value;
    if (!cookie) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    let parsed: any = null;
    try {
      const decoded = Buffer.from(cookie, "base64").toString("utf-8");
      parsed = JSON.parse(decoded);
    } catch {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    if (!parsed?.id) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const rows = await db.select().from(users).where(eq(users.id, parsed.id)).limit(1);
    const currentUser = rows[0];

    if (!currentUser) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const safeUser = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      age: currentUser.age,
      gender: currentUser.gender,
      patientId: currentUser.patientId,
    };

    return NextResponse.json({ authenticated: true, user: safeUser }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
