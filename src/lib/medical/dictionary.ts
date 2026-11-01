/* Prescription shorthand (sig) decoder ---------------------------------- */

export interface SigMeaning {
  meaning: string;
  perDay?: [number, number, number];
  timesPerDay?: number;
  timing?: string;
  prn?: boolean;
}

export const SIG_CODES: Record<string, SigMeaning> = {
  od: { meaning: "once daily", perDay: [1, 0, 0], timesPerDay: 1 },
  om: { meaning: "every morning", perDay: [1, 0, 0], timesPerDay: 1, timing: "in the morning" },
  on: { meaning: "every night", perDay: [0, 0, 1], timesPerDay: 1, timing: "at night" },
  bd: { meaning: "twice daily", perDay: [1, 0, 1], timesPerDay: 2 },
  bid: { meaning: "twice daily", perDay: [1, 0, 1], timesPerDay: 2 },
  tds: { meaning: "three times daily", perDay: [1, 1, 1], timesPerDay: 3 },
  tid: { meaning: "three times daily", perDay: [1, 1, 1], timesPerDay: 3 },
  qid: { meaning: "four times daily", timesPerDay: 4 },
  hs: { meaning: "at bedtime", perDay: [0, 0, 1], timesPerDay: 1, timing: "at bedtime" },
  mane: { meaning: "in the morning", perDay: [1, 0, 0], timesPerDay: 1, timing: "in the morning" },
  nocte: { meaning: "at night", perDay: [0, 0, 1], timesPerDay: 1, timing: "at night" },
  sos: { meaning: "only when needed", prn: true },
  prn: { meaning: "as needed", prn: true },
  stat: { meaning: "immediately, one time", timesPerDay: 0 },
  ac: { meaning: "before food", timing: "before food" },
  pc: { meaning: "after food", timing: "after food" },
  cf: { meaning: "with food", timing: "with food" },
  q4h: { meaning: "every 4 hours", timesPerDay: 6 },
  q6h: { meaning: "every 6 hours", timesPerDay: 4 },
  q8h: { meaning: "every 8 hours", timesPerDay: 3 },
  q12h: { meaning: "every 12 hours", perDay: [1, 0, 1], timesPerDay: 2 },
  qd: { meaning: "once daily", perDay: [1, 0, 0], timesPerDay: 1 },
  qod: { meaning: "every other day" },
  "1-0-1": { meaning: "one in the morning and one at night", perDay: [1, 0, 1], timesPerDay: 2 },
  "0-0-1": { meaning: "one at night", perDay: [0, 0, 1], timesPerDay: 1, timing: "at night" },
  "1-0-0": { meaning: "one in the morning", perDay: [1, 0, 0], timesPerDay: 1, timing: "in the morning" },
  "1-1-1": { meaning: "one at morning, noon and night", perDay: [1, 1, 1], timesPerDay: 3 },
  "0-1-0": { meaning: "one in the afternoon", perDay: [0, 1, 0], timesPerDay: 1, timing: "in the afternoon" },
  "1-1-0": { meaning: "one in the morning and one at noon", perDay: [1, 1, 0], timesPerDay: 2 },
  "0-1-1": { meaning: "one at noon and one at night", perDay: [0, 1, 1], timesPerDay: 2 },
  "2-2-2": { meaning: "two, three times a day", perDay: [2, 2, 2], timesPerDay: 3 },
  "1/2-0-1": { meaning: "half in the morning and one at night", perDay: [0.5, 0, 1], timesPerDay: 2 },
};

export const SIG_GLOSSARY: Record<string, string> = {
  od: "once a day (every 24 hours)",
  bd: "twice a day (roughly every 12 hours)",
  bid: "twice a day",
  tds: "three times a day (roughly every 8 hours)",
  tid: "three times a day",
  qid: "four times a day",
  hs: "at bedtime",
  ac: "before meals (usually 30 minutes before eating)",
  pc: "after meals (usually within 30 minutes after eating)",
  cf: "with food",
  sos: "only when needed — not on a fixed schedule",
  prn: "as needed",
  stat: "immediately (a single dose, right away)",
  po: "by mouth (swallowed)",
  "1-0-1": "morning – afternoon – night pattern: one dose in the morning, none at noon, one at night",
  "0-0-1": "morning – afternoon – night pattern: single dose at night",
  "1-0-0": "morning – afternoon – night pattern: single dose in the morning",
  "1-1-1": "morning – afternoon – night pattern: one dose at each of the three times",
};

