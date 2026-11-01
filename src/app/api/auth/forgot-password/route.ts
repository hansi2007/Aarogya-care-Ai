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

    const { identifier, newPassword } = body;

    if (!identifier || typeof identifier !== "string" || identifier.trim().length === 0) {
      return NextResponse.json({ error: "Please provide your registered email or phone number" }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    const cleanInput = identifier.trim();
    const isEmail = cleanInput.includes("@");
    const digitsOnly = cleanInput.replace(/\D/g, "");

    let matchedUser = null;
    if (isEmail) {
      const rows = await db.select().from(users).where(eq(users.email, cleanInput.toLowerCase()));
      matchedUser = rows[0] || null;
    } else {
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
      return NextResponse.json({ error: "No patient account found with that email or phone number" }, { status: 404 });
    }

    // Update password
    await db.update(users).set({ password: newPassword.trim() }).where(eq(users.id, matchedUser.id));

    return NextResponse.json({
      ok: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Password reset failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
