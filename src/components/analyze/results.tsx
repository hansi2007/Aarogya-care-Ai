"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FileScan,
  FileText,
  FlaskConical,
  Globe2,
  HeartPulse,
  HelpCircle,
  Languages,
  Lightbulb,
  MessageCircle,
  Pause,
  Pill,
  Play,
  Printer,
  Radar,
  RotateCcw,
  ScanSearch,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Timer,
  UserRound,
  Utensils,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  AnalysisPayload,
  DoctorQuestion,
  EnrichedMed,
  Interaction,
  LabValue,
  Medicine,
  PlainSummary,
  RoutineSlot,
  StructuredRx,
} from "@/lib/medical/types";

const ease = [0.22, 1, 0.36, 1] as const;

export function SectionHeader({
  num,
  icon: Icon,
  title,
  sub,
  color,
}: {
  num: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
        style={{ background: `${color}12`, borderColor: `${color}33`, color }}
      >
        <Icon size={18} />
      </span>
      <div>
        <p className="m-0 font-mono2 text-[10px] uppercase tracking-[0.3em]" style={{ color }}>
          section {num}
        </p>
        <h3 className="m-0 mt-1 font-display text-[22px] font-bold tracking-tight text-fg">{title}</h3>
        <p className="m-0 mt-1 text-[13px] text-dim">{sub}</p>
      </div>
    </div>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------ dose-dot visualiser */
function DoseDots({ perDay }: { perDay?: [number, number, number] }) {
  if (!perDay) return null;
  const labels = ["M", "A", "N"];
  return (
    <span className="inline-flex items-center gap-1.5">
      {perDay.map((v, i) => (
        <span key={i} className="flex flex-col items-center gap-0.5">
          <span
            className={`h-2.5 w-2.5 rounded-full border ${
              v > 0 ? "border-mint bg-mint shadow-[0_0_8px_rgba(46,230,192,0.6)]" : "border-faint/50 bg-transparent"
            }`}
          />
          <span className="font-mono2 text-[8px] text-faint">{labels[i]}</span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------ AUDIO GUIDANCE PLAYER */
export function AudioGuidePlayer({ payload }: { payload: AnalysisPayload }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setHasSpeech(true);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const buildSpeechText = () => {
    let text = `Here is your Aarogya Care plain English prescription guidance. `;
    if (payload.plain?.headline) text += `${payload.plain.headline}. `;
    if (payload.plain?.overview) text += `${payload.plain.overview}. `;

    if (payload.routine && payload.routine.length > 0) {
      text += `Your daily medicine routine: `;
      for (const slot of payload.routine) {
        text += `${slot.title}: `;
        for (const m of slot.meds) {
          text += `Take ${m.name}. ${m.instructions}. `;
        }
      }
    }

    if (payload.plain?.watchOut?.length) {
      text += `Important safety precautions: `;
      for (const w of payload.plain.watchOut.slice(0, 3)) {
        text += `${w}. `;
      }
    }

    text += `Remember to take your medicines on time and consult your doctor if you experience any unusual symptoms.`;
    return text;
  };

  const togglePlay = () => {
    if (!hasSpeech) return;
    const synth = window.speechSynthesis;

    if (isPlaying && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(buildSpeechText());
    utter.rate = 0.95;
    utter.pitch = 1.0;

    utter.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utter.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utter.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    synth.speak(utter);
  };

  const stopAudio = () => {
    if (!hasSpeech) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  if (!hasSpeech) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mint/30 bg-gradient-to-r from-mint/10 via-panel2/60 to-cy/10 p-4 md:p-5 shadow-lg">
      <div className="flex items-center gap-3.5">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint/15 text-mint border border-mint/30">
          <Volume2 size={20} className={isPlaying && !isPaused ? "animate-pulse" : ""} />
          {isPlaying && !isPaused && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-mint animate-ping" />
          )}
        </span>
        <div>
          <p className="m-0 font-display text-[15px] font-bold text-fg flex items-center gap-2">
            Audio Prescription Reader
            <span className="rounded-md bg-mint/20 px-2 py-0.5 font-mono2 text-[9.5px] uppercase tracking-wider text-mint">
              Voice Readout
            </span>
          </p>
          <p className="m-0 text-[12.5px] text-dim">
            {isPlaying && !isPaused
              ? "Reading out your medicines, timings, and safety guidance..."
              : isPaused
                ? "Audio playback paused. Click resume to continue listening."
                : "Listen to your prescription instructions spoken aloud in clear, simple English."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="btn btn-primary h-10 px-4 text-[13px] flex items-center gap-2"
        >
          {isPlaying && !isPaused ? (
            <>
              <Pause size={15} /> Pause audio
            </>
          ) : isPaused ? (
            <>
              <Play size={15} /> Resume audio
            </>
          ) : (
            <>
              <Play size={15} /> Listen to guidance
            </>
          )}
        </button>

        {isPlaying && (
          <button
            onClick={stopAudio}
            className="btn btn-ghost h-10 px-3 text-[13px] text-rose hover:bg-rose/10"
            title="Stop audio"
          >
            <VolumeX size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------ section 01: STRUCTURED */
export function StructuredPanel({ rx, rawText, mode }: { rx: StructuredRx; rawText: string; mode?: string }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="glass rounded-[22px] p-6 md:p-8">
      <SectionHeader
        num="01"
        icon={FileScan}
        color="#38E0C8"
        title="Doctor & Clinical Extraction"
        sub="LUMEN decoded the prescription document and transcribed all clinical entities."
      />

      {(rx.doctor || rx.patient) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {rx.doctor && (
            <span className="chip">
              <Stethoscope size={12} className="text-mint" /> {rx.doctor}
            </span>
          )}
          {rx.patient && (
            <span className="chip">
              <UserRound size={12} className="text-cy" /> For {rx.patient}
            </span>
          )}
          {mode === "demo" && (
            <span className="chip border-amber/30 text-amber">verified clinical sample</span>
          )}
        </div>
      )}

      {rx.conditions.length > 0 && (
        <div className="mb-7">
          <p className="m-0 mb-3 font-mono2 text-[10px] uppercase tracking-[0.26em] text-faint">diagnosed / reported conditions</p>
          <div className="flex flex-wrap gap-2">
            {rx.conditions.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-2 rounded-xl border border-viol/25 bg-viol/10 px-3.5 py-2 text-[13px] text-fg"
              >
                <Activity size={13} className="text-viol" />
                <span className="font-semibold text-mintsoft">{c.name}</span>
                <span className="text-dim">— {c.plain}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {rx.medicines.length > 0 && (
        <div className="mb-2">
          <p className="m-0 mb-3 font-mono2 text-[10px] uppercase tracking-[0.26em] text-faint">
            extracted medicines · {rx.medicines.length}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {rx.medicines.map((m, i) => (
              <MedStructCard key={m.id} m={m} i={i} />
            ))}
          </div>
        </div>
      )}

      {rx.labs.length > 0 && <LabsTable labs={rx.labs} />}

      <button
        onClick={() => setShowRaw((s) => !s)}
        className="mt-6 flex items-center gap-2 font-mono2 text-[11px] uppercase tracking-[0.22em] text-faint transition-colors hover:text-mint"
      >
        <ChevronDown size={14} className={`transition-transform duration-300 ${showRaw ? "rotate-180" : ""}`} />
        {showRaw ? "hide" : "view"} raw OCR transcription
      </button>
      {showRaw && (
        <motion.pre
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.5, ease }}
          className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-[#050b12] p-5 font-mono2 text-[11.5px] leading-relaxed text-dim"
        >
          {rawText}
        </motion.pre>
      )}
    </div>
  );
}

function MedStructCard({ m, i }: { m: Medicine; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07, duration: 0.55, ease }}
      className="card-hover rounded-2xl border border-line bg-panel2/60 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint/12 text-mint">
            <Pill size={16} />
          </span>
          <div>
            <p className="m-0 font-display text-[15px] font-semibold text-fg">
              {m.name}
              {m.strength && <span className="text-mintsoft"> {m.strength}</span>}
            </p>
            <p className="m-0 font-mono2 text-[9.5px] uppercase tracking-[0.18em] text-faint">
              {m.form}
              {m.prn ? " · sos / when needed" : ""}
            </p>
          </div>
        </div>
        <DoseDots perDay={m.perDay} />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
        {m.sigCode && (
          <span className="rounded-md border border-cy/25 bg-cy/10 px-2 py-0.5 font-mono2 text-[11px] text-cy">
            {m.sigCode}
            {m.frequency ? ` → ${m.frequency}` : ""}
          </span>
        )}
        {!m.sigCode && m.frequency && (
          <span className="rounded-md border border-cy/25 bg-cy/10 px-2 py-0.5 font-mono2 text-[11px] text-cy">
            {m.frequency}
          </span>
        )}
        {m.timing && (
          <span className="flex items-center gap-1 text-dim">
            <Timer size={11} className="text-amber" /> {m.timing}
          </span>
        )}
        {m.durationDays && (
          <span className="flex items-center gap-1 text-dim">
            <CalendarClock size={11} className="text-viol" /> {m.durationDays} days
          </span>
        )}
      </div>

      {m.notes && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed ${
            m.notes.includes("Warning") || m.notes.includes("uncertain") || m.notes.includes("⚠️")
              ? "border-amber/40 bg-amber/10 text-amber font-medium"
              : "border-line bg-panel2/80 text-dim"
          }`}
        >
          {m.notes}
        </div>
      )}
    </motion.div>
  );
}

function LabsTable({ labs }: { labs: LabValue[] }) {
  return (
    <div className="mt-6">
      <p className="m-0 mb-3 font-mono2 text-[10px] uppercase tracking-[0.26em] text-faint">
        lab results · {labs.length}
      </p>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-panel2/70 font-mono2 text-[9.5px] uppercase tracking-[0.2em] text-faint">
              <th className="px-4 py-2.5 font-medium">test</th>
              <th className="px-4 py-2.5 font-medium">result</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">reference</th>
              <th className="px-4 py-2.5 font-medium">flag</th>
            </tr>
          </thead>
          <tbody>
            {labs.map((l, i) => (
              <motion.tr
                key={l.test + i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease }}
                className="border-b border-line/60 last:border-0"
              >
                <td className="px-4 py-2.5 text-fg">{l.test}</td>
                <td className="px-4 py-2.5 font-mono2 text-[12px] text-mintsoft">
                  {l.value}
                  {l.unit && <span className="ml-1 text-faint">{l.unit}</span>}
                </td>
                <td className="hidden px-4 py-2.5 font-mono2 text-[11.5px] text-dim sm:table-cell">{l.ref ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {l.flag ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono2 text-[10px] font-medium ${
                        l.flag === "H"
                          ? "bg-rose/12 text-rose"
                          : "bg-cy/12 text-cy"
                      }`}
                    >
                      {l.flag === "H" ? "HIGH ▲" : "LOW ▼"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-mint/10 px-2 py-0.5 font-mono2 text-[10px] text-mint">
                      NORMAL
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------ section 02: ENRICHED */
export function EnrichedPanel({ meds }: { meds: EnrichedMed[] }) {
  if (!meds.length) return null;
  return (
    <div className="glass rounded-[22px] p-6 md:p-8">
      <SectionHeader
        num="02"
        icon={Globe2}
        color="#5AB2FF"
        title="Medicine Intelligence & Verification"
        sub="MEDSCOPE cross-referenced NIH RxNav and openFDA label databases for clinical properties."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {meds.map((e, i) => (
          <motion.div
            key={e.medId}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.6, ease }}
            className="card-hover flex h-full flex-col rounded-2xl border border-line bg-panel2/60 p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="m-0 font-display text-[16px] font-bold text-fg">{e.genericName ?? e.name}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono2 text-[9.5px] uppercase tracking-[0.12em] ${
                  e.fetchedLive ? "bg-mint/12 text-mint" : "bg-amber/12 text-amber"
                }`}
              >
                <Globe2 size={10} />
                {e.fetchedLive ? "live · nih/fda" : "clinical reference"}
              </span>
              {e.rxcui && (
                <span className="rounded-md border border-line px-2 py-0.5 font-mono2 text-[9.5px] text-faint">
                  RxCUI {e.rxcui}
                </span>
              )}
            </div>
            {e.drugClass && (
              <p className="m-0 mt-1.5 font-mono2 text-[10px] uppercase tracking-[0.18em] text-cy">
                {e.drugClass}
                {e.classPlain ? ` · ${e.classPlain}` : ""}
              </p>
            )}
            {e.usesPlain && <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-fg/90">{e.usesPlain}</p>}
            {e.howItWorks && <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-dim">{e.howItWorks}</p>}

            {e.sideEffects.length > 0 && (
              <div className="mt-4">
                <p className="m-0 mb-2 font-mono2 text-[9px] uppercase tracking-[0.22em] text-faint">common side effects</p>
                <div className="flex flex-wrap gap-1.5">
                  {e.sideEffects.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-md bg-[#12212f] px-2 py-1 text-[11px] text-dim">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {e.warnings.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {e.warnings.slice(0, 3).map((w) => (
                  <p key={w} className="m-0 flex items-start gap-2 text-[12px] leading-snug text-amber/90">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}

            {e.tips.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                {e.tips.slice(0, 2).map((t) => (
                  <p key={t} className="m-0 flex items-start gap-2 text-[12px] leading-snug text-mintsoft/90">
                    <Lightbulb size={11} className="mt-0.5 shrink-0 text-mint" /> {t}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------ section 03: PLAIN ENGLISH */
export function PlainPanel({ plain }: { plain: PlainSummary }) {
  const stepIcons = { med: Pill, advice: Lightbulb, lab: FlaskConical } as const;
  return (
    <div className="glass noise relative overflow-hidden rounded-[22px] p-6 md:p-9">
      <div className="glow-orb absolute -right-20 -top-20 h-64 w-64 bg-[#a78bfa14]" />
      <SectionHeader
        num="03"
        icon={Languages}
        color="#A78BFA"
        title="In Simple English (Easy Patient Guide)"
        sub="PLAINWORDS translated medical jargon into clear everyday language."
      />

      <h4 className="h-display m-0 max-w-2xl text-[clamp(1.5rem,3vw,2.3rem)] text-fg">
        {plain.headline}
      </h4>
      <p className="mt-4 max-w-3xl text-[15px] leading-[1.75] text-fg/85">{plain.overview}</p>

      {plain.steps.length > 0 && (
        <div className="mt-8 space-y-3">
          {plain.steps.map((s, i) => {
            const Icon = stepIcons[s.kind];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.09, duration: 0.55, ease }}
                className="flex gap-4 rounded-2xl border border-line bg-panel2/60 p-4"
              >
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-viol/14 text-viol">
                    <Icon size={15} />
                  </span>
                  {i < plain.steps.length - 1 && (
                    <span className="mt-2 w-px flex-1 bg-gradient-to-b from-viol/30 to-transparent" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="m-0 font-display text-[14.5px] font-semibold text-fg">{s.title}</p>
                  <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-dim">{s.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {plain.watchOut.length > 0 && (
        <div className="mt-8 rounded-2xl border border-amber/20 bg-amber/[0.06] p-5">
          <p className="m-0 mb-3 flex items-center gap-2 font-mono2 text-[10px] uppercase tracking-[0.26em] text-amber">
            <ShieldAlert size={13} /> things to watch out for
          </p>
          <ul className="m-0 list-none space-y-2 p-0">
            {plain.watchOut.slice(0, 5).map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-fg/80">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber/70" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plain.glossary.length > 0 && (
        <div className="mt-8">
          <p className="m-0 mb-3 flex items-center gap-2 font-mono2 text-[10px] uppercase tracking-[0.26em] text-faint">
            <BookOpenText size={12} className="text-viol" /> medical abbreviation decoder
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plain.glossary.map((g, i) => (
              <motion.div
                key={g.term}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.4, ease }}
                className="rounded-xl border border-line bg-panel2/50 px-3.5 py-2.5"
              >
                <span className="font-mono2 text-[11px] font-semibold text-mint">{g.term}</span>
                <span className="ml-2 text-[12px] text-dim">= {g.meaning}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------ section 04: SAFETY RADAR */
const SEV_STYLE = {
  high: { color: "#FF6E8D", label: "HIGH RISK", icon: ShieldAlert },
  moderate: { color: "#FFB454", label: "MODERATE", icon: AlertTriangle },
  low: { color: "#58B7F8", label: "LOW RISK", icon: AlertTriangle },
} as const;

export function SafetyPanel({ interactions }: { interactions: Interaction[] }) {
  const clean = interactions.length === 0;
  return (
    <div className="glass rounded-[22px] p-6 md:p-8">
      <SectionHeader
        num="04"
        icon={Radar}
        color="#FFB454"
        title="Drug Interaction & Safety Radar"
        sub="GUARDIAN scanned all medicine pairs for dangerous contraindications & adverse cross-effects."
      />

      {clean ? (
        <div className="flex items-center gap-4 rounded-2xl border border-mint/25 bg-mint/[0.06] p-5">
          <span className="ring-pulse flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint/15 text-mint">
            <ShieldCheck size={22} />
          </span>
          <div>
            <p className="m-0 font-display text-[16px] font-semibold text-fg">
              Safe Sweep: No Critical Drug Interactions Detected
            </p>
            <p className="m-0 mt-1 text-[13px] text-dim">
              All prescribed medicine pairs cleared NIH RxNav interaction graphs and duplicate therapy rules. Always confirm with your pharmacist.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((it, i) => {
            const s = SEV_STYLE[it.severity];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease }}
                className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-start sm:gap-4"
                style={{ borderColor: `${s.color}2e`, background: `${s.color}08` }}
              >
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono2 text-[10px] font-semibold tracking-[0.14em]"
                  style={{ background: `${s.color}18`, color: s.color }}
                >
                  <s.icon size={11} />
                  {s.label}
                </span>
                <div>
                  <p className="m-0 font-display text-[14px] font-semibold text-fg">
                    {it.drugA} <span className="text-faint">×</span> {it.drugB}
                  </p>
                  <p className="m-0 mt-1 text-[13px] leading-relaxed text-dim">
                    {it.plain ?? it.description}
                  </p>
                  <p className="m-0 mt-2 font-mono2 text-[9.5px] uppercase tracking-[0.18em] text-faint">
                    source: {it.source === "rxnav" ? "NIH RxNav · live database" : "clinical interaction rule engine"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------ section 05: DAILY TIMETABLE */
const SLOT_ICONS = {
  morning: Sunrise,
  noon: Sun,
  evening: Sunset,
  bedtime: Moon,
  weekly: CalendarCheck,
};

export function RoutineSchedulePanel({ routine }: { routine?: RoutineSlot[] }) {
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  if (!routine || routine.length === 0) return null;

  const toggleCheck = (id: string) => {
    setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalDoses = routine.reduce((sum, s) => sum + s.meds.length, 0);
  const completedDoses = Object.values(checkedMap).filter(Boolean).length;

  return (
    <div className="glass rounded-[22px] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <SectionHeader
          num="05"
          icon={CalendarClock}
          color="#4ADE80"
          title="Daily Visual Medicine Schedule"
          sub="SATHI organized your doses into clear morning, noon, and bedtime pill boxes."
        />
        <div className="rounded-xl border border-line bg-panel2/70 px-4 py-2.5 text-right">
          <p className="m-0 font-mono2 text-[10px] uppercase tracking-[0.2em] text-faint">today&apos;s adherence</p>
          <p className="m-0 font-display text-[16px] font-bold text-mint">
            {completedDoses} / {totalDoses} doses taken
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {routine.map((slot, sIdx) => {
          const SlotIcon = SLOT_ICONS[slot.slot] || Clock;
          return (
            <motion.div
              key={slot.title + sIdx}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.08, duration: 0.5, ease }}
              className="rounded-2xl border border-line bg-panel2/50 overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 bg-panel/60 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/12 text-mint">
                    <SlotIcon size={16} />
                  </span>
                  <div>
                    <h4 className="m-0 font-display text-[14.5px] font-bold text-fg">{slot.title}</h4>
                    <p className="m-0 font-mono2 text-[10px] text-faint">{slot.timeRange}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-lg border border-cy/25 bg-cy/10 px-2.5 py-1 text-[11px] text-cy font-mono2">
                  <Utensils size={11} />
                  {slot.foodRelation === "before_food"
                    ? "30 mins Before Food (AC)"
                    : slot.foodRelation === "after_food"
                      ? "Immediately After Food (PC)"
                      : slot.foodRelation === "with_food"
                        ? "Take With Meal"
                        : "Take with Water"}
                </span>
              </div>

              <div className="p-4 space-y-3">
                {slot.meds.map((m, mIdx) => {
                  const checkKey = `${slot.slot}-${m.name}-${mIdx}`;
                  const isChecked = Boolean(checkedMap[checkKey]);
                  return (
                    <div
                      key={checkKey}
                      onClick={() => toggleCheck(checkKey)}
                      className={`cursor-pointer transition-all flex items-start justify-between gap-3 rounded-xl border p-3.5 ${
                        isChecked
                          ? "border-mint/40 bg-mint/10 opacity-75"
                          : "border-line/70 bg-panel2/70 hover:border-mint/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isChecked
                              ? "border-mint bg-mint text-ink"
                              : "border-line bg-panel hover:border-mint"
                          }`}
                        >
                          {isChecked && <Check size={13} className="stroke-[3]" />}
                        </button>
                        <div>
                          <p
                            className={`m-0 font-display text-[14px] font-semibold ${
                              isChecked ? "line-through text-dim" : "text-fg"
                            }`}
                          >
                            {m.name}
                            <span className="ml-2 font-mono2 text-[11px] text-mintsoft font-normal">
                              {m.dosage}
                            </span>
                          </p>
                          <p className="m-0 mt-1 text-[12.5px] text-dim">{m.instructions}</p>
                          <p className="m-0 mt-1 font-mono2 text-[10px] text-faint">
                            Purpose: <span className="text-fg/80">{m.purpose}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------ section 06: DOCTOR CHECKLIST */
export function DoctorQuestionsPanel({ questions }: { questions?: DoctorQuestion[] }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!questions || questions.length === 0) return null;

  const copyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="glass rounded-[22px] p-6 md:p-8">
      <SectionHeader
        num="06"
        icon={HelpCircle}
        color="#38BDF8"
        title="Questions for Your Doctor on Next Visit"
        sub="Tailored questions based on your specific medicines & diagnoses to make your next consultation productive."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {questions.map((q, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-line bg-panel2/60 p-4 transition-colors hover:border-cy/30"
          >
            <div>
              <p className="m-0 font-display text-[13.5px] font-semibold text-fg leading-snug">
                &ldquo;{q.question}&rdquo;
              </p>
              <p className="m-0 mt-2 text-[12px] text-dim leading-relaxed">
                <span className="text-cy font-medium">Why to ask:</span> {q.reason}
              </p>
            </div>
            <button
              onClick={() => copyQuestion(q.question, idx)}
              className="mt-3 flex items-center gap-1.5 self-start font-mono2 text-[10px] uppercase tracking-wider text-faint transition-colors hover:text-mint"
            >
              {copiedIdx === idx ? (
                <>
                  <Check size={12} className="text-mint" /> Copied to clipboard
                </>
              ) : (
                <>
                  <Copy size={12} /> Copy question
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------ INTERACTIVE SATHI AI CHAT */
export function InteractiveCompanionChat({
  payload,
  analysisId,
}: {
  payload: AnalysisPayload;
  analysisId?: string;
}) {
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: `Hello! I'm Aarogya Sathi, your personal medical guide. I have reviewed your prescription${
        payload.structured?.medicines?.length ? ` with ${payload.structured.medicines.length} medicines` : ""
      }. Ask me anything about how to take your medicines, food/diet advice, missed doses, or side effects!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPills = [
    "Can I take my medicines with milk?",
    "What should I do if I miss a dose?",
    "Are there any foods or fruits I should avoid?",
    "Can I take Paracetamol for a headache?",
  ];

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || loading) return;

    const userMsg = { role: "user" as const, text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: textToSend,
          analysisId,
          prescriptionContext: payload,
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "I could not retrieve an answer right now. Please consult your physician or pharmacist.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I encountered a network issue. Please ensure your medicines are taken as scheduled on your timetable.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <div className="glass rounded-[22px] p-6 md:p-8">
      <SectionHeader
        num="07"
        icon={MessageCircle}
        color="#2EE6C0"
        title="Ask Aarogya Sathi (Interactive AI Guidance)"
        sub="Chat directly with your medical assistant about dosages, dietary tips, and medicine queries."
      />

      {/* Suggested prompts */}
      <div className="mb-4 flex flex-wrap gap-2">
        {quickPills.map((pill, i) => (
          <button
            key={i}
            onClick={() => handleSend(pill)}
            disabled={loading}
            className="rounded-full border border-mint/25 bg-mint/5 px-3.5 py-1.5 text-[12px] text-mintsoft transition-all hover:border-mint hover:bg-mint/15 hover:text-white disabled:opacity-50"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Chat scroll box */}
      <div
        ref={scrollRef}
        className="mb-4 max-h-[380px] min-h-[160px] overflow-y-auto space-y-3 rounded-2xl border border-line bg-[#040d14] p-4.5"
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-mint text-ink font-medium shadow-md"
                  : "border border-line/70 bg-panel2/80 text-fg"
              }`}
            >
              {m.role === "assistant" && (
                <div className="mb-1.5 flex items-center gap-1.5 font-mono2 text-[10px] uppercase tracking-wider text-mint">
                  <Sparkles size={11} /> Aarogya Sathi
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-line/70 bg-panel2/80 p-4 text-[13px] text-dim flex items-center gap-2">
              <Sparkles size={14} className="animate-spin text-mint" />
              Sathi is reviewing clinical databases for your answer...
            </div>
          </div>
        )}
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question (e.g. Can I take this with green tea?)..."
          className="flex-1 rounded-xl border border-line bg-panel2/80 px-4 py-2.5 text-[13.5px] text-fg placeholder:text-faint focus:border-mint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn btn-primary h-11 px-5 text-[13px] disabled:opacity-50"
        >
          <Send size={15} /> Send
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------- full assembled report */
export function FullReport({
  payload,
  mode,
  analysisId,
}: {
  payload: AnalysisPayload;
  mode?: string;
  analysisId?: string;
}) {
  const [viewMode, setViewMode] = useState<"patient" | "clinical">("patient");

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top action bar: Audio Readout, View Mode toggle, Print */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-faint">display mode:</span>
          <div className="inline-flex rounded-xl border border-line bg-panel p-1">
            <button
              onClick={() => setViewMode("patient")}
              className={`rounded-lg px-3 py-1 font-mono2 text-[10.5px] uppercase tracking-wider transition-all ${
                viewMode === "patient"
                  ? "bg-mint text-ink font-bold shadow-sm"
                  : "text-dim hover:text-fg"
              }`}
            >
              Patient Easy View
            </button>
            <button
              onClick={() => setViewMode("clinical")}
              className={`rounded-lg px-3 py-1 font-mono2 text-[10.5px] uppercase tracking-wider transition-all ${
                viewMode === "clinical"
                  ? "bg-mint text-ink font-bold shadow-sm"
                  : "text-dim hover:text-fg"
              }`}
            >
              Clinical Detail View
            </button>
          </div>
        </div>

        <button
          onClick={printReport}
          className="btn btn-ghost h-9 px-3.5 text-[12px] flex items-center gap-1.5 border border-line/60"
        >
          <Printer size={14} /> Print / Save Caregiver Summary
        </button>
      </div>

      {/* Audio Readout */}
      <Reveal>
        <AudioGuidePlayer payload={payload} />
      </Reveal>

      {/* In Patient Mode, lead with Plain English & Daily Timetable! */}
      {viewMode === "patient" ? (
        <>
          <Reveal delay={0.04}>
            <PlainPanel plain={payload.plain} />
          </Reveal>

          {payload.routine && payload.routine.length > 0 && (
            <Reveal delay={0.08}>
              <RoutineSchedulePanel routine={payload.routine} />
            </Reveal>
          )}

          <Reveal delay={0.12}>
            <SafetyPanel interactions={payload.interactions} />
          </Reveal>

          {payload.doctorQuestions && payload.doctorQuestions.length > 0 && (
            <Reveal delay={0.16}>
              <DoctorQuestionsPanel questions={payload.doctorQuestions} />
            </Reveal>
          )}

          <Reveal delay={0.2}>
            <InteractiveCompanionChat payload={payload} analysisId={analysisId} />
          </Reveal>

          <Reveal delay={0.24}>
            <StructuredPanel rx={payload.structured} rawText={payload.rawText} mode={mode} />
          </Reveal>

          {payload.enriched.length > 0 && (
            <Reveal delay={0.28}>
              <EnrichedPanel meds={payload.enriched} />
            </Reveal>
          )}
        </>
      ) : (
        /* Clinical View */
        <>
          <Reveal>
            <StructuredPanel rx={payload.structured} rawText={payload.rawText} mode={mode} />
          </Reveal>

          {payload.enriched.length > 0 && (
            <Reveal delay={0.06}>
              <EnrichedPanel meds={payload.enriched} />
            </Reveal>
          )}

          <Reveal delay={0.1}>
            <SafetyPanel interactions={payload.interactions} />
          </Reveal>

          <Reveal delay={0.14}>
            <PlainPanel plain={payload.plain} />
          </Reveal>

          {payload.routine && payload.routine.length > 0 && (
            <Reveal delay={0.18}>
              <RoutineSchedulePanel routine={payload.routine} />
            </Reveal>
          )}

          {payload.doctorQuestions && payload.doctorQuestions.length > 0 && (
            <Reveal delay={0.22}>
              <DoctorQuestionsPanel questions={payload.doctorQuestions} />
            </Reveal>
          )}

          <Reveal delay={0.26}>
            <InteractiveCompanionChat payload={payload} analysisId={analysisId} />
          </Reveal>
        </>
      )}
    </div>
  );
}
