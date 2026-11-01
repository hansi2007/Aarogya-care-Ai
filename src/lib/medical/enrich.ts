import { db } from "@/db";
import { medicineCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { EnrichedMed, Medicine } from "./types";
import { findReference } from "./reference";

const RXNAV = "https://rxnav.nlm.nih.gov/REST";
const FDA = "https://api.fda.gov/drug/label.json";

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function trimText(s: string, max = 300) {
  const flat = s.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const dot = cut.lastIndexOf(".");
  return (dot > 120 ? cut.slice(0, dot + 1) : cut.trimEnd()) ;
}

function firstField(result: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = result?.[k];
    if (Array.isArray(v) && v.length && typeof v[0] === "string") return trimText(v[0], 420);
  }
  return undefined;
}

function listSentences(s: string | undefined, maxItems = 4): string[] {
  if (!s) return [];
  return s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 24)
    .slice(0, maxItems);
}

interface RxNavHit {
  rxcui?: string;
  ingredientRxcui?: string;
  genericName?: string;
}

async function rxnavLookup(name: string): Promise<RxNavHit> {
  const hit: RxNavHit = {};
  try {
    const approx = await fetchJson(
      `${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`,
    );
    const cand = approx?.approximateGroup?.candidate?.[0];
    if (!cand?.rxcui) return hit;
    hit.rxcui = String(cand.rxcui);
    try {
      const related = await fetchJson(
        `${RXNAV}/rxcui/${hit.rxcui}/related.json?tty=IN+MIN+PIN+BN`,
      );
      const groups = related?.relatedGroup?.conceptGroup ?? [];
      for (const g of groups) {
        const props = g?.conceptProperties?.[0];
        if (!props) continue;
        if (g.tty === "IN" || g.tty === "PIN" || g.tty === "MIN") {
          hit.ingredientRxcui = hit.ingredientRxcui ?? String(props.rxcui);
          hit.genericName = hit.genericName ?? props.name;
        }
        if (g.tty === "BN" && !hit.genericName) hit.genericName = props.name;
      }
    } catch {
      /* ingredient lookup best-effort */
    }
    if (!hit.ingredientRxcui) hit.ingredientRxcui = hit.rxcui;
    if (!hit.genericName) {
      try {
        const props = await fetchJson(`${RXNAV}/rxcui/${hit.rxcui}/properties.json`);
        hit.genericName = props?.properties?.name;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* offline or failed — reference DB will take over */
  }
  return hit;
}

interface FdaHit {
  uses?: string;
  sideEffects: string[];
  warnings: string[];
  brandNames: string[];
  genericName?: string;
}

async function fdaLookup(name: string): Promise<FdaHit> {
  const out: FdaHit = { sideEffects: [], warnings: [], brandNames: [] };
  const queries = [
    `openfda.generic_name:"${name}"`,
    `openfda.generic_name:${name}`,
    `openfda.brand_name:"${name}"`,
    `openfda.substance_name:"${name}"`,
  ];
  for (const q of queries) {
    try {
      const data = await fetchJson(`${FDA}?search=${encodeURIComponent(q)}&limit=1`);
      const r = data?.results?.[0];
      if (!r) continue;
      out.uses = firstField(r, ["indications_and_usage", "purpose", "clinical_pharmacology"]);
      const se = firstField(r, ["adverse_reactions"]);
      if (se) out.sideEffects = listSentences(se, 4);
      const w = firstField(r, ["warnings", "warnings_and_cautions", "boxed_warning", "precautions"]);
      if (w) out.warnings = listSentences(w, 3);
      if (r.openfda?.brand_name) out.brandNames = r.openfda.brand_name.slice(0, 3);
      if (r.openfda?.generic_name?.[0]) out.genericName = r.openfda.generic_name[0];
      if (out.uses || out.warnings.length) break;
    } catch {
      continue;
    }
  }
  return out;
}

export interface EnrichProgress {
  (med: Medicine, stage: string): void;
}

export async function enrichMedicine(med: Medicine): Promise<EnrichedMed> {
  const key = med.name.toLowerCase().split(" ")[0] || med.name.toLowerCase();
  const ref = findReference(med.name);

  let cached: EnrichedMed | null = null;
  try {
    const rows = await db
      .select()
      .from(medicineCache)
      .where(eq(medicineCache.name, key))
      .limit(1);
    if (rows[0]?.data) cached = rows[0].data as unknown as EnrichedMed;
  } catch {
    /* cache unavailable */
  }

  let live: RxNavHit = {};
  let fda: FdaHit = { sideEffects: [], warnings: [], brandNames: [] };
  if (cached) {
    live = { rxcui: cached.rxcui, ingredientRxcui: cached.ingredientRxcui, genericName: cached.genericName };
  } else {
    [live, fda] = await Promise.all([rxnavLookup(key), fdaLookup(key)]);
  }

  const hasLive = Boolean(cached?.fetchedLive ? true : live.rxcui || fda.uses || fda.warnings.length);

  const result: EnrichedMed = cached
    ? { ...cached, medId: med.id, name: med.name }
    : {
        medId: med.id,
        name: med.name,
        genericName: live.genericName ?? ref?.genericName ?? med.name,
        brandNames: fda.brandNames.length ? fda.brandNames : ref?.brandNames,
        rxcui: live.rxcui,
        ingredientRxcui: live.ingredientRxcui,
        drugClass: ref?.drugClass,
        classPlain: ref?.classPlain,
        uses: fda.uses ?? ref?.uses,
        usesPlain: ref?.usesPlain ?? fda.uses,
        howItWorks: ref?.howItWorks,
        sideEffects: ref?.sideEffects.length
          ? ref.sideEffects
          : fda.sideEffects.slice(0, 4),
        warnings: ref?.warnings.length ? ref.warnings : fda.warnings.slice(0, 3),
        tips: ref?.tips ?? [],
        source:
          live.rxcui && fda.uses
            ? "rxnav+fda"
            : live.rxcui
              ? "rxnav"
              : fda.uses
                ? "fda"
                : "reference",
        fetchedLive: hasLive,
      };

  if (!cached && (live.rxcui || fda.uses) ) {
    try {
      await db
        .insert(medicineCache)
        .values({ name: key, source: result.source, data: result })
        .onConflictDoNothing();
    } catch {
      /* caching best-effort */
    }
  }
  return result;
}

export async function enrichAll(meds: Medicine[]): Promise<EnrichedMed[]> {
  return Promise.all(meds.map((m) => enrichMedicine(m)));
}
