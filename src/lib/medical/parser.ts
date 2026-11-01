import {
  CONDITIONS,
  FORM_ALIASES,
  LAB_PLAIN,
  SIG_CODES,
} from "./dictionary";
import type {
  Condition,
  LabValue,
  MedForm,
  Medicine,
  StructuredRx,
} from "./types";

let counter = 0;
const nextId = () => `m${(++counter).toString(36)}${Date.now().toString(36)}`;

const FORM_RE =
  /^(tab(?:let)?s?|cap(?:sule)?s?|syp|syr(?:up)?|susp(?:ension)?|inj(?:ection)?|oint(?:ment)?|crm|cream|gel|drops?|inh(?:aler)?|sachet|powder)\.?\b/i;

const STRENGTH_RE =
  /(\d[\d,]*(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|%|units?)\b\s*(?:\/\s*(\d[\d,.]*)\s*(ml|mg))?/i;

const SIG_TOKEN_RE =
  /\b(od|om|on|bd|bid|tds|tid|qid|hs|mane|nocte|sos|prn|stat|ac|pc|cf|q4h|q6h|q8h|q12h|qd|qod)\b/i;

const DOSE_PATTERN_RE = /(\d|\d\/\d|\d+\s?\/\s?\d+)-(\d|\d\/\d)-(\d|\d\/\d)/;

const DURATION_RES: { re: RegExp; toDays: (m: RegExpMatchArray) => number }[] = [
  {
    re: /[x×]\s*(\d+)\s*(days?|d)\b/i,
    toDays: (m) => parseInt(m[1], 10),
  },
  {
    re: /for\s+(\d+)\s*(days?|d)\b/i,
    toDays: (m) => parseInt(m[1], 10),
  },
  {
    re: /[x×]\s*(\d+)\s*(weeks?|wks?|w)\b/i,
    toDays: (m) => parseInt(m[1], 10) * 7,
  },
  {
    re: /[x×]\s*(\d+)\s*(months?|mos?)\b/i,
    toDays: (m) => parseInt(m[1], 10) * 30,
  },
  { re: /(\d+)\s*\/\s*7\b/, toDays: (m) => parseInt(m[1], 10) },
  { re: /(\d+)\s*\/\s*52\b/, toDays: (m) => parseInt(m[1], 10) * 7 },
];

function cleanLine(line: string) {
  return line.replace(/^\s*\d+[.)]\s*/, "").trim();
}

