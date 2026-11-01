import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analyses, documents, runs } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const requestedUserId = url.searchParams.get("userId");

  const cookieSession = req.cookies.get("aarogya_session")?.value;
  let sessionUser: any = null;
  if (cookieSession) {
    try {
      sessionUser = JSON.parse(Buffer.from(cookieSession, "base64").toString("utf-8"));
    } catch {}
  }

  const effectiveUserId = requestedUserId || sessionUser?.id;

  const rows = await db
    .select({
      id: runs.id,
      documentId: runs.documentId,
      title: runs.title,
      status: runs.status,
      mode: runs.mode,
      summaryLine: runs.summaryLine,
      createdAt: runs.createdAt,
      documentKind: documents.kind,
      imageSrc: documents.imageSrc,
      filename: documents.filename,
      storagePath: documents.storagePath,
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

  // If filtered for a specific user, prioritize/filter their runs
  const filteredRows = effectiveUserId
    ? rows.filter((r) => r.userId === effectiveUserId || !r.userId)
    : rows;

  return NextResponse.json({ runs: filteredRows });
}
