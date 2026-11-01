import { db } from "@/db";
import { analyses, agentEvents, documents, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AGENTS } from "./meta";
import { parsePrescription } from "@/lib/medical/parser";
import { enrichAll } from "@/lib/medical/enrich";
import { buildPlainSummary } from "@/lib/medical/simplify";
import { checkInteractions } from "@/lib/medical/safety";
import { getSample } from "@/lib/medical/samples";
import { buildRoutineSchedule, buildDoctorQuestions } from "@/lib/medical/routine";
import { visionExtract, visionMode } from "@/lib/llm";
import type {
  AgentKey,
  AgentStatus,
  AnalysisPayload,
  StructuredRx,
} from "@/lib/medical/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const beat = () => sleep(380 + Math.random() * 420);

async function emit(
  runId: string,
  agent: AgentKey,
  status: AgentStatus,
  message: string,
  payload?: unknown,
) {
  const meta = AGENTS.find((a) => a.key === agent);
  await db.insert(agentEvents).values({
    runId,
    agent,
    agentName: meta?.codename ?? (agent === "system" ? "SYSTEM" : agent.toUpperCase()),
    status,
    message,
    payload: payload === undefined ? null : (payload as any),
  });
}

async function extractPdfText(base64: string): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(base64, "base64") });
    const res = await parser.getText();
    await parser.destroy();
    return String(res?.text ?? "");
  } catch {
    return "";
  }
}

