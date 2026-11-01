/**
 * Clinical Vision OCR engine supporting Google Gemini, OpenAI, and Anthropic.
 * When GEMINI_API_KEY is present, LUMEN uses Gemini 3.8 Flash for state-of-the-art multimodal clinical OCR.
 */

import { GoogleGenAI } from "@google/genai";

const OCR_PROMPT = `You are a clinical OCR engine. Read this medical document image or PDF (doctor's prescription slip or lab report).
Transcribe ALL visible text faithfully, preserving line structure:
- Letterhead, Clinic/Hospital name, Doctor name, registration/credentials
- Patient name, age, gender, date, vitals
- Diagnosis lines (Dx), clinical indications
- Every medicine line with formulation, brand/generic name, strength, dosing shorthand (e.g. Tab Metformin 500mg 1-0-1 PC x 90 days, 1 tab BD AC)
- Doctor advice, precautions, follow-up dates
- For lab reports: every test row with test name, result value, units, reference range, and H/L/Abnormal flag.
If any handwriting is uncertain, mark it clearly with "[UNCERTAIN: ...]". Never guess illegible text.
Output raw transcription faithfully — no chit-chat or introductory commentary.`;

export function visionMode(): "gemini" | "openai" | "anthropic" | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function visionExtract(
  base64: string,
  mime: string,
): Promise<string | null> {
  const mode = visionMode();
  try {
    if (mode === "gemini") {
      const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mime || "image/png",
                  data: base64,
                },
              },
              {
                text: OCR_PROMPT,
              },
            ],
          },
        ],
      });
      return response.text?.trim() ?? null;
    }

    if (mode === "openai") {
      const model = process.env.OCR_MODEL || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: OCR_PROMPT },
                { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
              ],
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? null;
    }

    if (mode === "anthropic") {
      const model = process.env.OCR_MODEL || "claude-sonnet-4-5";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mime,
                    data: base64,
                  },
                },
                { type: "text", text: OCR_PROMPT },
              ],
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.content?.find((c: any) => c.type === "text")?.text;
      return text ?? null;
    }
  } catch (err: any) {
    console.warn("visionExtract error:", err.message || err);
    return null;
  }
  return null;
}
