import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analyses, documents, runs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [run] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, run.documentId))
    .limit(1);
  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.runId, id))
    .limit(1);
  return NextResponse.json({ run, document: doc ?? null, analysis: analysis ?? null });
}
