import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, runs } from "@/db/schema";
import { getSample } from "@/lib/medical/samples";
import { runPipeline } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_SIZE = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const cookieSession = req.cookies.get("aarogya_session")?.value;
    let sessionUser: any = null;
    if (cookieSession) {
      try {
        sessionUser = JSON.parse(Buffer.from(cookieSession, "base64").toString("utf-8"));
      } catch {}
    }

    let docValues: {
      userId?: string;
      patientName?: string;
      patientAge?: number;
      kind: string;
      title: string;
      filename?: string;
      mime?: string;
      size?: number;
      base64?: string;
      textContent?: string;
      imageSrc?: string;
    } | null = null;
    let mode = "demo";

    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      const customTitle = fd.get("title") ? String(fd.get("title")) : undefined;
      const patientName = fd.get("patientName") ? String(fd.get("patientName")) : sessionUser?.name;
      const patientAge = fd.get("patientAge") ? parseInt(String(fd.get("patientAge")), 10) : sessionUser?.age;
      const userId = fd.get("userId") ? String(fd.get("userId")) : sessionUser?.id;

      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
      if (file.size > MAX_SIZE)
        return NextResponse.json({ error: "File exceeds 12 MB limit" }, { status: 400 });
      const buf = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "application/octet-stream";
      const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/i.test(file.name);
      if (!isPdf && !isImage)
        return NextResponse.json(
          { error: "Only images (PNG/JPG) and PDFs are supported" },
          { status: 400 },
        );
      docValues = {
        userId,
        patientName,
        patientAge,
        kind: isPdf ? "pdf" : "image",
        title: customTitle || file.name,
        filename: file.name,
        mime,
        size: file.size,
        base64: buf.toString("base64"),
      };
      mode = isPdf ? "pdf" : "demo";
    } else {
      const body = await req.json().catch(() => null);
      if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

      const patientName = body.patientName || sessionUser?.name;
      const patientAge = body.patientAge ? parseInt(String(body.patientAge), 10) : sessionUser?.age;
      const userId = body.userId || sessionUser?.id;

      if (body.mode === "sample") {
        const sample = getSample(String(body.sampleId ?? ""));
        if (!sample) return NextResponse.json({ error: "Unknown sample" }, { status: 404 });
        docValues = {
          userId,
          patientName,
          patientAge,
          kind: "sample",
          title: sample.title,
          textContent: sample.id,
          imageSrc: sample.imageSrc,
          filename: `${sample.id}.png`,
        };
        mode = "demo";
      } else if (body.mode === "text") {
        const text = String(body.text ?? "").trim();
        if (text.length < 10)
          return NextResponse.json({ error: "Text too short to parse" }, { status: 400 });
        docValues = {
          userId,
          patientName,
          patientAge,
          kind: "text",
          title: String(body.title ?? "Pasted prescription text").slice(0, 120),
          textContent: text.slice(0, 20000),
        };
        mode = "text";
      } else {
        return NextResponse.json({ error: "Unknown intake mode" }, { status: 400 });
      }
    }

    const [doc] = await db.insert(documents).values(docValues).returning();
    const [run] = await db
      .insert(runs)
      .values({ documentId: doc.id, title: doc.title, mode })
      .returning();

    setTimeout(() => {
      runPipeline(run.id).catch(() => {});
    }, 250);

    return NextResponse.json({ runId: run.id, documentId: doc.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "intake failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
