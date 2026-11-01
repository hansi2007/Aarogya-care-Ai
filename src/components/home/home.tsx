"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  CheckCircle2,
  CircleDot,
  FileImage,
  FileStack,
  FileText,
  Globe2,
  History,
  Lock,
  MessageSquareText,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AGENTS } from "@/lib/agents/meta";

const AGENT_ICONS = [ScanSearch, Globe2, MessageSquareText, ShieldCheck, Sparkles];

const ease = [0.22, 1, 0.36, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------- hero visual */
function ScanCard() {
  const tags = [
    { x: "8%", y: "16%", label: "Tab Metformin 500mg", d: 1.2 },
    { x: "52%", y: "30%", label: "1-0-1 → twice daily", d: 1.9 },
    { x: "10%", y: "58%", label: "Dx: T2DM, HTN", d: 2.6 },
    { x: "48%", y: "74%", label: "HS → at bedtime", d: 3.3 },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[520px]" style={{ perspective: "1200px" }}>
      {/* orbit rings */}
      <div className="spin-slowest pointer-events-none absolute -inset-10 rounded-full border border-dashed border-[rgba(130,230,255,0.14)]" />
      <div className="spin-slower pointer-events-none absolute -inset-24 hidden rounded-full border border-[rgba(130,230,255,0.07)] md:block" />

      {/* orbit node pills */}
      <motion.div className="floaty absolute -left-6 top-8 z-20 hidden md:block" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1, duration: 0.7, ease }}>
        <OrbitPill color="#38E0C8" label="A1 · LUMEN" />
      </motion.div>
      <motion.div className="absolute -right-8 top-24 z-20 hidden md:block" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.35, duration: 0.7, ease }}>
        <OrbitPill color="#5AB2FF" label="A2 · MEDSCOPE" />
      </motion.div>
      <motion.div className="floaty-2 absolute -left-10 bottom-24 z-20 hidden md:block" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, duration: 0.7, ease }}>
        <OrbitPill color="#A78BFA" label="A3 · PLAINWORDS" />
      </motion.div>
      <motion.div className="absolute -right-4 bottom-8 z-20 hidden md:block" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.85, duration: 0.7, ease }}>
        <OrbitPill color="#FFB454" label="A4 · GUARDIAN" />
      </motion.div>
      <motion.div className="floaty absolute left-1/2 -bottom-6 -translate-x-1/2 z-20 hidden md:block" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.1, duration: 0.7, ease }}>
        <OrbitPill color="#4ADE80" label="A5 · SATHI" />
      </motion.div>

      {/* main card */}
      <motion.div
        initial={{ opacity: 0, y: 50, rotateY: -14, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateY: -8, rotateX: 5 }}
        transition={{ duration: 1.3, delay: 0.35, ease }}
        className="glass relative overflow-hidden rounded-[22px] p-3 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
      >
        <div className="relative overflow-hidden rounded-2xl">
          <Image
            src="/samples/rx-slip-1.png"
            alt="A scanned prescription slip"
            width={760}
            height={900}
            className="h-auto w-full rounded-2xl object-cover opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04121099] via-transparent to-[#04121055]" />
          <div className="scan-beam" />
          {/* detection tags */}
          {tags.map((t) => (
            <motion.div
              key={t.label}
              className="absolute z-10"
              style={{ left: t.x, top: t.y }}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: t.d, duration: 0.6, ease }}
            >
              <span className="flex items-center gap-1.5 rounded-md border border-mint/40 bg-[#041a16e6] px-2 py-1 font-mono2 text-[9.5px] tracking-wide text-mintsoft shadow-[0_0_18px_rgba(46,230,192,0.25)]">
                <CircleDot size={8} className="text-mint" />
                {t.label}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center justify-between px-2 pb-1 pt-3">
          <span className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-faint">scan_0142 · rx-slip.jpg</span>
          <span className="flex items-center gap-1.5 font-mono2 text-[10px] uppercase tracking-[0.2em] text-mint">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
            processing
          </span>
        </div>
      </motion.div>

      {/* floating outcome chips */}
      <motion.div
        className="glass absolute -bottom-7 left-1/2 z-30 flex w-[88%] -translate-x-1/2 items-center gap-3 rounded-2xl p-3.5 md:w-auto"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 4.1, duration: 0.8, ease }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint/15 text-mint">
          <CheckCircle2 size={17} />
        </span>
        <div className="leading-tight">
          <p className="m-0 font-display text-[13px] font-semibold text-fg">No critical interactions</p>
          <p className="m-0 font-mono2 text-[9.5px] uppercase tracking-[0.18em] text-faint">guardian · rxnav verified</p>
        </div>
        <span className="ml-2 hidden rounded-lg border border-cy/30 bg-cy/10 px-2.5 py-1 font-mono2 text-[9.5px] text-cy md:block">
          FDA label linked
        </span>
      </motion.div>
    </div>
  );
}

