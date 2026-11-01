import type { EnrichedMed, Interaction } from "./types";

const RXNAV = "https://rxnav.nlm.nih.gov/REST";

async function fetchJson(url: string, timeoutMs = 9000): Promise<any> {
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

function severityRank(s: string): Interaction["severity"] {
  const v = (s || "").toLowerCase();
  if (v.includes("high") || v.includes("major") || v.includes("severe")) return "high";
  if (v.includes("moderate")) return "moderate";
  return "low";
}

const PLAIN_OVERRIDES: [RegExp, string][] = [
  [/hypoglyc|low blood sugar/i, "Together they can push blood sugar too low — watch for shakiness or sweating."],
  [/bleed/i, "This pair can increase the chance of bleeding — report unusual bruising or dark stools."],
  [/blood pressure|hypotens/i, "Combined effect may drop blood pressure — rise slowly and stay hydrated."],
  [/qt|arrhyth|heart rhythm/i, "Both can affect heart rhythm — report any palpitations or fainting."],
  [/serotonin/i, "May raise serotonin too high together — report agitation, sweating or tremor."],
  [/nephrot|kidney/i, "This pair can strain the kidneys — keep well hydrated and attend kidney check-ups."],
  [/hepato|liver/i, "Both are processed by the liver — avoid alcohol and attend liver check-ups."],
  [/sedat|drows|cns depress/i, "Together they may cause extra drowsiness — avoid driving until you know the effect."],
  [/absorb|chelation|bioavailab/i, "These can block each other's absorption — separate when you take them."],
];

function toPlain(desc: string, a: string, b: string): string {
  for (const [re, p] of PLAIN_OVERRIDES) if (re.test(desc)) return `${a} + ${b}: ${p}`;
  return `${a} + ${b}: ${desc.replace(/\s+/g, " ").slice(0, 160)}`;
}

/** Curated high-value interaction rules matched against class/ingredient names. */
const LOCAL_RULES: {
  a: RegExp;
  b: RegExp;
  severity: Interaction["severity"];
  desc: string;
  plain: string;
}[] = [
  {
    a: /glimepiride|glyburide|gliclazide|glipizide|sitagliptin/,
    b: /insulin|glimepiride|glyburide|gliclazide|glipizide/,
    severity: "moderate",
    desc: "Additive blood-sugar lowering — increased risk of hypoglycemia.",
    plain: "Two sugar-lowering medicines together can drop sugar too far. Learn low-sugar warning signs and carry glucose.",
  },
  {
    a: /aspirin|ibuprofen|naproxen|diclofenac/,
    b: /clopidogrel|warfarin|apixaban|rivaroxaban/,
    severity: "high",
    desc: "Combined antiplatelet/anticoagulant effect markedly increases bleeding risk.",
    plain: "This combination can markedly increase bleeding — only take if your doctor planned it, and report any bleeding.",
  },
  {
    a: /losartan|lisinopril|ramipril|enalapril/,
    b: /ibuprofen|naproxen|diclofenac/,
    severity: "moderate",
    desc: "NSAIDs can blunt blood-pressure control and strain kidneys when combined with ACE/ARB therapy.",
    plain: "Painkillers of the NSAID type can fight against your BP medicine and stress the kidneys — ask before regular use.",
  },
  {
    a: /levothyroxine/,
    b: /calcium|ferrous|iron/,
    severity: "moderate",
    desc: "Calcium/iron chelate levothyroxine and block its absorption.",
    plain: "Calcium and iron stop thyroid medicine from absorbing — take them at least 4 hours apart.",
  },
  {
    a: /atorvastatin|simvastatin/,
    b: /clarithromycin|erythromycin|itraconazole|fluconazole/,
    severity: "moderate",
    desc: "Certain antibiotics/antifungals raise statin levels — muscle toxicity risk.",
    plain: "This antibiotic/antifungal can push statin levels too high — report unusual muscle pain.",
  },
  {
    a: /cetirizine|loratadine|chlorpheniramine|promethazine/,
    b: /alprazolam|diazepam|zolpidem|clonazepam|gabapentin|pregabalin/,
    severity: "moderate",
    desc: "Additive drowsiness and impaired coordination.",
    plain: "Together these cause extra sleepiness — avoid driving or machinery.",
  },
  {
    a: /metformin/,
    b: /iotrolan|iohexol|contrast/,
    severity: "low",
    desc: "Contrast dye procedures require pausing metformin around the scan.",
    plain: "If you have a CT scan with dye, ask when to pause metformin around the procedure.",
  },
];

export async function checkInteractions(
  meds: EnrichedMed[],
): Promise<{ interactions: Interaction[]; viaRxNav: boolean }> {
  const interactions: Interaction[] = [];
  const seen = new Set<string>();
  const names = meds.map((m) => m.genericName ?? m.name);
  let viaRxNav = false;

  const rxcuis = meds
    .map((m) => m.ingredientRxcui)
    .filter((x): x is string => Boolean(x && /^\d+$/.test(x)));

  if (rxcuis.length >= 2) {
    try {
      const data = await fetchJson(
        `${RXNAV}/interaction/list.json?rxcuis=${[...new Set(rxcuis)].join("+")}`,
      );
      const groups = data?.fullInteractionTypeGroup ?? [];
      for (const g of groups) {
        for (const t of g?.fullInteractionType ?? []) {
          for (const pair of t?.interactionPair ?? []) {
            const a = pair?.minConceptItem?.[0]?.name ?? "Medicine A";
            const b = pair?.minConceptItem?.[1]?.name ?? "Medicine B";
            const key = [a, b].sort().join("|").toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            viaRxNav = true;
            const sev = severityRank(String(pair?.severity ?? ""));
            const desc = String(pair?.description ?? "Potential clinically significant interaction.");
            interactions.push({
              drugA: a.split(" ")[0],
              drugB: b.split(" ")[0],
              severity: sev === "low" ? "moderate" : sev,
              description: desc,
              plain: toPlain(desc, a.split(" ")[0], b.split(" ")[0]),
              source: "rxnav",
            });
          }
        }
      }
    } catch {
      /* fall back to local rules */
    }
  }

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const x = names[i].toLowerCase();
      const y = names[j].toLowerCase();
      for (const rule of LOCAL_RULES) {
        const hit =
          (rule.a.test(x) && rule.b.test(y)) || (rule.a.test(y) && rule.b.test(x));
        if (!hit) continue;
        const key = [names[i], names[j]].sort().join("|").toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        interactions.push({
          drugA: names[i],
          drugB: names[j],
          severity: rule.severity,
          description: rule.desc,
          plain: `${names[i]} + ${names[j]}: ${rule.plain}`,
          source: "local",
        });
      }
    }
  }

  const order = { high: 0, moderate: 1, low: 2 } as const;
  interactions.sort((a, b) => order[a.severity] - order[b.severity]);
  return { interactions: interactions.slice(0, 8), viaRxNav };
}
