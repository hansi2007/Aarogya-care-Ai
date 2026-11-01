import { FORM_PLAIN, SIG_GLOSSARY, TERM_GLOSSARY } from "./dictionary";
import type {
  EnrichedMed,
  GlossaryEntry,
  Interaction,
  LabValue,
  Medicine,
  PlainStep,
  PlainSummary,
  StructuredRx,
} from "./types";

const fmtCount = (perDay?: [number, number, number]) => {
  if (!perDay) return undefined;
  const parts: string[] = [];
  const labels = ["in the morning", "at noon", "at night"];
  perDay.forEach((v, i) => {
    const qty = v === 0.5 ? "half a dose" : `${v}`;
    if (v > 0) parts.push(`${qty} ${labels[i]}`);
  });
  return parts.join(" and ");
};

const TIMING_SYNONYMS: Record<string, string> = {
  "in the morning": "morning",
  "in the afternoon": "afternoon|noon",
  "at night": "night|bedtime",
  "at bedtime": "night|bedtime",
  "before food": "before food|before meals|before breakfast",
  "after food": "after food|after meals",
  "with food": "with food|with a meal",
};

function medInstruction(m: Medicine): string {
  const bits: string[] = [];
  const formWord = FORM_PLAIN[m.form] ?? "dose";
  if (m.prn) {
    bits.push(`Take it only when needed${m.notes ? ` (${m.notes})` : ""}`);
  } else if (m.perDay) {
    bits.push(`Take ${fmtCount(m.perDay)}`);
  } else if (m.frequency) {
    bits.push(`Take it ${m.frequency}`);
  } else if (m.timesPerDay) {
    bits.push(`Take one ${m.timesPerDay} times a day, spaced out`);
  } else {
    bits.push(`Take it exactly as your doctor directed`);
  }
  if (m.timing && !m.prn) {
    const sentence = bits.join(" ").toLowerCase();
    const syn = TIMING_SYNONYMS[m.timing] ?? m.timing;
    if (!new RegExp(`\\b(${syn})\\b`).test(sentence)) bits.push(m.timing);
  }
  if (m.durationDays) {
    bits.push(
      m.durationDays >= 30
        ? `for about ${Math.round(m.durationDays / 30)} month${Math.round(m.durationDays / 30) > 1 ? "s" : ""}`
        : `for ${m.durationDays} day${m.durationDays > 1 ? "s" : ""}`,
    );
  }
  if (formWord === "gargle / mouth rinse") bits[0] = bits[0].replace("Take", "Use");
  return bits.join(" ") + ".";
}

