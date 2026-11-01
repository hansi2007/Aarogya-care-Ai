import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analyses, agentEvents, documents, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  deleteMedicalDocumentFromStorage,
  getSignedMedicalDocumentUrl,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/documents/[id]
 * View original document securely (with signed URL or base64 stream)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let viewUrl: string | null = null;
    if (doc.storagePath) {
      viewUrl = await getSignedMedicalDocumentUrl(doc.storagePath, 3600);
    }

    if (!viewUrl && doc.base64) {
      viewUrl = `data:${doc.mime || "image/png"};base64,${doc.base64}`;
    } else if (!viewUrl && doc.imageSrc) {
      viewUrl = doc.imageSrc;
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      filename: doc.filename,
      mime: doc.mime,
      size: doc.size,
      viewUrl,
      createdAt: doc.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch document" }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/[id]
 * Securely deletes document, associated runs, analyses, events, and storage file
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieSession = req.cookies.get("aarogya_session")?.value;
    let sessionUser: any = null;
    if (cookieSession) {
      try {
        sessionUser = JSON.parse(Buffer.from(cookieSession, "base64").toString("utf-8"));
      } catch {}
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Authorization check: User must own the document if userId is set
    if (doc.userId && sessionUser?.id && doc.userId !== sessionUser.id) {
      return NextResponse.json({ error: "Unauthorized to delete this medical record" }, { status: 403 });
    }

    // 1. Delete file from Supabase storage if stored there
    if (doc.storagePath) {
      await deleteMedicalDocumentFromStorage(doc.storagePath);
    }

    // 2. Cascade delete database records
    const associatedRuns = await db.select({ id: runs.id }).from(runs).where(eq(runs.documentId, id));
    for (const r of associatedRuns) {
      await db.delete(analyses).where(eq(analyses.runId, r.id));
      await db.delete(agentEvents).where(eq(agentEvents.runId, r.id));
    }
    await db.delete(runs).where(eq(runs.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));

    return NextResponse.json({ success: true, message: "Medical document and associated AI analyses deleted." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete document" }, { status: 500 });
  }
}