export const FORM_ALIASES: Record<string, string> = {
  tab: "tablet",
  tabs: "tablet",
  tablet: "tablet",
  cap: "capsule",
  caps: "capsule",
  capsule: "capsule",
  syp: "syrup",
  syr: "syrup",
  syrup: "syrup",
  susp: "suspension",
  inj: "injection",
  oint: "ointment",
  crm: "cream",
  inh: "inhaler",
  inhaler: "inhaler",
  gargle: "gargle",
};

export const FORM_PLAIN: Record<string, string> = {
  tablet: "tablet",
  capsule: "capsule",
  syrup: "syrup",
  suspension: "liquid (suspension)",
  injection: "injection",
  ointment: "ointment",
  cream: "cream",
  gel: "gel",
  drops: "drops",
  inhaler: "inhaler (puff)",
  gargle: "gargle / mouth rinse",
  sachet: "sachet",
  powder: "powder",
  other: "medicine",
};

/* Condition abbreviation expansion -------------------------------------- */

export const CONDITIONS: Record<string, { name: string; plain: string }> = {
  t2dm: { name: "Type 2 Diabetes Mellitus", plain: "type 2 diabetes (high blood sugar)" },
  "t2 dm": { name: "Type 2 Diabetes Mellitus", plain: "type 2 diabetes (high blood sugar)" },
  iddm: { name: "Type 1 Diabetes", plain: "type 1 diabetes" },
  htn: { name: "Hypertension", plain: "high blood pressure" },
  dyslipidemia: { name: "Dyslipidemia", plain: "abnormal cholesterol / blood fat levels" },
  hyperlipidemia: { name: "High cholesterol", plain: "high cholesterol" },
  urti: { name: "Upper Respiratory Tract Infection", plain: "a common cold / throat infection" },
  lrti: { name: "Lower Respiratory Tract Infection", plain: "a chest infection" },
  uti: { name: "Urinary Tract Infection", plain: "a urine infection" },
  gerd: { name: "Acid Reflux (GERD)", plain: "acid reflux / heartburn" },
  copd: { name: "COPD", plain: "a long-term lung condition that makes breathing harder" },
  asthma: { name: "Asthma", plain: "asthma (reversible airway narrowing)" },
  cad: { name: "Coronary Artery Disease", plain: "narrowed heart arteries" },
  chf: { name: "Heart Failure", plain: "a weakened heart that pumps less effectively" },
  af: { name: "Atrial Fibrillation", plain: "an irregular heartbeat" },
  ckd: { name: "Chronic Kidney Disease", plain: "reduced kidney function" },
  oa: { name: "Osteoarthritis", plain: "wear-and-tear joint arthritis" },
  ra: { name: "Rheumatoid Arthritis", plain: "an autoimmune joint inflammation" },
  hypothyroidism: { name: "Hypothyroidism", plain: "an underactive thyroid gland" },
  "acute pharyngitis": { name: "Acute Pharyngitis", plain: "a sore, inflamed throat" },
  pharyngitis: { name: "Pharyngitis", plain: "a sore, inflamed throat" },
  tonsillitis: { name: "Tonsillitis", plain: "infected, swollen tonsils" },
  migraine: { name: "Migraine", plain: "severe recurring headaches" },
  anemia: { name: "Anemia", plain: "low red blood cells / low hemoglobin" },
  insomnia: { name: "Insomnia", plain: "trouble sleeping" },
  anxiety: { name: "Anxiety", plain: "anxiety" },
  sinusitis: { name: "Sinusitis", plain: "a sinus infection" },
  gastritis: { name: "Gastritis", plain: "stomach lining inflammation" },
  sciatica: { name: "Sciatica", plain: "nerve pain running down the leg" },
  "vitamin d deficiency": { name: "Vitamin D Deficiency", plain: "low vitamin D levels" },
  osteoporosis: { name: "Osteoporosis", plain: "thinning, fragile bones" },
  fever: { name: "Fever", plain: "raised body temperature" },
};

