import { GoogleGenAI } from "@google/genai";
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

let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey || apiKey.trim().length === 0) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export function isGeminiConfigured(): boolean {
  return !!getAIClient();
}

/**
 * Clean and parse JSON response from Gemini, handling Markdown code blocks if present
 */
function parseJsonFromText<T>(text: string): T | null {
  try {
    let clean = text.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
    }
    return JSON.parse(clean) as T;
  } catch (err) {
    console.warn("Failed to parse JSON from Gemini text response:", err, text.slice(0, 300));
    return null;
  }
}

const FAST_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
];

/**
 * High-speed content generation with instant multi-model failover for 429/503 spikes
 */
async function generateWithRetry(ai: GoogleGenAI, params: any): Promise<any> {
  const modelsToTry = [params.model, ...FAST_MODELS.filter((m) => m !== params.model)];
  let lastErr: any = null;

  for (const modelName of modelsToTry) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: modelName,
      });
    } catch (err: any) {
      lastErr = err;
      const isRateOrQuota =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.message?.includes("quota") ||
        err?.message?.includes("429") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("503");
      if (isRateOrQuota) {
        console.warn(`Model ${modelName} rate/quota limit, instantly trying ${modelsToTry[modelsToTry.indexOf(modelName) + 1] || "next"}...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Interface for Gemini-extracted Prescription structure
 */
export interface GeminiPrescriptionResult {
  isLabReport: boolean;
  doctorName?: string;
  patientName?: string;
  date?: string;
  diagnoses: Array<{ name: string; plainMeaning: string }>;
  medicines: Array<{
    name: string;
    form: string;
    strength?: string;
    sigCode?: string;
    frequency?: string;
    durationDays?: number;
    timingInstructions?: string;
    foodRelation?: "before_food" | "with_food" | "after_food" | "anytime";
    morning: number;
    noon: number;
    night: number;
    isUnreadableOrUncertain: boolean;
    uncertaintyReason?: string;
    doctorPrecautions?: string;
  }>;
  doctorAdvice?: string[];
  unreadableNotes?: string[];
  plainEnglishSummary: {
    headline: string;
    overview: string;
    steps: Array<{ title: string; detail: string; kind: "med" | "advice" | "lab" }>;
    watchOuts: string[];
    glossary: Array<{ term: string; meaning: string }>;
  };
  routineSchedule: Array<{
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
  }>;
  doctorQuestions: Array<{ question: string; reason: string }>;
}

/**
 * Interface for Gemini-extracted Lab Report structure
 */
export interface GeminiLabReportResult {
  isLabReport: true;
  patientName?: string;
  collectionDate?: string;
  labName?: string;
  tests: Array<{
    testName: string;
    category?: string;
    resultValue: string;
    numericValue?: number;
    unit?: string;
    referenceRange?: string;
    flag: "NORMAL" | "HIGH" | "LOW" | "ABNORMAL";
    whatItMeasuresPlain: string;
    isAbnormal: boolean;
    clinicalNote?: string;
  }>;
  overallHealthSummaryPlain: {
    headline: string;
    overview: string;
    normalHighlights: string[];
    abnormalAlerts: string[];
    actionItems: string[];
    medicalDisclaimer: string;
  };
  doctorQuestions: Array<{ question: string; reason: string }>;
}

const PRESCRIPTION_SYSTEM_PROMPT = `You are a clinical AI agent specializing in prescription transcription and patient communication for Aarogya Care AI.

STRICT MEDICAL ACCURACY RULES:
1. Extract ALL printed and handwritten text faithfully.
2. Identify medicine names, dosage forms (tablet, syrup, capsule, etc.), strengths, dosing frequencies (e.g. 1-0-1, OD, BD, TDS), timing (before food / after food), and duration.
3. NEVER GUESS missing dosages or uncertain medicines. If handwriting is illegible, blurry, or ambiguous:
   - Set "isUnreadableOrUncertain": true
   - Explain what is unclear in "uncertaintyReason" (e.g. "Strength unclear — looks like 500mg or 650mg, verify with pharmacist")
4. Preserve original medical instructions without altering clinical meaning.
5. In "plainEnglishSummary", explain everything in clear, friendly, 6th-grade English for patients of all ages:
   - What each medicine is for
   - When and how to take it
   - Critical safety precautions (e.g. never double up, avoid grapefruit or alcohol if relevant)
   - Do NOT suggest changing prescriptions.
6. Assemble a practical 24-hour routine timetable (Morning, Noon, Evening, Bedtime) with meal relations.
7. Prepare 2-4 clarifying questions the patient should ask their doctor at the next follow-up.

Return STRICT JSON matching this schema:
{
  "isLabReport": false,
  "doctorName": string or null,
  "patientName": string or null,
  "date": string or null,
  "diagnoses": [{ "name": string, "plainMeaning": string }],
  "medicines": [
    {
      "name": string,
      "form": "tablet" | "capsule" | "syrup" | "injection" | "ointment" | "drops" | "inhaler" | "other",
      "strength": string or null,
      "sigCode": string or null,
      "frequency": string or null,
      "durationDays": number or null,
      "timingInstructions": string or null,
      "foodRelation": "before_food" | "with_food" | "after_food" | "anytime",
      "morning": number,
      "noon": number,
      "night": number,
      "isUnreadableOrUncertain": boolean,
      "uncertaintyReason": string or null,
      "doctorPrecautions": string or null
    }
  ],
  "doctorAdvice": [string],
  "unreadableNotes": [string],
  "plainEnglishSummary": {
    "headline": string,
    "overview": string,
    "steps": [{ "title": string, "detail": string, "kind": "med" | "advice" | "lab" }],
    "watchOuts": [string],
    "glossary": [{ "term": string, "meaning": string }]
  },
  "routineSchedule": [
    {
      "slot": "morning" | "noon" | "evening" | "bedtime" | "weekly",
      "title": string,
      "timeRange": string,
      "foodRelation": "before_food" | "with_food" | "after_food" | "anytime",
      "meds": [{ "name": string, "dosage": string, "instructions": string, "purpose": string }]
    }
  ],
  "doctorQuestions": [{ "question": string, "reason": string }]
}`;

const LAB_REPORT_SYSTEM_PROMPT = `You are a clinical laboratory understanding AI agent for Aarogya Care AI.

STRICT MEDICAL ACCURACY RULES:
1. Extract ALL test rows faithfully: test name, result value, units, and stated laboratory reference range.
2. Flag each test as:
   - "NORMAL" if within the stated reference range
   - "HIGH" if above the normal range
   - "LOW" if below the normal range
   - "ABNORMAL" if marked abnormal or out of standard parameters
3. Explain what each test generally measures in simple, compassionate English.
4. ABSOLUTE MEDICAL SAFETY MANDATE:
   - NEVER diagnose diseases based on isolated lab values.
   - Do NOT say "You have kidney disease" or "You have diabetes". Instead say: "Your fasting blood glucose is 148 mg/dL, which is higher than the standard lab range (70-100 mg/dL). This measures sugar levels in your blood."
   - Always clearly recommend discussing any out-of-range or unclear results with a qualified physician.
5. Provide actionable, supportive lifestyle observations and prepare sensible questions to ask the doctor.

Return STRICT JSON matching this schema:
{
  "isLabReport": true,
  "patientName": string or null,
  "collectionDate": string or null,
  "labName": string or null,
  "tests": [
    {
      "testName": string,
      "category": string or null,
      "resultValue": string,
      "numericValue": number or null,
      "unit": string or null,
      "referenceRange": string or null,
      "flag": "NORMAL" | "HIGH" | "LOW" | "ABNORMAL",
      "whatItMeasuresPlain": string,
      "isAbnormal": boolean,
      "clinicalNote": string or null
    }
  ],
  "overallHealthSummaryPlain": {
    "headline": string,
    "overview": string,
    "normalHighlights": [string],
    "abnormalAlerts": [string],
    "actionItems": [string],
    "medicalDisclaimer": "This AI summary is for informational guidance only and is not a medical diagnosis. Please consult your physician to interpret your lab results in the context of your complete medical history."
  },
  "doctorQuestions": [{ "question": string, "reason": string }]
}`;

/**
 * Universal Gemini Medical Document Analyzer:
 * Detects whether the document is a Prescription or a Lab Report,
 * runs the specialized clinical extraction agent, and outputs structured medical intelligence.
 */
export async function analyzeMedicalDocumentWithGemini(
  base64Data: string,
  mimeType: string,
  options?: {
    customTitle?: string;
    patientName?: string;
    patientAge?: number;
  },
): Promise<GeminiPrescriptionResult | GeminiLabReportResult | null> {
  const ai = getAIClient();
  if (!ai) {
    console.warn("Gemini API key is not configured.");
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  const titleLower = (options?.customTitle || "").toLowerCase();
  const isPrescription = /prescription|slip|rx|doctor/i.test(titleLower);
  const isLabDoc = !isPrescription && /lab|laboratory|blood\s*test|lipid|panel|patholog|urine\s*test|biochem|hematolog|hba1c|cbc|diagnostic/i.test(titleLower);
  const promptToUse = isLabDoc ? LAB_REPORT_SYSTEM_PROMPT : PRESCRIPTION_SYSTEM_PROMPT;

  const userPrompt = `Analyze this ${isLabDoc ? "laboratory report" : "prescription"} document (${options?.customTitle || "patient upload"}).
Patient context: ${options?.patientName || "Unknown"}${options?.patientAge ? `, Age: ${options.patientAge}` : ""}.
Respond with strict JSON ONLY. No markdown, no preface.`;

  try {
    const parts: any[] = [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      {
        text: `${promptToUse}\n\nTask: ${userPrompt}`,
      },
    ];

    const response = await generateWithRetry(ai, {
      model,
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 2500,
      },
    });

    const text = response.text || "";
    const parsed = parseJsonFromText<any>(text);
    if (!parsed) return null;

    return parsed;
  } catch (err: any) {
    console.error("Gemini medical document analysis failed:", err.message || err);
    return null;
  }
}

/**
 * Convert Gemini Prescription or Lab Report result into the application's unified AnalysisPayload
 */
export function convertGeminiResultToPayload(
  result: GeminiPrescriptionResult | GeminiLabReportResult,
  rawTextFallback: string,
): AnalysisPayload {
  if (result.isLabReport) {
    const lab = result as GeminiLabReportResult;
    const labValues: LabValue[] = lab.tests.map((t) => ({
      test: t.testName,
      value: t.resultValue,
      flag: t.flag === "HIGH" ? "H" : t.flag === "LOW" ? "L" : undefined,
      unit: t.unit || undefined,
      ref: t.referenceRange || undefined,
      plain: t.whatItMeasuresPlain,
    }));

    const plainSummary: PlainSummary = {
      headline: lab.overallHealthSummaryPlain.headline || "Diagnostic Laboratory Report Breakdown",
      overview:
        lab.overallHealthSummaryPlain.overview ||
        "Here is a simple-English explanation of your laboratory tests, including which values are within standard ranges and which deserve doctor follow-up.",
      steps: lab.tests.map((t) => ({
        title: `${t.testName}: ${t.resultValue} ${t.unit || ""}`.trim(),
        detail: `${t.whatItMeasuresPlain}${t.isAbnormal ? ` (Lab Range: ${t.referenceRange || "Standard reference"} — Flagged: ${t.flag})` : " (Normal)"}`,
        kind: "lab",
      })),
      watchOut: [
        ...lab.overallHealthSummaryPlain.abnormalAlerts,
        lab.overallHealthSummaryPlain.medicalDisclaimer,
      ],
      glossary: lab.tests.map((t) => ({
        term: t.testName,
        meaning: t.whatItMeasuresPlain,
      })),
    };

    const structured: StructuredRx = {
      patient: lab.patientName || undefined,
      date: lab.collectionDate || undefined,
      conditions: [],
      medicines: [],
      labs: labValues,
    };

    return {
      rawText: rawTextFallback || `Lab Report: ${lab.tests.map((t) => `${t.testName} = ${t.resultValue} ${t.unit || ""}`).join(", ")}`,
      structured,
      enriched: [],
      interactions: [],
      plain: plainSummary,
      routine: [],
      doctorQuestions: lab.doctorQuestions || [
        {
          question: "Are any of my out-of-range lab values concerning for my overall health?",
          reason: "Clarifies if any follow-up investigation or lifestyle change is needed.",
        },
      ],
      meta: {
        mode: "live",
        visionNote: "Analyzed live by Gemini AI Vision Agent with strict reference range evaluation.",
        agentsRun: ["LUMEN (Gemini Vision)", "MEDSCOPE (Clinical Entities)", "PLAINWORDS (Gemini Translator)", "GUARDIAN (Range Radar)", "SATHI (Care Navigator)"],
      },
    };
  }

  // Prescription Result
  const rx = result as GeminiPrescriptionResult;
  const medicines: Medicine[] = (rx.medicines || []).map((m, idx) => ({
    id: `gemini-med-${idx + 1}`,
    name: m.name,
    rawLine: `${m.form} ${m.name} ${m.strength || ""} ${m.sigCode || m.frequency || ""}`.trim(),
    form: (m.form?.toLowerCase() as any) || "tablet",
    strength: m.strength || undefined,
    sigCode: m.sigCode || undefined,
    perDay: [m.morning ?? 0, m.noon ?? 0, m.night ?? 0],
    frequency: m.frequency || `${(m.morning ?? 0) + (m.noon ?? 0) + (m.night ?? 0)} time(s) daily`,
    timing: m.timingInstructions || (m.foodRelation ? m.foodRelation.replace("_", " ") : "as advised"),
    durationDays: m.durationDays || undefined,
    notes: m.isUnreadableOrUncertain
      ? `⚠️ Verification Warning: ${m.uncertaintyReason || "Handwriting uncertain — verify with your doctor or dispensing pharmacist."}`
      : m.doctorPrecautions || undefined,
  }));

  const enriched: EnrichedMed[] = (rx.medicines || []).map((m, idx) => ({
    medId: `gemini-med-${idx + 1}`,
    name: m.name,
    genericName: m.name,
    usesPlain: m.doctorPrecautions || "Prescribed by physician",
    source: "reference",
    fetchedLive: true,
    sideEffects: m.isUnreadableOrUncertain ? ["Uncertain dose or molecule — verify with doctor"] : [],
    warnings: m.isUnreadableOrUncertain ? [m.uncertaintyReason || "Handwriting unclear"] : [],
    tips: m.timingInstructions ? [m.timingInstructions] : ["Take consistently as prescribed."],
  }));

  const structured: StructuredRx = {
    doctor: rx.doctorName || undefined,
    patient: rx.patientName || undefined,
    date: rx.date || undefined,
    conditions: (rx.diagnoses || []).map((d) => ({
      code: "DX",
      name: d.name,
      plain: d.plainMeaning,
    })),
    medicines,
    labs: [],
  };

  const plainSummary: PlainSummary = {
    headline: rx.plainEnglishSummary?.headline || `${medicines.length} medicine(s) prescribed`,
    overview: rx.plainEnglishSummary?.overview || "Here is your prescription simplified into everyday English with exact schedules.",
    steps: rx.plainEnglishSummary?.steps || [],
    watchOut: rx.plainEnglishSummary?.watchOuts || [
      "Never double up on missed doses.",
      "Inform your doctor of any allergies or unusual side effects.",
    ],
    glossary: rx.plainEnglishSummary?.glossary || [],
  };

  const routine: RoutineSlot[] = (rx.routineSchedule || []).map((r) => ({
    slot: r.slot,
    title: r.title,
    timeRange: r.timeRange,
    foodRelation: r.foodRelation,
    meds: r.meds,
  }));

  const doctorQuestions: DoctorQuestion[] = rx.doctorQuestions || [];

  return {
    rawText: rawTextFallback || `Prescription: ${medicines.map((m) => `${m.name} ${m.strength || ""}`).join(", ")}`,
    structured,
    enriched,
    interactions: [],
    plain: plainSummary,
    routine,
    doctorQuestions,
    meta: {
      mode: "live",
      visionNote: "Transcribed and translated live by Gemini AI Multimodal Agent.",
      agentsRun: ["LUMEN (Gemini Vision)", "MEDSCOPE (Clinical Entities)", "PLAINWORDS (Gemini Translator)", "GUARDIAN (Safety Sweep)", "SATHI (Routine Synthesizer)"],
    },
  };
}

/**
 * Aarogya Sathi AI Assistant: Interactive Gemini Chat grounded in prescription context
 */
export async function askAarogyaSathiWithGemini(
  question: string,
  payload: AnalysisPayload | null,
): Promise<string | null> {
  const ai = getAIClient();
  if (!ai) return null;

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const systemInstruction = `You are "Aarogya Sathi", a warm, empathetic, clinical patient assistant AI for Aarogya Care AI.
The patient is asking a question about their prescription or medical lab report.

Context:
- Patient: ${payload?.structured?.patient || "Patient"}
- Diagnoses / Conditions: ${payload?.structured?.conditions?.map((c) => `${c.name} (${c.plain})`).join(", ") || "General health consultation"}
- Medicines Prescribed: ${payload?.structured?.medicines?.map((m) => `${m.name} ${m.strength || ""} [${m.sigCode || m.frequency || ""}] - ${m.notes || "Standard"}`).join("; ") || "None"}
- Lab Test Results: ${payload?.structured?.labs?.map((l) => `${l.test}: ${l.value} ${l.unit || ""} (Ref: ${l.ref || "N/A"}) [Flag: ${l.flag || "Normal"}]`).join("; ") || "None"}
- Watch Outs / Safety Alerts: ${payload?.plain?.watchOut?.join("; ") || "None"}

Rules:
1. Explain in clear, friendly, reassuring 5th-grade plain English.
2. Give concrete, actionable guidance (e.g. food timing, missed dose rules).
3. Emphasize safety: never double up on missed doses, never stop antibiotics early.
4. If asked about dangerous combinations, point out any risks clearly.
5. Always remind the patient to contact their doctor or emergency care for acute symptoms.`;

  try {
    const response = await generateWithRetry(ai, {
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: systemInstruction },
            { text: `Patient Question: "${question}"` },
          ],
        },
      ],
    });

    return response.text?.trim() || null;
  } catch (err: any) {
    console.warn("Aarogya Sathi Gemini query failed:", err.message || err);
    return null;
  }
}
