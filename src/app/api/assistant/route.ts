import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analyses, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AnalysisPayload } from "@/lib/medical/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateRuleBasedAnswer(
  q: string,
  payload: AnalysisPayload | null,
): string {
  const query = q.toLowerCase();
  const meds = payload?.structured?.medicines || [];
  const enriched = payload?.enriched || [];
  const interactions = payload?.interactions || [];
  const conditions = payload?.structured?.conditions || [];

  // Missed dose question
  if (query.includes("miss") || query.includes("forgot") || query.includes("skip")) {
    return (
      "General Rule for Missed Doses: Take the missed dose as soon as you remember. " +
      "However, if it is almost time for your next scheduled dose, skip the missed dose and resume your regular schedule. " +
      "⚠️ CRITICAL: Never take two doses at once to make up for a missed one, especially with blood pressure or blood sugar medicines like " +
      (meds.map((m) => m.name).join(", ") || "your prescription") +
      ", as this could cause dangerously low sugar or low blood pressure."
    );
  }

  // Milk / Coffee / Food question
  if (query.includes("milk") || query.includes("coffee") || query.includes("tea") || query.includes("food") || query.includes("stomach")) {
    const hasMetformin = meds.some((m) => /metformin|glycomet/i.test(m.name));
    const hasGlimepiride = meds.some((m) => /glimepiride|amaryl/i.test(m.name));
    const hasAntibiotic = meds.some((m) => /amoxicillin|cipro|doxy|azithro/i.test(m.name));

    let advice = "Regarding food and drinks with your medicines:\n";
    if (hasMetformin) {
      advice += "• Metformin: Always take with or immediately after a meal to prevent nausea and stomach cramps. Milk or water is fine.\n";
    }
    if (hasGlimepiride) {
      advice += "• Glimepiride: Take 15–30 minutes BEFORE breakfast. You must eat breakfast after taking it to prevent blood sugar drops.\n";
    }
    if (hasAntibiotic) {
      advice += "• Antibiotics: Take with a full glass of water. Avoid taking iron or calcium supplements at the exact same hour as they can reduce absorption.\n";
    }
    advice += "• General: Avoid heavy caffeine or alcohol immediately before or after pills, as it can interfere with blood pressure and liver metabolism.";
    return advice;
  }

  // Painkiller / Paracetamol question
  if (query.includes("pain") || query.includes("headache") || query.includes("paracetamol") || query.includes("ibuprofen")) {
    const hasAmlodipine = meds.some((m) => /amlodipine|blood pressure/i.test(m.name));
    let advice = "Pain Relief Guidance:\n";
    advice += "• Paracetamol (up to 500mg-650mg) is generally the safest over-the-counter pain reliever for occasional mild headaches or body aches.\n";
    if (hasAmlodipine) {
      advice += "⚠️ Avoid frequent use of NSAIDs like Ibuprofen (Brufen) or Naproxen, because they cause fluid retention and weaken the blood pressure lowering effect of medicines like Amlodipine.\n";
    }
    advice += "Always check with your doctor or pharmacist if pain persists for more than 48 hours.";
    return advice;
  }

  // Alcohol / Diet precautions
  if (query.includes("alcohol") || query.includes("beer") || query.includes("drink") || query.includes("wine") || query.includes("diet") || query.includes("fruit")) {
    const hasStatin = meds.some((m) => /atorva|rosuva|statin/i.test(m.name));
    let advice = "Dietary & Lifestyle Precautions:\n";
    if (hasStatin) {
      advice += "• Grapefruit & Grapefruit Juice: Avoid eating large quantities of grapefruit or Seville oranges, as they block the breakdown of Atorvastatin, increasing side effect risk.\n";
    }
    advice += "• Alcohol: Strictly minimize or avoid alcohol. It increases liver strain, exaggerates dizziness from blood pressure tablets, and can trigger unpredictable blood sugar drops.\n";
    advice += "• Salt & Sugar: Keep daily sodium intake under 1 teaspoon, and avoid sweetened beverages or refined confectionery.";
    return advice;
  }

  // Side effects question
  if (query.includes("side effect") || query.includes("dizzy") || query.includes("nausea") || query.includes("swell")) {
    if (enriched.length > 0) {
      const topMeds = enriched.slice(0, 3);
      let res = "Common Expected Symptoms & What to Watch For:\n";
      for (const em of topMeds) {
        if (em.sideEffects?.length) {
          res += `• ${em.name}: May occasionally cause ${em.sideEffects.slice(0, 3).join(", ")}. Most mild effects subside within 1–2 weeks.\n`;
        }
      }
      res += "⚠️ Red Flag: Seek immediate emergency medical care if you notice facial swelling, breathing tightness, or severe dizziness.";
      return res;
    }
  }

  // Specific medicine match
  for (const m of meds) {
    if (query.includes(m.name.toLowerCase())) {
      const em = enriched.find((e) => e.medId === m.id || e.name.toLowerCase() === m.name.toLowerCase());
      return (
        `About ${m.name}${m.strength ? ` (${m.strength})` : ""}:\n` +
        `• Purpose: ${em?.usesPlain || "Clinical treatment prescribed by your doctor"}\n` +
        `• Form & Sig: ${m.form} · ${m.sigCode || m.frequency || "As scheduled"}\n` +
        `• Important Tip: ${em?.tips?.[0] || em?.warnings?.[0] || "Take consistently at the same hour each day."}`
      );
    }
  }

  // Default compassionate response with prescription context
  const medNames = meds.map((m) => m.name).join(", ");
  return (
    `Based on your prescription for ${medNames || "your medications"}` +
    (conditions.length ? ` (diagnosed for ${conditions.map((c) => c.name).join(", ")})` : "") +
    ":\n\n" +
    "Be sure to take each medicine consistently at the assigned time slots (morning, afternoon, or bedtime). " +
    "Drink plenty of water throughout the day, never double up on missed doses, and always speak to your prescribing physician or pharmacist before starting any new herbal remedy or over-the-counter medicine."
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, analysisId, runId } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Question cannot be empty" }, { status: 400 });
    }

    let payload: AnalysisPayload | null = null;

    if (analysisId) {
      const [rec] = await db.select().from(analyses).where(eq(analyses.id, analysisId)).limit(1);
      if (rec?.payload) payload = rec.payload as AnalysisPayload;
    } else if (runId) {
      const [rec] = await db.select().from(analyses).where(eq(analyses.runId, runId)).limit(1);
      if (rec?.payload) payload = rec.payload as AnalysisPayload;
    }

    // Try OpenAI or Anthropic if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const sysPrompt = `You are "Aarogya Sathi", a warm, empathetic, clinical patient assistant AI. 
