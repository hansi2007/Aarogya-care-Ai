export type AgentKey = "vision" | "enrich" | "simplify" | "safety" | "companion" | "system";
export type AgentStatus = "idle" | "info" | "working" | "success" | "error";

export interface AgentMeta {
  key: AgentKey;
  codename: string;
  name: string;
  role: string;
  color: string;
  tools: string[];
}

export type MedForm =
  | "tablet"
  | "capsule"
  | "syrup"
  | "suspension"
  | "injection"
  | "ointment"
  | "cream"
  | "gel"
  | "drops"
  | "inhaler"
  | "gargle"
  | "sachet"
  | "powder"
  | "other";

export interface Medicine {
  id: string;
  name: string;
  rawLine: string;
  form: MedForm;
  strength?: string;
  sigCode?: string;
  /** e.g. [morning, noon, night] */
  perDay?: [number, number, number];
  timesPerDay?: number;
  frequency?: string;
  timing?: string;
  durationDays?: number;
  prn?: boolean;
  route?: string;
  notes?: string;
}

export interface Condition {
  code: string;
  name: string;
  plain: string;
}

export interface LabValue {
  test: string;
  value: string;
  flag?: "H" | "L";
  unit?: string;
  ref?: string;
  plain?: string;
}

export interface StructuredRx {
  doctor?: string;
  patient?: string;
  date?: string;
  conditions: Condition[];
  medicines: Medicine[];
  labs: LabValue[];
}

export type EnrichSource = "rxnav+fda" | "rxnav" | "fda" | "reference";

export interface EnrichedMed {
  medId: string;
  name: string;
  genericName?: string;
  brandNames?: string[];
  rxcui?: string;
  ingredientRxcui?: string;
  drugClass?: string;
  classPlain?: string;
  uses?: string;
  usesPlain?: string;
  howItWorks?: string;
  sideEffects: string[];
  warnings: string[];
  tips: string[];
  source: EnrichSource;
  fetchedLive: boolean;
}

export interface Interaction {
  drugA: string;
  drugB: string;
  severity: "high" | "moderate" | "low";
  description: string;
  plain?: string;
  source: "rxnav" | "local";
}

export interface GlossaryEntry {
  term: string;
  meaning: string;
}

export interface PlainStep {
  title: string;
  detail: string;
  kind: "med" | "advice" | "lab";
}

export interface PlainSummary {
  headline: string;
  overview: string;
  steps: PlainStep[];
  watchOut: string[];
  glossary: GlossaryEntry[];
}

export interface RoutineSlot {
  slot: "morning" | "noon" | "evening" | "bedtime" | "weekly";
  title: string;
  timeRange: string;
  foodRelation: "before_food" | "with_food" | "after_food" | "anytime";
  meds: Array<{
    name: string;
    dosage: string;
    instructions: string;
    purpose: string;
  }>;
}

export interface DoctorQuestion {
  question: string;
  reason: string;
}

export interface AnalysisPayload {
  rawText: string;
  structured: StructuredRx;
  enriched: EnrichedMed[];
  interactions: Interaction[];
  plain: PlainSummary;
  routine?: RoutineSlot[];
  doctorQuestions?: DoctorQuestion[];
  meta: {
    mode: "live" | "demo" | "text" | "pdf";
    visionNote?: string;
    agentsRun: string[];
  };
}

export interface RunEvent {
  id: number;
  runId: string;
  agent: AgentKey;
  agentName: string;
  status: AgentStatus;
  message: string;
  payload?: unknown;
  ts: string;
}
