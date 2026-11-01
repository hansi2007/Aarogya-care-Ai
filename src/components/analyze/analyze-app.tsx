"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileType2, RotateCcw, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Intake, { type IntakePayload } from "./intake";
import AgentConsole, { applyEvent, emptyConsole, type ConsoleState } from "./agent-console";
import {
  AudioGuidePlayer,
  DoctorQuestionsPanel,
  EnrichedPanel,
  InteractiveCompanionChat,
  PlainPanel,
  Reveal,
  RoutineSchedulePanel,
  SafetyPanel,
  StructuredPanel,
} from "./results";
import type {
  AnalysisPayload,
  DoctorQuestion,
  EnrichedMed,
  Interaction,
  PlainSummary,
  RoutineSlot,
  RunEvent,
  StructuredRx,
} from "@/lib/medical/types";

type Phase = "idle" | "submitting" | "streaming" | "done" | "error";

interface LiveData {
  rawText?: string;
  structured?: StructuredRx;
  enriched: EnrichedMed[];
  plain?: PlainSummary;
  interactions?: Interaction[];
  routine?: RoutineSlot[];
  doctorQuestions?: DoctorQuestion[];
  analysisId?: string;
  mode?: string;
  summaryLine?: string;
}

const emptyLive = (): LiveData => ({ enriched: [] });