function normalizeName(raw: string) {
  return raw
    .replace(/[^a-zA-Z0-9\+\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMedicineLine(line: string): Medicine | null {
  const cleaned = cleanLine(line);
  const formMatch = cleaned.match(FORM_RE);
  const strengthMatch = cleaned.match(STRENGTH_RE);
  if (!formMatch && !strengthMatch) return null;
  if (cleaned.length < 4) return null;

  let form: MedForm = "other";
  let namePart = cleaned;
  if (formMatch) {
    const alias = formMatch[1].toLowerCase().replace(/\.$/, "");
    const mapped = FORM_ALIASES[alias];
    form = (mapped ||
      (alias.startsWith("drop") ? "drops" : alias.startsWith("cream") ? "cream" : "other")) as MedForm;
    namePart = cleaned.slice(formMatch[0].length).trim();
  }

  const dashIdx = namePart.search(/[—–-]{1,2}\s/);
  const afterEm = dashIdx > 0 ? namePart.slice(0, dashIdx) : namePart;
  const strengthPos = afterEm.match(STRENGTH_RE);
  const nameRaw = strengthPos
    ? afterEm.slice(0, afterEm.indexOf(strengthPos[0]))
    : afterEm.split(SIG_TOKEN_RE)[0];
  const name = normalizeName(nameRaw);
  if (!name || name.length < 3) return null;
  if (/^(advice|review|plenty|rest|low salt|monitor)/i.test(name)) return null;

  let strength: string | undefined;
  if (strengthMatch) {
    strength = `${strengthMatch[1].replace(/,/g, ",")} ${strengthMatch[2].toUpperCase()}`
      .replace(" Mg", " mg");
    strength = strength.replace(/(\d) MG/i, "$1 mg");
  }

  let sigCode: string | undefined;
  let perDay: [number, number, number] | undefined;
  let timesPerDay: number | undefined;
  let frequency: string | undefined;
  let timing: string | undefined;
  let prn = false;

  const patternMatch = cleaned.match(DOSE_PATTERN_RE);
  if (patternMatch) {
    sigCode = patternMatch[0].replace(/\s/g, "");
    const sig = SIG_CODES[sigCode];
    if (sig) {
      perDay = sig.perDay;
      timesPerDay = sig.timesPerDay;
      frequency = sig.meaning;
      timing = sig.timing;
    }
  }

  const tokens = cleaned.toLowerCase().match(new RegExp(SIG_TOKEN_RE, "gi"));
  if (tokens) {
    let mergedFreq: string | undefined = frequency;
    for (const t of tokens.map((x) => x.toLowerCase())) {
      const sig = SIG_CODES[t];
      if (!sig) continue;
      if (!patternMatch && sig.perDay) {
        perDay = perDay ?? sig.perDay;
        timesPerDay = timesPerDay ?? sig.timesPerDay;
        mergedFreq = mergedFreq ?? sig.meaning;
      } else if (!patternMatch && !mergedFreq && !sig.timing) {
        mergedFreq = sig.meaning;
        timesPerDay = timesPerDay ?? sig.timesPerDay;
      }
      if (sig.timing) timing = timing ?? sig.timing;
      if (sig.prn) prn = true;
    }
    frequency = mergedFreq;
  }

  if (/once\s+(a\s+week|weekly|weekly)/i.test(cleaned)) {
    frequency = "once weekly";
    timesPerDay = undefined;
  }

  let durationDays: number | undefined;
  for (const { re, toDays } of DURATION_RES) {
    const m = cleaned.match(re);
    if (m) {
      durationDays = toDays(m);
      break;
    }
  }

  if (/gargle|rinse|mouthwash/i.test(cleaned)) form = "gargle";

  return {
    id: nextId(),
    name: name
      .split(" ")
      .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
      .join(" "),
    rawLine: cleaned,
    form,
    strength,
    sigCode,
    perDay,
    timesPerDay,
    frequency,
    timing,
    durationDays,
    prn,
  };
}

function parseConditions(text: string): Condition[] {
  const found = new Map<string, Condition>();
  const blocks = text.match(/(?:dx|diagnosis|c\/o|h\/o)\s*[:\-][^\n]*/gi) || [];
  const candidates: string[] = [];
  for (const b of blocks) {
    candidates.push(...b.replace(/^[a-z\/\s]*[:\-]/i, "").split(/[,;&]+/));
  }
  for (const [key, val] of Object.entries(CONDITIONS)) {
    const re = new RegExp(`\\b${key.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (re.test(text)) {
      if (!found.has(val.name)) found.set(val.name, { code: key.toUpperCase(), ...val });
    }
  }
  for (const c of candidates) {
    const k = c.trim().toLowerCase().replace(/[().]/g, "");
    if (!k) continue;
    const hit = CONDITIONS[k] || CONDITIONS[k.replace(/^acute\s+/, "")];
    if (hit && !found.has(hit.name)) {
      found.set(hit.name, {
        code: k.toUpperCase().slice(0, 12),
        ...hit,
      });
    } else if (!hit && k.length > 3 && k.length < 40 && !/tablet|tab|mg|rx/i.test(k)) {
      const name = k.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
      if (!found.has(name) && /^[a-z\s]+$/.test(k)) {
        found.set(name, { code: "", name, plain: k });
      }
    }
  }
  return [...found.values()];
}

const LAB_ROW_RE =
  /^\s*([A-Za-z][A-Za-z0-9()\/\- ]{2,32}?)\s{2,}([\d.,<>]+)\s{1,}([%µa-zA-Z\/]*)\s{2,}([\d.,<>\-\s]+?)\s*(H|L)?\s*$/;

function matchLabLine(line: string) {
  return line.match(LAB_ROW_RE);
}

function parseLabs(lines: string[]): LabValue[] {
  const labs: LabValue[] = [];
  for (const line of lines) {
    const m = matchLabLine(line);
    if (!m) continue;
    const test = m[1].trim();
    if (/^(test|patient|referred)/i.test(test)) continue;
    const key = test.toLowerCase();
    const info = LAB_PLAIN[key];
    labs.push({
      test: info?.name ?? test,
      value: m[2],
      unit: m[3] || undefined,
      ref: m[4]?.trim(),
      flag: (m[5] as "H" | "L") || undefined,
      plain: info
        ? `${info.plain} ${
            m[5] === "H" && info.high
              ? info.high
              : m[5] === "L" && info.low
                ? info.low
                : ""
          }`.trim()
        : undefined,
    });
  }
  return labs;
}

function parseDoctor(text: string): { doctor?: string; patient?: string } {
  const doc = text.match(/Dr\.\s*[A-Z][a-zA-Z.\s]{2,24}/);
  const patient = text.match(/(?:patient|pt)\s*[:\-]\s*([A-Za-z][A-Za-z.\s]{2,28})/i);
  return {
    doctor: doc ? doc[0].replace(/\s+/g, " ").trim() : undefined,
    patient: patient ? patient[1].replace(/\s+/g, " ").trim() : undefined,
  };
}

export function parsePrescription(rawText: string): StructuredRx {
  const lines = rawText.split(/\r?\n/);
  const medicines: Medicine[] = [];
  for (const line of lines) {
    if (!line.trim() || /^(rx|advice|review|verified|patient|referred|date)/i.test(line.trim()))
      continue;
    if (matchLabLine(line)) continue; // lab table rows are handled by parseLabs, not as medicines
    const med = parseMedicineLine(line);
    if (med && !medicines.some((m) => m.name.toLowerCase() === med.name.toLowerCase())) {
      medicines.push(med);
    }
  }
  return {
    ...parseDoctor(rawText),
    conditions: parseConditions(rawText),
    medicines,
    labs: parseLabs(lines),
  };
}
