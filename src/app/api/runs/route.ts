import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyses, documents, runs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: runs.id,
      title: runs.title,
      status: runs.status,
      mode: runs.mode,
      summaryLine: runs.summaryLine,
      createdAt: runs.createdAt,
      documentKind: documents.kind,
      imageSrc: documents.imageSrc,
      patientName: documents.patientName,
      patientAge: documents.patientAge,
      userId: documents.userId,
      analysisId: analyses.id,
      medCount: analyses.medCount,
      interactionCount: analyses.interactionCount,
    })
    .from(runs)
    .leftJoin(documents, eq(runs.documentId, documents.id))
    .leftJoin(analyses, eq(analyses.runId, runs.id))
    .orderBy(desc(runs.createdAt))
    .limit(60);
  return NextResponse.json({ runs: rows });
}
