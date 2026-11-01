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
  const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  if (!analysis) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  const [run] = await db.select().from(runs).where(eq(runs.id, analysis.runId)).limit(1);
  const [doc] = run
    ? await db.select().from(documents).where(eq(documents.id, run.documentId)).limit(1)
    : [null];
  return NextResponse.json({ analysis, run: run ?? null, document: doc ?? null });
}
