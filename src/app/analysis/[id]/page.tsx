import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { analyses, documents, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight, FileScan } from "lucide-react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { FullReport } from "@/components/analyze/results";

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

  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-24 pt-[104px] md:pt-[120px]">
        <div className="grid-bg absolute inset-x-0 top-0 h-[460px]" />
        <div className="glow-orb absolute -right-40 top-40 h-[400px] w-[400px] bg-[#a78bfa0e]" />

        <div className="relative mx-auto max-w-5xl px-5 md:px-8">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 font-mono2 text-[11px] uppercase tracking-[0.22em] text-dim transition-colors hover:text-mint"
          >
            <ArrowLeft size={13} /> back to vault
          </Link>

          <div className="mb-10 mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="eyebrow">saved report</span>
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
                {payload.meta.mode === "demo" && (
                  <span className="rounded border border-amber/30 px-1.5 py-0.5 text-amber">demo corpus</span>
                )}
              </p>
            </div>
            <Link href="/analyze" className="btn btn-primary h-11 px-5 text-[13px]">
              New analysis <ArrowRight size={14} />
            </Link>
          </div>

          {doc?.imageSrc && (
            <div className="glass mb-8 overflow-hidden rounded-[22px] p-3">
              <div className="relative h-[220px] overflow-hidden rounded-xl md:h-[280px]">
                <Image
                  src={doc.imageSrc}
                  alt={doc.title}
                  fill
                  className="object-cover object-top opacity-85"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04120f88] via-transparent to-transparent" />
              </div>
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