The patient is asking a question about their prescription.
Prescription Context:
- Diagnoses: ${payload?.structured?.conditions?.map((c) => c.name + " (" + c.plain + ")").join(", ") || "Not specified"}
- Medicines: ${payload?.structured?.medicines?.map((m) => m.name + " " + (m.strength || "") + " (" + (m.sigCode || m.frequency || "") + ")").join("; ") || "Not specified"}
- Interactions Flagged: ${payload?.interactions?.map((i) => i.drugA + " + " + i.drugB + ": " + i.description).join("; ") || "None"}
- Watch Outs: ${payload?.plain?.watchOut?.join("; ") || "None"}

Rules:
1. Explain in clear, friendly, reassuring 5th-grade plain English.
2. Give actionable and concrete guidance (e.g. exact timing, food instructions).
3. If there are safety risks (e.g. doubling doses, high-risk combinations), highlight them clearly.
4. Always remind the patient to verify with their doctor for emergency symptoms.`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.3,
            max_tokens: 600,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: question },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const answer = data?.choices?.[0]?.message?.content;
          if (answer) {
            return NextResponse.json({ answer, source: "live-llm" });
          }
        }
      } catch (err) {
        console.warn("Live LLM query failed, using rule engine fallback:", err);
      }
    }

    // Fallback to our clinical knowledge engine
    const answer = generateRuleBasedAnswer(question, payload);
    return NextResponse.json({ answer, source: "clinical-engine" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Assistant request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