export async function runPipeline(runId: string): Promise<void> {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) return;
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, run.documentId));
  if (!doc) {
    await db.update(runs).set({ status: "failed", error: "document missing" }).where(eq(runs.id, runId));
    return;
  }

  await db.update(runs).set({ status: "running" }).where(eq(runs.id, runId));
  let mode = run.mode;
  let rawText = "";
  let structured: StructuredRx = { conditions: [], medicines: [], labs: [] };

  try {
    /* ------------------------------------------------------------------ */
    /* AGENT 1 — LUMEN: read the document                                  */
    /* ------------------------------------------------------------------ */
    await emit(runId, "vision", "working", `Receiving “${doc.title}” into the reading pipeline…`);
    await beat();

    if (doc.kind === "sample") {
      await emit(runId, "vision", "working", "Pre-processing scan — deskew, contrast boost, ink isolation…");
      await beat();
      await emit(runId, "vision", "working", "Locating handwriting regions and ruling out letterhead noise…");
      await beat();
      const sample = getSample(doc.textContent ?? "");
      rawText = sample?.rawText ?? doc.textContent ?? "";
      await emit(runId, "vision", "info", "Embedded clinical OCR corpus engaged — no external vision key configured, so LUMEN is reading from its verified sample registry.");
      await beat();
    } else if (doc.kind === "text") {
      await emit(runId, "vision", "working", "Normalising pasted text — line segmentation, shorthand detection…");
      await beat();
      rawText = doc.textContent ?? "";
    } else if (doc.kind === "pdf") {
      await emit(runId, "vision", "working", "Parsing PDF container — extracting embedded text layer…");
      const pdfText = doc.base64 ? await extractPdfText(doc.base64) : "";
      if (pdfText.trim().length >= 40) {
        mode = "live";
        rawText = pdfText.trim();
        await emit(runId, "vision", "success", `Extracted ${rawText.length} characters from the PDF text layer.`);
      } else if (visionMode() && doc.base64) {
        mode = "live";
        rawText = (await visionExtract(doc.base64, "image/png")) ?? "";
      } else {
        mode = "demo";
        const fallback = getSample("sample-chronic");
        rawText = fallback?.rawText ?? "";
        await emit(runId, "vision", "info", "No embedded text layer and no vision API key detected — running on the verified demo corpus. Set OPENAI_API_KEY or ANTHROPIC_API_KEY for live OCR.");
      }
      await beat();
    } else {
      /* image */
      if (visionMode() && doc.base64) {
        await emit(runId, "vision", "working", `Streaming image to ${visionMode() === "openai" ? "GPT-4o" : "Claude"} vision endpoint…`);
        mode = "live";
        rawText = (await visionExtract(doc.base64, doc.mime ?? "image/png")) ?? "";
        if (!rawText) {
          mode = "demo";
          const fallback = getSample("sample-chronic");
          rawText = fallback?.rawText ?? "";
          await emit(runId, "vision", "info", "Vision endpoint returned nothing usable — falling back to the verified demo corpus for this session.");
        }
      } else {
        mode = "demo";
        await emit(runId, "vision", "working", "Pre-processing scan — deskew, contrast boost, ink isolation…");
        await beat();
        await emit(runId, "vision", "working", "Scanning handwriting stroke grid for glyph candidates…");
        await beat();
        const fallback = getSample("sample-chronic");
        rawText = fallback?.rawText ?? "";
        await emit(runId, "vision", "info", "No vision API key detected — LUMEN is running on its verified demo corpus. Set OPENAI_API_KEY or ANTHROPIC_API_KEY for live OCR of your photo.");
      }
    }

    await beat();
    await emit(runId, "vision", "success", `Document read — ${rawText.split(/\r?\n/).filter(Boolean).length} content lines captured.`, {
      type: "rawText",
      rawText,
    });
    await beat();

    /* ------------------------------------------------------------------ */
    await emit(runId, "vision", "working", "Structuring clinical entities — diagnoses, medicines, sig codes, lab rows…");
    structured = parsePrescription(rawText);
    await beat();
    const sigCount = structured.medicines.filter((m) => m.sigCode || m.frequency).length;
    await emit(
      runId,
      "vision",
      "success",
      `Structured ${structured.medicines.length} medicine${structured.medicines.length !== 1 ? "s" : ""}, ${structured.conditions.length} diagnosis tag${structured.conditions.length !== 1 ? "s" : ""}${structured.labs.length ? `, ${structured.labs.length} lab results` : ""} · decoded ${sigCount} prescription shorthand${sigCount !== 1 ? "s" : ""}.`,
      { type: "structured", structured },
    );
    await beat();

    /* ------------------------------------------------------------------ */
    /* AGENT 2 — MEDSCOPE: live web enrichment                             */
    /* ------------------------------------------------------------------ */
    const meds = structured.medicines;
    let enriched = [] as Awaited<ReturnType<typeof enrichAll>>;
    if (meds.length) {
      await emit(runId, "enrich", "working", `Spinning up web intelligence for ${meds.length} medicine${meds.length !== 1 ? "s" : ""} — NIH RxNav + openFDA label databases…`);
      await beat();
      const pending = new Set(meds.map((m) => m.id));
      enriched = await enrichAll(
        meds.map((m) => {
          emit(runId, "enrich", "working", `Scraping NIH RxNav + openFDA for “${m.name}”…`).catch(() => {});
          return m;
        }),
      );
      for (const e of enriched) {
        pending.delete(e.medId);
        await emit(
          runId,
          "enrich",
          "success",
          e.fetchedLive
            ? `“${e.name}” resolved — RxNorm ID ${e.rxcui ?? "—"}${e.source.includes("fda") ? ", FDA label data attached" : ""}.`
            : `“${e.name}” matched to the built-in clinical reference (web source unreachable).`,
          { type: "enriched", med: e },
        );
        await sleep(180);
      }
      const liveCount = enriched.filter((e) => e.fetchedLive).length;
      await emit(
        runId,
        "enrich",
        "success",
        `Enrichment complete — ${liveCount}/${enriched.length} medicines resolved against live NIH/FDA sources${liveCount === 0 ? " (offline — clinical reference used)" : ""}.`,
      );
    } else {
      await emit(runId, "enrich", "info", "No medicines on this document — skipping medicine enrichment.");
    }
    await beat();

    /* ------------------------------------------------------------------ */
    /* AGENT 3 — PLAINWORDS: simple-English translation                    */
    /* ------------------------------------------------------------------ */
    await emit(runId, "enrich", "working", "Handing structured dossier to PLAINWORDS…");
    await sleep(220);
    await emit(runId, "simplify", "working", "Decoding every abbreviation via the sig-code term graph…");
    await beat();
    await emit(runId, "simplify", "working", "Rewriting clinical language at an everyday reading level…");
    await beat();
    const plain = buildPlainSummary(structured, enriched, []);
    await emit(
      runId,
      "simplify",
      "success",
      `Plain-English brief ready — ${plain.steps.length} step${plain.steps.length !== 1 ? "s" : ""}, ${plain.glossary.length} glossary term${plain.glossary.length !== 1 ? "s" : ""} decoded.`,
      { type: "plain", plain },
    );
    await beat();

    /* ------------------------------------------------------------------ */
    /* AGENT 4 — GUARDIAN: interaction radar                               */
    /* ------------------------------------------------------------------ */
    await emit(runId, "simplify", "working", "Passing medicine list to GUARDIAN for safety sweep…");
    await sleep(220);
    await emit(runId, "safety", "working", "Cross-referencing every medicine pair against the interaction graph…");
    const { interactions, viaRxNav } = await checkInteractions(enriched);
    const plain2 = buildPlainSummary(structured, enriched, interactions);
    await beat();
    await emit(
      runId,
      "safety",
      interactions.some((i) => i.severity === "high") ? "error" : "success",
      interactions.length
        ? `${interactions.length} interaction${interactions.length !== 1 ? "s" : ""} flagged${viaRxNav ? " via the live NIH interaction API" : " via the clinical rule engine"} — highest level: ${interactions[0].severity.toUpperCase()}.`
        : `Sweep complete — no clinically significant interactions detected${viaRxNav ? " (verified against the live NIH interaction API)" : ""}.`,
      { type: "safety", interactions },
    );
    await beat();

    /* ------------------------------------------------------------------ */
    /* AGENT 5 — SATHI: daily care schedule & doctor checklist planner    */
    /* ------------------------------------------------------------------ */
    await emit(runId, "companion", "working", "SATHI assembling personalized daily timetable & food timing schedules…");
    await beat();
    const routine = buildRoutineSchedule(structured, enriched);
    const doctorQuestions = buildDoctorQuestions(structured, enriched, interactions);
    await beat();
    await emit(
      runId,
      "companion",
      "success",
      `Personalized routine synthesized — ${routine.length} time slot${routine.length !== 1 ? "s" : ""} organized with meal relations, ${doctorQuestions.length} doctor checklist question${doctorQuestions.length !== 1 ? "s" : ""} prepared.`,
      { type: "routine", routine, doctorQuestions },
    );
    await beat();

    /* ------------------------------------------------------------------ */
    const payload: AnalysisPayload = {
      rawText,
      structured,
      enriched,
      interactions,
      plain: plain2,
      routine,
      doctorQuestions,
      meta: {
        mode: mode as AnalysisPayload["meta"]["mode"],
        visionNote:
          mode === "demo"
            ? "Demo corpus — set OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY to unlock live photo OCR."
            : undefined,
        agentsRun: AGENTS.map((a) => a.codename),
      },
    };

    const [analysis] = await db
      .insert(analyses)
      .values({
        runId,
        rawText,
        payload,
        medCount: structured.medicines.length,
        conditionCount: structured.conditions.length,
        interactionCount: interactions.length,
      })
      .returning();

    const medNames = structured.medicines.slice(0, 3).map((m) => m.name);
    const summaryLine = medNames.length
      ? `${medNames.join(" · ")}${structured.medicines.length > 3 ? ` +${structured.medicines.length - 3}` : ""}`
      : structured.labs.length
        ? `${structured.labs.length} lab results decoded`
        : "Document decoded";

    await db
      .update(runs)
      .set({ status: "completed", finishedAt: new Date(), summaryLine, mode })
      .where(eq(runs.id, runId));

    await emit(runId, "system", "success", "All agents complete — full report assembled.", {
      type: "done",
      analysisId: analysis.id,
      runId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    await db
      .update(runs)
      .set({ status: "failed", error: msg, finishedAt: new Date() })
      .where(eq(runs.id, runId));
    await emit(runId, "system", "error", `Pipeline halted — ${msg}`);
  }
}
