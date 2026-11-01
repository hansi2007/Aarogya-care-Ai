"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  Check,
  Globe2,
  Loader2,
  MessageSquareText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/agents/meta";
import type { AgentKey, AgentStatus, RunEvent } from "@/lib/medical/types";

const ICONS = {
  vision: ScanSearch,
  enrich: Globe2,
  simplify: MessageSquareText,
  safety: ShieldCheck,
  companion: Sparkles,
} as const;

export interface ConsoleState {
  statuses: Record<AgentKey, AgentStatus>;
  logs: Record<AgentKey, { message: string; ts: string; status: AgentStatus }[]>;
  running: boolean;
  failed: boolean;
}

export function emptyConsole(): ConsoleState {
  const statuses = {
    vision: "idle",
    enrich: "idle",
    simplify: "idle",
    safety: "idle",
    companion: "idle",
    system: "idle",
  } as Record<AgentKey, AgentStatus>;
  const logs = {
    vision: [],
    enrich: [],
    simplify: [],
    safety: [],
    companion: [],
    system: [],
  } as Record<AgentKey, { message: string; ts: string; status: AgentStatus }[]>;
  return { statuses, logs, running: false, failed: false };
}

export function applyEvent(prev: ConsoleState, ev: RunEvent): ConsoleState {
  if (ev.agent === "system") return prev;
  const key = ev.agent;
  const logs = {
    ...prev.logs,
    [key]: [...prev.logs[key], { message: ev.message, ts: ev.ts, status: ev.status }].slice(-6),
  };
  let s: AgentStatus = ev.status;
  if (s === "info") s = "working";
  const statuses = { ...prev.statuses, [key]: s };
  return { ...prev, logs, statuses };
}

function Elapsed({ started }: { started: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const s = Math.max(0, Math.floor((now - started) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className="font-mono2 text-[11px] tracking-[0.2em] text-mint">
      {mm}:{ss}
    </span>
  );
}

function statusPill(status: AgentStatus, failed: boolean) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-mint/12 px-2 py-0.5 font-mono2 text-[9px] uppercase tracking-[0.16em] text-mint">
        <Check size={9} /> done
      </span>
    );
  if (status === "error" || failed)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose/12 px-2 py-0.5 font-mono2 text-[9px] uppercase tracking-[0.16em] text-rose">
        <X size={9} /> attention
      </span>
    );
  if (status === "working")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-cy/12 px-2 py-0.5 font-mono2 text-[9px] uppercase tracking-[0.16em] text-cy">
        {/* equalizer bars */}
        <span className="flex h-2.5 items-end gap-[2px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="eq-bar w-[2.5px] rounded-sm bg-cy" style={{ height: 10, animationDelay: `${i * 0.18}s` }} />
          ))}
        </span>
        working
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-md border border-line px-2 py-0.5 font-mono2 text-[9px] uppercase tracking-[0.16em] text-faint">
      queued
    </span>
  );
}

export default function AgentConsole({ state, startedAt }: { state: ConsoleState; startedAt: number }) {
  return (
    <div className="glass relative overflow-hidden rounded-[22px] p-5 md:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint/12 text-mint">
            <TerminalSquare size={16} />
          </span>
          <div>
            <p className="m-0 font-display text-[15px] font-bold text-fg">Agent operations deck</p>
            <p className="m-0 font-mono2 text-[9.5px] uppercase tracking-[0.24em] text-faint">
              live feed · sse stream
            </p>
          </div>
        </div>
        {(state.running || !state.failed) && <Elapsed started={startedAt} />}
      </div>

      <div className="space-y-3.5">
        {AGENTS.map((a, i) => {
          const Icon = ICONS[a.key as Exclude<AgentKey, "system">];
          const status = state.statuses[a.key];
          const logs = state.logs[a.key];
          const active = status === "working";
          return (
            <div key={a.key} className={`agent-row ${active ? "active" : ""}`} style={{ ["--link-color" as string]: a.color }}>
              {i < AGENTS.length - 1 && <span className="agent-link" />}
              <motion.div
                layout
                className="relative rounded-2xl border p-4 transition-colors duration-500"
                style={{
                  borderColor: active ? `${a.color}55` : status === "success" ? `${a.color}2c` : "rgba(130,230,255,0.09)",
                  background: active ? `${a.color}0a` : "rgba(13,27,40,0.4)",
                }}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-500"
                    style={{
                      background: `${a.color}${active || status === "success" ? "1a" : "08"}`,
                      borderColor: `${a.color}${active || status === "success" ? "55" : "22"}`,
                      color: status === "idle" ? "#5E7484" : a.color,
                    }}
                  >
                    {active ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="m-0 font-mono2 text-[10px] uppercase tracking-[0.28em]" style={{ color: a.color }}>
                        {a.codename}
                      </p>
                      <p className="m-0 truncate font-display text-[14.5px] font-semibold text-fg">{a.name}</p>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {logs.length > 0 && (
                        <motion.p
                          key={logs.length}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="log-line latest m-0 mt-1.5 truncate"
                        >
                          <span className="text-faint">▸</span>
                          {logs[logs.length - 1].message}
                        </motion.p>
                      )}
                      {logs.length === 0 && (
                        <motion.p key="idle" className="m-0 mt-1.5 text-[12px] text-faint">
                          {a.role.split(".")[0]}.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="shrink-0">{statusPill(status, state.failed && status === "working")}</div>
                </div>

                {/* progress bar */}
                <div className="mt-3.5 h-[3px] overflow-hidden rounded-full bg-[#0e1c29]">
                  {status === "success" && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${a.color}88, ${a.color})` }}
                    />
                  )}
                  {active && (
                    <div className="progress-stripes h-full w-full rounded-full" style={{ backgroundColor: `${a.color}55` }} />
                  )}
                </div>

                {/* expandable mini log */}
                {logs.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-line/60 pt-2.5">
                    {logs.slice(-4, -1).map((l, idx) => (
                      <p key={idx} className="log-line m-0">
                        <span className="log-time">{new Date(l.ts).toLocaleTimeString([], { hour12: false })}</span>
                        <span className={l.status === "error" ? "text-rose" : ""}>{l.message}</span>
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
