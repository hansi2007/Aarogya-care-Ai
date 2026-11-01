import Link from "next/link";
import { db } from "@/db";
import { analyses, documents, runs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  FlaskConical,
  History as HistoryIcon,
  Pill,
  Radar,
  ScanSearch,
} from "lucide-react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prescription History Vault — AarogyaCare AI" };

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-mint/12 text-mint",
  running: "bg-cy/12 text-cy",
  queued: "bg-cy/12 text-cy",
  failed: "bg-rose/12 text-rose",
};

export default async function HistoryPage() {
  const rows = await db
    .select({
      id: runs.id,
      title: runs.title,
      status: runs.status,
      mode: runs.mode,
      summaryLine: runs.summaryLine,
      createdAt: runs.createdAt,
      documentKind: documents.kind,
      analysisId: analyses.id,
      medCount: analyses.medCount,
      interactionCount: analyses.interactionCount,
    })
    .from(runs)
    .leftJoin(documents, eq(runs.documentId, documents.id))
    .leftJoin(analyses, eq(analyses.runId, runs.id))
    .orderBy(desc(runs.createdAt))
    .limit(60);

  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-24 pt-[104px] md:pt-[120px]">
        <div className="grid-bg absolute inset-x-0 top-0 h-[460px]" />
        <div className="glow-orb absolute -left-40 top-24 h-[400px] w-[400px] bg-[#2ee6c00e]" />

        <div className="relative mx-auto max-w-5xl px-5 md:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow">the vault</span>
              <h1 className="h-display mt-5 text-[clamp(2rem,4.5vw,3.2rem)] text-fg">
                Analysis <span className="text-grad">history.</span>
              </h1>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-dim">
                Every decoded document, saved. Revisit full reports any time — they&apos;re stored
                in your own database, nowhere else.
              </p>
            </div>
            <Link href="/analyze" className="btn btn-primary h-11 px-5 text-[13px]">
              <ScanSearch size={15} /> New analysis
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="glass noise flex flex-col items-center justify-center rounded-[22px] px-8 py-24 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-panel2/60 text-mint">
                <HistoryIcon size={26} />
              </span>
              <h2 className="mt-6 font-display text-xl font-bold text-fg">Nothing here yet</h2>
              <p className="mt-2 max-w-sm text-[14px] text-dim">
                Run your first document through the agent team and it will appear in this vault.
              </p>
              <Link href="/analyze" className="btn btn-primary mt-8 h-11 px-6 text-[14px]">
                Deploy the agents <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((r) => {
                const body = (
                  <div className="glass card-hover group flex h-full flex-col rounded-[20px] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono2 text-[9.5px] uppercase tracking-[0.16em] ${STATUS_STYLE[r.status] ?? STATUS_STYLE.queued}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {r.status}
                      </span>
                      <span className="font-mono2 text-[10px] text-faint">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString(undefined, {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    <h3 className="m-0 mt-4 truncate font-display text-[16px] font-bold text-fg">
                      {r.title}
                    </h3>
                    <p className="m-0 mt-1.5 truncate text-[12.5px] text-dim">
                      {r.summaryLine ?? "Awaiting agent report…"}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="chip font-mono2 text-[9.5px]">
                        {(r.documentKind ?? "doc").toUpperCase()}
                      </span>
                      {r.mode && (
                        <span
                          className={`chip font-mono2 text-[9.5px] ${r.mode === "demo" ? "border-amber/25 text-amber" : "border-mint/25 text-mint"}`}
                        >
                          {r.mode.toUpperCase()}
                        </span>
                      )}
                      {!!r.medCount && (
                        <span className="chip gap-1.5 font-mono2 text-[9.5px]">
                          <Pill size={10} className="text-cy" /> {r.medCount} meds
                        </span>
                      )}
                      {!!r.interactionCount && (
                        <span className="chip gap-1.5 font-mono2 text-[9.5px]">
                          <Radar size={10} className="text-amber" /> {r.interactionCount} flags
                        </span>
                      )}
                    </div>
                    {r.analysisId && (
                      <span className="mt-5 inline-flex items-center gap-1.5 font-mono2 text-[10px] uppercase tracking-[0.2em] text-mint opacity-80 transition-all group-hover:gap-2.5 group-hover:opacity-100">
                        open report <ArrowRight size={11} />
                      </span>
                    )}
                  </div>
                );
                return r.analysisId ? (
                  <Link key={r.id} href={`/analysis/${r.analysisId}`}>
                    {body}
                  </Link>
                ) : (
                  <div key={r.id} className="opacity-70">
                    {body}
                  </div>
                );
              })}
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-10 flex items-center gap-3 rounded-2xl border border-line bg-panel2/40 p-4">
              <FlaskConical size={15} className="shrink-0 text-mint" />
              <p className="m-0 text-[12.5px] text-dim">
                Reports are stored locally in PostgreSQL with the full agent event trail —
                including which data source (live NIH/FDA vs. reference) powered each medicine card.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