export default function AnalyzeApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cons, setCons] = useState<ConsoleState>(emptyConsole());
  const [live, setLive] = useState<LiveData>(emptyLive());
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());
  const esRef = useRef<EventSource | null>(null);

  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("runId");

  const handleEvent = useCallback((raw: string) => {
    let msg: { type: string; event?: RunEvent; status?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === "event" && msg.event) {
      const ev = msg.event;
      setCons((c) => applyEvent(c, ev));
      const p = ev.payload as any;
      if (!p?.type) return;
      setLive((L) => {
        switch (p.type) {
          case "rawText":
            return { ...L, rawText: p.rawText };
          case "structured":
            return { ...L, structured: p.structured };
          case "enriched":
            return {
              ...L,
              enriched: [...L.enriched.filter((e) => e.medId !== p.med.medId), p.med].sort((a, b) =>
                a.medId.localeCompare(b.medId),
              ),
            };
          case "plain":
            return { ...L, plain: p.plain };
          case "safety":
            return { ...L, interactions: p.interactions as Interaction[] };
          case "routine":
            return { ...L, routine: p.routine, doctorQuestions: p.doctorQuestions };
          case "done":
            return { ...L, analysisId: p.analysisId };
          default:
            return L;
        }
      });
    }
    if (msg.type === "run") {
      esRef.current?.close();
      esRef.current = null;
      setPhase(msg.status === "completed" ? "done" : "error");
      setCons((c) => ({ ...c, running: false, failed: msg.status === "failed" }));
    }
  }, []);

  // Automatically attach to runId if provided in URL query parameters
  useEffect(() => {
    if (!runIdParam) return;
    let active = true;

    async function attachToRun() {
      try {
        setPhase("submitting");
        const res = await fetch(`/api/runs/${runIdParam}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;

        if (data.analysis?.payload) {
          const payload = data.analysis.payload;
          setLive({
            rawText: payload.rawText,
            structured: payload.structured,
            enriched: payload.enriched || [],
            plain: payload.plain,
            interactions: payload.interactions || [],
            routine: payload.routine || [],
            doctorQuestions: payload.doctorQuestions || [],
            analysisId: data.analysis.id,
            mode: data.run?.mode,
            summaryLine: data.run?.summaryLine,
          });
          setPhase("done");
          setCons((c) => ({ ...c, running: false, failed: false }));
          if (data.document?.base64) {
            setPreviewSrc(`data:${data.document.mime || "image/png"};base64,${data.document.base64}`);
            setIsPdf(data.document.kind === "pdf" || data.document.mime === "application/pdf");
          } else if (data.document?.imageSrc) {
            setPreviewSrc(data.document.imageSrc);
          }
        } else {
          // Live streaming if run is still in-progress
          setPhase("streaming");
          const es = new EventSource(`/api/runs/${runIdParam}/events`);
          esRef.current = es;
          es.onmessage = (e) => handleEvent(e.data);
          es.onerror = () => {
            es.close();
            setPhase((p) => (p === "done" ? p : "error"));
          };
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to load run session");
          setPhase("error");
        }
      }
    }

    attachToRun();
    return () => {
      active = false;
    };
  }, [runIdParam, handleEvent]);

  const start = useCallback(
    async (payload: IntakePayload) => {
      setPhase("submitting");
      setError(null);
      setCons({ ...emptyConsole(), running: true });
      setLive(emptyLive());
      startedAt.current = Date.now();

      setPreviewSrc(payload.kind === "text" ? null : (payload.previewSrc ?? null));
      setIsPdf(payload.kind === "file" && payload.file.type === "application/pdf");

      try {
        let res: Response;
        if (payload.kind === "file") {
          const fd = new FormData();
          fd.append("file", payload.file);
          res = await fetch("/api/documents", { method: "POST", body: fd });
        } else if (payload.kind === "sample") {
          res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "sample", sampleId: payload.sampleId }),
          });
        } else {
          res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "text", text: payload.text, title: payload.title }),
          });
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "intake failed");
        const runId: string = data.runId;
        setPhase("streaming");
        const es = new EventSource(`/api/runs/${runId}/events`);
        esRef.current = es;
        es.onmessage = (e) => handleEvent(e.data);
        es.onerror = () => {
          es.close();
          setPhase((p) => (p === "done" ? p : "error"));
          setCons((c) => ({ ...c, running: false }));
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("error");
        setCons((c) => ({ ...c, running: false, failed: true }));
      }
    },
    [handleEvent],
  );

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setPhase("idle");
    setCons(emptyConsole());
    setLive(emptyLive());
    setPreviewSrc(null);
    setIsPdf(false);
    setError(null);
  }, []);

  const busy = phase === "submitting" || phase === "streaming";
  const rx = live.structured;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
      {/* ------------------------------- left: intake + document view */}
      <div className="space-y-5 lg:sticky lg:top-24">
        <Intake onDeploy={start} disabled={busy} />

        <AnimatePresence>
          {(busy || phase === "done") && previewSrc && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="glass relative overflow-hidden rounded-[22px] p-3"
            >
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previewSrc.startsWith("/samples") ? (
                  <Image src={previewSrc} alt="document" width={500} height={620} className="h-auto w-full object-cover opacity-90" />
                ) : (
                  <img src={previewSrc} alt="document" className="max-h-[300px] w-full object-cover opacity-90" />
                )}
                {busy && <span className="scan-beam" />}
              </div>
              <div className="flex items-center justify-between px-2 pt-2.5">
                <span className="font-mono2 text-[9.5px] uppercase tracking-[0.22em] text-faint">document under analysis</span>
                {busy && (
                  <span className="flex items-center gap-1.5 font-mono2 text-[9.5px] uppercase tracking-[0.18em] text-mint">
                    <ScanLine size={10} className="breathe" /> scanning
                  </span>
                )}
              </div>
            </motion.div>
          )}
          {busy && isPdf && (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass flex items-center gap-4 rounded-[22px] p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose/12 text-rose">
                <FileType2 size={20} />
              </span>
              <div>
                <p className="m-0 font-display text-[14px] font-semibold text-fg">PDF under analysis</p>
                <p className="m-0 mt-0.5 text-[12px] text-dim">Extracting the embedded text layer…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------- right: console + results */}
      <div className="min-w-0 space-y-6">
        {phase === "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass noise flex min-h-[420px] flex-col items-center justify-center rounded-[22px] p-10 text-center"
          >
            <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
              <span className="spin-slower absolute inset-0 rounded-full border border-dashed border-mint/25" />
              <span className="spin-slowest absolute inset-2.5 rounded-full border border-cy/20" />
              <ScanLine size={30} className="text-mint breathe" />
            </div>
            <p className="eyebrow no-tick justify-center">awaiting document</p>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-dim">
              Pick a sample, upload a photo or PDF, or paste the text. The four agents will take it
              from there — you watch everything live on the operations deck.
            </p>
          </motion.div>
        )}

        {phase !== "idle" && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <AgentConsole state={cons} startedAt={startedAt.current} />
          </motion.div>
        )}

        {phase === "error" && (
          <div className="rounded-2xl border border-rose/30 bg-rose/[0.07] p-5">
            <p className="m-0 font-display text-[15px] font-semibold text-rose">The pipeline hit a snag</p>
            <p className="m-0 mt-1 text-[13px] text-dim">
              {error ?? "An agent failed mid-run. Your document is safe — try re-deploying."}
            </p>
            <button onClick={reset} className="btn btn-ghost mt-4 h-10 px-4 text-[13px]">
              <RotateCcw size={14} /> Try again
            </button>
          </div>
        )}

        {/* progressive results */}
        {rx && (
          <Reveal>
            <StructuredPanel rx={rx} rawText={live.rawText ?? ""} mode={live.mode} />
          </Reveal>
        )}
        {live.enriched.length > 0 && (
          <Reveal>
            <EnrichedPanel meds={mergeOrder(rx, live.enriched)} />
          </Reveal>
        )}
        {live.plain && (
          <Reveal>
            <PlainPanel plain={rebuildPlain(live)} />
          </Reveal>
        )}
        {live.interactions && (
          <Reveal>
            <SafetyPanel interactions={live.interactions} />
          </Reveal>
        )}
        {live.routine && live.routine.length > 0 && (
          <Reveal>
            <RoutineSchedulePanel routine={live.routine} />
          </Reveal>
        )}
        {live.doctorQuestions && live.doctorQuestions.length > 0 && (
          <Reveal>
            <DoctorQuestionsPanel questions={live.doctorQuestions} />
          </Reveal>
        )}
        {phase === "done" && live.plain && (
          <Reveal>
            <InteractiveCompanionChat
              payload={{
                rawText: live.rawText ?? "",
                structured: rx ?? { conditions: [], medicines: [], labs: [] },
                enriched: live.enriched,
                interactions: live.interactions ?? [],
                plain: live.plain,
                routine: live.routine,
                doctorQuestions: live.doctorQuestions,
                meta: { mode: "demo", agentsRun: [] },
              }}
              analysisId={live.analysisId}
            />
          </Reveal>
        )}

        {phase === "done" && live.analysisId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass noise flex flex-col items-center justify-between gap-4 rounded-[22px] p-6 sm:flex-row"
          >
            <div>
              <p className="m-0 font-display text-[17px] font-bold text-fg">Report saved to your vault</p>
              <p className="m-0 mt-1 text-[13px] text-dim">
                This analysis is stored and can be revisited any time — share the link with family.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link href={`/analysis/${live.analysisId}`} className="btn btn-primary h-11 px-5 text-[13px]">
                Open full report <ArrowRight size={14} />
              </Link>
              <button onClick={reset} className="btn btn-ghost h-11 px-5 text-[13px]">
                <RotateCcw size={14} /> New analysis
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function mergeOrder(rx: StructuredRx | undefined, enriched: EnrichedMed[]): EnrichedMed[] {
  if (!rx) return enriched;
  const order = new Map(rx.medicines.map((m, i) => [m.id, i]));
  return [...enriched].sort((a, b) => (order.get(a.medId) ?? 99) - (order.get(b.medId) ?? 99));
}

/** merge interactions into the plain summary once the safety sweep lands */
function rebuildPlain(live: LiveData): PlainSummary {
  const base = live.plain as PlainSummary;
  const extra = (live.interactions ?? [])
    .slice(0, 2)
    .map((i) => i.plain ?? i.description);
  const merged = [...extra, ...base.watchOut.filter((w) => !extra.includes(w))];
  return { ...base, watchOut: merged.slice(0, 6) };
}