/* Lab test plain-language glossary -------------------------------------- */

export const LAB_PLAIN: Record<string, { name: string; plain: string; high?: string; low?: string }> = {
  hba1c: {
    name: "HbA1c (glycated hemoglobin)",
    plain: "Shows your average blood sugar over the last 3 months.",
    high: "Higher than 5.7% suggests pre-diabetes; 6.5%+ suggests diabetes.",
  },
  "fasting glucose": {
    name: "Fasting blood glucose",
    plain: "Blood sugar after not eating overnight.",
    high: "Above 100 mg/dL suggests the body is struggling with sugar control.",
  },
  glucose: { name: "Blood glucose", plain: "The amount of sugar in your blood." },
  "total cholesterol": {
    name: "Total cholesterol",
    plain: "The overall amount of fat (cholesterol) in your blood.",
    high: "Above 200 mg/dL raises heart-disease risk over time.",
  },
  hdl: {
    name: "HDL cholesterol",
    plain: "The 'good' cholesterol that helps clear fats from arteries.",
    low: "Below 40 mg/dL offers less heart protection.",
  },
  "hdl cholesterol": {
    name: "HDL cholesterol",
    plain: "The 'good' cholesterol that helps clear fats from arteries.",
    low: "Below 40 mg/dL offers less heart protection.",
  },
  ldl: {
    name: "LDL cholesterol",
    plain: "The 'bad' cholesterol that can clog arteries.",
    high: "Above 100 mg/dL builds up plaque in artery walls.",
  },
  "ldl cholesterol": {
    name: "LDL cholesterol",
    plain: "The 'bad' cholesterol that can clog arteries.",
    high: "Above 100 mg/dL builds up plaque in artery walls.",
  },
  triglycerides: {
    name: "Triglycerides",
    plain: "A type of blood fat linked to diet and sugar intake.",
    high: "Above 150 mg/dL increases heart and pancreas risk.",
  },
  "serum creatinine": {
    name: "Serum creatinine",
    plain: "A waste product used to check how well your kidneys filter blood.",
    high: "May suggest the kidneys are under strain.",
  },
  creatinine: {
    name: "Creatinine",
    plain: "A waste product used to check kidney function.",
  },
  tsh: {
    name: "TSH (thyroid-stimulating hormone)",
    plain: "The master signal that controls your thyroid.",
    high: "May mean an underactive thyroid.",
    low: "May mean an overactive thyroid.",
  },
  hemoglobin: {
    name: "Hemoglobin",
    plain: "The protein in red blood cells that carries oxygen.",
    low: "Low levels cause tiredness and breathlessness (anemia).",
  },
  hb: {
    name: "Hemoglobin",
    plain: "The protein in red blood cells that carries oxygen.",
    low: "Low levels cause tiredness and breathlessness (anemia).",
  },
  wbc: {
    name: "White blood cell count",
    plain: "Immune cells that fight infection.",
    high: "Often rises with infection or inflammation.",
  },
  platelet: { name: "Platelet count", plain: "Cells that help your blood clot." },
  "vitamin d": { name: "Vitamin D (25-OH)", plain: "Vitamin needed for bones and immunity." },
  alt: { name: "ALT (liver enzyme)", plain: "An enzyme that rises when the liver is irritated." },
  ast: { name: "AST (liver enzyme)", plain: "An enzyme that rises with liver or muscle strain." },
  esr: { name: "ESR", plain: "A general marker of inflammation in the body." },
  "blood urea": { name: "Blood urea", plain: "Another waste marker used to assess kidneys." },
};

/* Generic clinical-term glossary ---------------------------------------- */

export const TERM_GLOSSARY: Record<string, string> = {
  rx: "the prescription symbol — from the Latin 'recipe', meaning 'take'",
  "c/o": "complains of — the symptoms the patient reported",
  dx: "diagnosis — what the doctor believes is the condition",
  "h/o": "history of — a condition the patient has had",
  "f/u": "follow-up — a return visit to review progress",
  review: "come back for reassessment after a set time",
  "mg": "milligrams — a unit of medicine strength",
  "ml": "milliliters — a unit of liquid volume",
  "iu": "international units — used for vitamins and hormones",
  "mg/dl": "milligrams per deciliter — a concentration in blood",
};
