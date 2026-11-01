import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { name, email, phone, age, gender, password } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Please enter your full name (minimum 2 characters)" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? String(phone).replace(/\D/g, "") : "";
    const cleanAge = age ? parseInt(String(age), 10) : null;

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "An account with this email address already exists" }, { status: 409 });
    }

    if (cleanPhone) {
      const existingPhone = await db.select().from(users).where(eq(users.phone, cleanPhone));
      if (existingPhone.length > 0) {
        return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
      }
    }

    // Generate unique Patient ID (e.g. AC-78412)
    const patientId = `AC-${Math.floor(10000 + Math.random() * 90000)}`;

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone || null,
        age: cleanAge && cleanAge > 0 ? cleanAge : null,
        gender: gender ? String(gender).trim() : null,
        password: password.trim(),
        patientId,
      })
      .returning();

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      age: newUser.age,
      gender: newUser.gender,
      patientId: newUser.patientId,
    };

    const sessionData = Buffer.from(JSON.stringify(safeUser)).toString("base64");
    const response = NextResponse.json({ ok: true, user: safeUser }, { status: 201 });

    response.cookies.set("aarogya_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
