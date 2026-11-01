import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { analyses, documents, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight, FileScan, FileType2, Download } from "lucide-react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { FullReport } from "@/components/analyze/results";
import { getSignedMedicalDocumentUrl } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  if (!analysis?.payload) notFound();
  const [run] = await db.select().from(runs).where(eq(runs.id, analysis.runId)).limit(1);
  const [doc] = run
    ? await db.select().from(documents).where(eq(documents.id, run.documentId)).limit(1)
    : [null];

  const payload = analysis.payload;

  let originalDocUrl: string | null = doc?.imageSrc || null;
  if (!originalDocUrl && doc?.storagePath) {
    originalDocUrl = await getSignedMedicalDocumentUrl(doc.storagePath);
  }
  if (!originalDocUrl && doc?.base64) {
    originalDocUrl = `data:${doc.mime || "image/png"};base64,${doc.base64}`;
  }
  const isPdf = doc?.kind === "pdf" || doc?.mime === "application/pdf";

  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-24 pt-[104px] md:pt-[120px]">
        <div className="grid-bg absolute inset-x-0 top-0 h-[460px]" />
        <div className="glow-orb absolute -right-40 top-40 h-[400px] w-[400px] bg-[#a78bfa0e]" />

        <div className="relative mx-auto max-w-5xl px-5 md:px-8">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 font-mono2 text-[11px] uppercase tracking-[0.22em] text-dim transition-colors hover:text-mint"
            >
              <ArrowLeft size={13} /> Back to Dashboard
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 font-mono2 text-[11px] uppercase tracking-[0.22em] text-dim transition-colors hover:text-mint"
            >
              Vault Records <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mb-10 mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="eyebrow">Aarogya Care AI Medical Care Plan</span>
              <h1 className="h-display mt-4 text-[clamp(1.8rem,4vw,2.9rem)] leading-tight text-fg">
                {payload.plain.headline}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-2 font-mono2 text-[10.5px] uppercase tracking-[0.18em] text-faint">
                <FileScan size={12} className="text-mint" />
                {run?.title} ·{" "}
                {analysis.createdAt
                  ? new Date(analysis.createdAt).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
                {payload.meta.mode === "live" && (
                  <span className="rounded border border-mint/30 bg-mint/10 px-1.5 py-0.5 text-mint">
                    Gemini 3.8 Flash AI
                  </span>
                )}
                {payload.meta.mode === "demo" && (
                  <span className="rounded border border-amber/30 px-1.5 py-0.5 text-amber">demo corpus</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard" className="btn btn-ghost h-11 px-4 text-[13px] border border-line">
                Dashboard
              </Link>
              <Link href="/analyze" className="btn btn-primary h-11 px-5 text-[13px]">
                New analysis <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Original Document View Card */}
          {originalDocUrl && (
            <div className="glass mb-8 overflow-hidden rounded-[22px] p-4 border border-line">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-mono2 text-[10.5px] uppercase tracking-wider text-faint flex items-center gap-1.5">
                  <FileScan size={13} className="text-mint" /> Original Uploaded Medical Document
                </span>
                {isPdf ? (
                  <a
                    href={originalDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost h-7 px-2.5 text-[11px] border border-line flex items-center gap-1"
                  >
                    Open PDF in New Window <ArrowRight size={12} />
                  </a>
                ) : (
                  <a
                    href={originalDocUrl}
                    download={doc?.filename || "medical-document.png"}
                    className="btn btn-ghost h-7 px-2.5 text-[11px] border border-line flex items-center gap-1"
                  >
                    <Download size={12} /> Save Original
                  </a>
                )}
              </div>

              {isPdf ? (
                <div className="rounded-xl border border-line bg-panel2/60 p-6 text-center">
                  <FileType2 size={36} className="mx-auto text-rose mb-2" />
                  <p className="text-[13px] font-semibold text-fg">{doc?.filename || "Medical PDF Document"}</p>
                  <p className="text-[11.5px] text-faint mt-1">Stored securely in Supabase storage</p>
                </div>
              ) : (
                <div className="relative h-[220px] overflow-hidden rounded-xl md:h-[280px] bg-black/40">
                  <Image
                    src={originalDocUrl}
                    alt={doc?.title || "Prescription Scan"}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                  />
                </div>
              )}
            </div>
          )}

          <FullReport payload={payload} mode={payload.meta.mode} analysisId={analysis.id} />

          {payload.meta.visionNote && (
            <p className="mt-6 rounded-xl border border-line bg-panel2/40 p-4 text-center font-mono2 text-[10.5px] uppercase tracking-[0.14em] text-faint">
              {payload.meta.visionNote}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
