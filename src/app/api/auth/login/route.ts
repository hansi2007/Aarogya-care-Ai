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

    const { identifier, password } = body;

    if (!identifier || typeof identifier !== "string" || identifier.trim().length === 0) {
      return NextResponse.json({ error: "Please enter your email or phone number" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.trim().length === 0) {
      return NextResponse.json({ error: "Please enter your password" }, { status: 400 });
    }

    const cleanInput = identifier.trim();
    const isEmail = cleanInput.includes("@");
    const digitsOnly = cleanInput.replace(/\D/g, "");

    // Search user
    let matchedUser = null;
    if (isEmail) {
      const rows = await db.select().from(users).where(eq(users.email, cleanInput.toLowerCase()));
      matchedUser = rows[0] || null;
    } else {
      // Try phone lookup first, then exact email
      if (digitsOnly.length >= 7) {
        const rows = await db.select().from(users).where(eq(users.phone, digitsOnly));
        matchedUser = rows[0] || null;
      }
      if (!matchedUser) {
        const rows = await db.select().from(users).where(eq(users.email, cleanInput.toLowerCase()));
        matchedUser = rows[0] || null;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: "No patient account found with this email or phone" }, { status: 401 });
    }

    if (matchedUser.password !== password.trim()) {
      return NextResponse.json({ error: "Incorrect password. Please try again or use Forgot Password." }, { status: 401 });
    }

    const safeUser = {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      phone: matchedUser.phone,
      age: matchedUser.age,
      gender: matchedUser.gender,
      patientId: matchedUser.patientId,
    };

    const sessionData = Buffer.from(JSON.stringify(safeUser)).toString("base64");
    const response = NextResponse.json({ ok: true, user: safeUser }, { status: 200 });

    response.cookies.set("aarogya_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