function OrbitPill({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{ borderColor: `${color}44` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <span className="font-mono2 text-[9.5px] uppercase tracking-[0.2em]" style={{ color }}>
        {label}
      </span>
    </span>
  );
}

/* --------------------------------------------------------------- hero */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-[140px] md:pt-[168px]">
      <div className="grid-bg absolute inset-0" />
      <div className="glow-orb absolute -left-40 top-10 h-[480px] w-[480px] bg-[#2ee6c014]" />
      <div className="glow-orb absolute -right-52 top-64 h-[560px] w-[560px] bg-[#58b7f810]" />
      <div className="glow-orb absolute left-1/3 top-[560px] h-[380px] w-[380px] bg-[#a78bfa0d]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
            <span className="eyebrow">Multi-agent medical AI · RxNav + openFDA live</span>
          </motion.div>

          <motion.h1
            className="h-display mt-7 text-[clamp(2.9rem,6.4vw,5.3rem)] text-fg"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.12, ease }}
          >
            Your prescription,
            <br />
            <span className="text-grad">decoded by agents.</span>
          </motion.h1>

          <motion.p
            className="mt-7 max-w-[520px] text-[15.5px] leading-relaxed text-dim md:text-[17px]"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.28, ease }}
          >
            Drop in a doctor&apos;s slip, hospital prescription, PDF or lab report. Five autonomous
            medical agents read it, scrape live NIH &amp; FDA medicine intelligence, screen for
            dangerous interactions, build your daily schedule timetable, and translate everything into
            compassionate plain English with audio readout.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.42, ease }}
          >
            <Link href="/analyze" className="btn btn-primary h-[52px] px-7 text-[15px]">
              <ScanSearch size={17} />
              Analyze a prescription
              <ArrowRight size={16} />
            </Link>
            <Link href="#agents" className="btn btn-ghost h-[52px] px-6 text-[14px]">
              Meet the agents
            </Link>
          </motion.div>

          <motion.div
            className="mt-12 grid max-w-[560px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease }}
          >
            {[
              ["05", "specialist agents"],
              ["02", "live NIH/FDA sources"],
              ["Audio", "speech readout"],
              ["100%", "plain English"],
            ].map(([v, l]) => (
              <div key={l} className="bg-abyss/80 px-4 py-4 text-center sm:text-left">
                <p className="m-0 font-display text-xl font-bold text-mintsoft">{v}</p>
                <p className="m-0 mt-1 font-mono2 text-[9px] uppercase tracking-[0.18em] text-faint">{l}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative pt-6 lg:pt-0">
          <ScanCard />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ marquee */
function Marquee() {
  const items = [
    { icon: FileImage, t: "Handwritten slips" },
    { icon: FileText, t: "Digital PDFs" },
    { icon: FlaskIcon, t: "Lab reports" },
    { icon: FileStack, t: "Discharge summaries" },
    { icon: Braces, t: "Rx shorthand 1-0-1 · BD · TDS · SOS" },
    { icon: Globe2, t: "Live openFDA labels" },
    { icon: Radar, t: "NIH interaction radar" },
  ];
  function FlaskIcon(p: any) {
    return <Sparkles {...p} />;
  }
  const row = [...items, ...items];
  return (
    <div className="relative border-y border-line bg-abyss/60 py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-ink to-transparent" />
      <div className="marquee-track gap-10">
        {row.map((it, i) => (
          <span key={i} className="flex items-center gap-3 font-mono2 text-[11px] uppercase tracking-[0.26em] text-faint">
            <it.icon size={14} className="text-mint/70" />
            {it.t}
            <span className="ml-6 h-1 w-1 rounded-full bg-mint/40" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- agents */
function Agents() {
  return (
    <section id="agents" className="relative mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
      <Reveal>
        <span className="eyebrow">The crew behind the curtain</span>
        <h2 className="h-display mt-6 max-w-2xl text-[clamp(2rem,4.4vw,3.4rem)] text-fg">
          Five agents. <span className="text-grad">One clinical relay race.</span>
        </h2>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-dim">
          Each agent owns a dedicated clinical job, then passes a structured dossier to the next. You watch the
          hand-off live — from handwriting deciphering to daily timetables and audio guidance.
        </p>
      </Reveal>

      <div className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="absolute left-[8%] right-[8%] top-1/2 hidden h-px bg-gradient-to-r from-transparent via-[rgba(130,230,255,0.18)] to-transparent xl:block" />
        {AGENTS.map((a, i) => {
          const Icon = AGENT_ICONS[i];
          return (
            <Reveal key={a.key} delay={i * 0.12}>
              <div className="glass card-hover group relative h-full rounded-[20px] p-6">
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
                    style={{ background: `${a.color}14`, borderColor: `${a.color}38`, color: a.color }}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="font-mono2 text-[38px] font-medium leading-none text-faint/50">
                    0{i + 1}
                  </span>
                </div>
                <p className="mb-1 mt-6 font-mono2 text-[10px] uppercase tracking-[0.3em]" style={{ color: a.color }}>
                  {a.codename}
                </p>
                <h3 className="m-0 font-display text-[19px] font-bold tracking-tight text-fg">{a.name}</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-dim">{a.role}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {a.tools.map((t) => (
                    <span key={t} className="chip font-mono2 text-[10px]">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="absolute bottom-0 left-6 right-6 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${a.color}, transparent)` }} />
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- bento */
interface Feature {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  title: string;
  body: string;
  big?: boolean;
}
const FEATURES: Feature[] = [
  {
    icon: Globe2,
    color: "#5AB2FF",
    title: "Live medicine intelligence",
    body: "Every detected drug is scraped in real time from NIH RxNav and the openFDA label database — uses, warnings and side effects straight from official sources.",
    big: true,
  },
  {
    icon: Radar,
    color: "#FFB454",
    title: "Interaction radar",
    body: "GUARDIAN runs every medicine pair through the live NIH interaction graph plus a clinical rule engine, then ranks findings by severity.",
  },
  {
    icon: Braces,
    color: "#A78BFA",
    title: "Shorthand decoder",
    body: "TDS, HS, 1-0-1, SOS, PC — hospital sig codes are decoded into everyday words with a full glossary.",
  },
  {
    icon: ScanSearch,
    color: "#38E0C8",
    title: "Multi-format intake",
    body: "Photos of slips, digital PDFs with a text layer, lab report tables, or simply paste the text — all four flow through the same pipeline.",
  },
  {
    icon: History,
    color: "#5AB2FF",
    title: "Saved analysis history",
    body: "Every run is stored in PostgreSQL — revisit any decoded prescription or lab report from the history vault.",
  },
  {
    icon: Lock,
    color: "#38E0C8",
    title: "Private by design",
    body: "Documents stay in your own database. Nothing is sent anywhere except medicine names to public reference APIs.",
  },
];

function Bento() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 pb-24 md:px-8 md:pb-32">
      <Reveal>
        <span className="eyebrow">Why it feels like magic</span>
        <h2 className="h-display mt-6 max-w-2xl text-[clamp(2rem,4.4vw,3.4rem)] text-fg">
          Serious plumbing, <span className="text-grad">zero friction.</span>
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.1} className={f.big ? "xl:col-span-2 xl:row-span-1" : ""}>
            <div className={`glass card-hover group relative h-full overflow-hidden rounded-[20px] p-7 ${f.big ? "md:p-9" : ""}`}>
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-700 group-hover:opacity-[0.16]"
                style={{ background: f.color }}
              />
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{ background: `${f.color}12`, borderColor: `${f.color}30`, color: f.color }}
              >
                <f.icon size={19} />
              </span>
              <h3 className={`m-0 mt-6 font-display font-bold tracking-tight text-fg ${f.big ? "text-[24px]" : "text-[18px]"}`}>
                {f.title}
              </h3>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-dim">{f.body}</p>
              <ArrowUpRight
                size={16}
                className="absolute bottom-6 right-6 text-faint transition-all duration-500 group-hover:text-mint group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- cta */
function Cta() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 pb-28 md:px-8">
      <Reveal>
        <div className="glass noise relative overflow-hidden rounded-[28px] px-6 py-16 text-center md:px-12 md:py-24">
          <div className="glow-orb absolute -left-24 -top-24 h-72 w-72 bg-[#2ee6c018]" />
          <div className="glow-orb absolute -bottom-24 -right-24 h-72 w-72 bg-[#58b7f818]" />
          <span className="eyebrow no-tick justify-center">Ready when your next Rx is</span>
          <h2 className="h-display mx-auto mt-6 max-w-3xl text-[clamp(2.2rem,5vw,4rem)] text-fg">
            Got a slip in your pocket?
            <br />
            <span className="text-grad">Watch it decode itself.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-dim">
            Choose a built-in sample or drop your own document — the agents take it from there.
          </p>
          <div className="mt-9 flex justify-center">
            <Link href="/analyze" className="btn btn-primary h-[54px] px-8 text-[15px]">
              <Sparkles size={17} />
              Deploy the agent team
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <Hero />
      <Marquee />
      <Agents />
      <Bento />
      <Cta />
    </main>
  );
}