function buildSteps(meds: Medicine[], enriched: EnrichedMed[]): PlainStep[] {
  const byId = new Map(enriched.map((e) => [e.medId, e]));
  return meds.map((m) => {
    const e = byId.get(m.id);
    const strength = m.strength ? ` ${m.strength}` : "";
    const plainUse = e?.usesPlain ? ` ${e.usesPlain}` : "";
    const tip = e?.tips?.[0] ? ` Tip: ${e.tips[0]}.` : "";
    return {
      kind: "med" as const,
      title: `${m.name}${strength}${m.strength ? "" : ""} — ${m.frequency ? cap(m.frequency) : "As directed"}`,
      detail: `${medInstruction(m)}${plainUse ? plainUse[0].toUpperCase() === plainUse[0] ? ` ${e?.usesPlain}` : "" : ""}${tip}`.replace(/\s+/g, " ").replace(" .", ".").trim(),
    };
  });
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function buildGlossary(rx: StructuredRx): GlossaryEntry[] {
  const out: GlossaryEntry[] = [];
  const seen = new Set<string>();
  for (const m of rx.medicines) {
    const tokens = [m.sigCode, ...(m.rawLine.toLowerCase().match(/\b(od|bd|tds|bid|tid|qid|hs|sos|prn|ac|pc|stat|po)\b/g) ?? [])];
    for (const t of tokens) {
      if (!t) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      const meaning = SIG_GLOSSARY[k];
      if (meaning) {
        seen.add(k);
        out.push({ term: t.toUpperCase(), meaning });
      }
    }
  }
  for (const c of rx.conditions) {
    if (c.code && c.code !== c.name && !seen.has(c.code.toLowerCase())) {
      seen.add(c.code.toLowerCase());
      out.push({ term: c.code, meaning: `${c.name} — ${c.plain}` });
    }
  }
  const text = rx.medicines.map((m) => m.rawLine).join(" ").toLowerCase();
  for (const [term, meaning] of Object.entries(TERM_GLOSSARY)) {
    if (seen.has(term)) continue;
    if (new RegExp(`\\b${term.replace("/", "\\/")}\\b`, "i").test(text) && out.length < 12) {
      seen.add(term);
      out.push({ term: term.toUpperCase(), meaning });
    }
  }
  return out.slice(0, 12);
}

function labsOverview(labs: LabValue[]): { overview: string; steps: PlainStep[] } {
  const flagged = labs.filter((l) => l.flag);
  const overview = flagged.length
    ? `This report has ${flagged.length} result${flagged.length > 1 ? "s" : ""} outside the usual range (marked ${flagged.map((f) => f.flag).join("/")}). Here's what each test actually says about your body in everyday words.`
    : `All ${labs.length} results on this report sit within their usual reference ranges. Here's what each test means in everyday words.`;
  const steps: PlainStep[] = labs.map((l) => ({
    kind: "lab" as const,
    title: `${l.test}: ${l.value}${l.unit ? ` ${l.unit}` : ""}${l.flag ? (l.flag === "H" ? " — higher than usual" : " — lower than usual") : " — within range"}`,
    detail: l.plain ?? `Reference range: ${l.ref ?? "—"}. Your doctor will interpret this in context.`,
  }));
  return { overview, steps };
}

export function buildPlainSummary(
  rx: StructuredRx,
  enriched: EnrichedMed[],
  interactions: Interaction[],
): PlainSummary {
  const isLab = rx.labs.length > 0 && rx.medicines.length === 0;
  const conds = rx.conditions.map((c) => c.plain);
  const meds = rx.medicines;

  let headline: string;
  let overview: string;
  let steps: PlainStep[];

  if (isLab) {
    headline = "Your lab report, in human language";
    const l = labsOverview(rx.labs);
    overview = l.overview;
    steps = l.steps;
  } else {
    const condText = conds.length ? joinNice(conds) : "your health condition";
    headline = conds.length
      ? `${meds.length} medicine${meds.length !== 1 ? "s" : ""} for ${condText}`
      : `${meds.length} medicine${meds.length !== 1 ? "s" : ""}, decoded`;
    const chunks: string[] = [];
    chunks.push(
      `${rx.doctor ?? "Your doctor"} has prescribed ${meds.length} medicine${meds.length !== 1 ? "s" : ""}${conds.length ? ` for ${condText}` : ""}.`,
    );
    const longest = Math.max(...meds.map((m) => m.durationDays ?? 0));
    if (longest >= 60) {
      chunks.push(
        `This looks like an ongoing-care plan — most medicines run for around ${Math.round(longest / 30)} months, after which your doctor will review how you're doing.`,
      );
    } else if (longest > 0) {
      chunks.push(
        `This is a short course — most items run for ${longest} day${longest > 1 ? "s" : ""}. Finish everything even if you feel better sooner.`,
      );
    }
    if (meds.some((m) => m.prn)) {
      chunks.push("Items marked SOS are not daily medicines — use them only when the symptom appears.");
    }
    overview = chunks.join(" ");
    steps = buildSteps(meds, enriched);
  }

  const watchOut: string[] = [];
  for (const i of interactions.slice(0, 3)) {
    watchOut.push(i.plain ?? i.description);
  }
  const warnPool = enriched
    .flatMap((e) => e.warnings.slice(0, 1).map((w) => `${e.genericName ?? e.name}: ${w}`))
    .slice(0, 4);
  for (const w of warnPool) if (watchOut.length < 6) watchOut.push(w);

  return {
    headline,
    overview,
    steps,
    watchOut,
    glossary: buildGlossary(rx),
  };
}

function joinNice(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
