/**
 * Optional live-vision OCR. If OPENAI_API_KEY or ANTHROPIC_API_KEY is set in the
 * environment, the LUMEN agent upgrades from demo parsing to true multimodal OCR.
 */

const OCR_PROMPT = `You are a clinical OCR engine. Read this medical document image (doctor's prescription slip or lab report). Transcribe ALL visible text faithfully, preserving line structure: letterhead, patient, date, diagnosis lines (Dx), every medicine line with strength and dosing shorthand (e.g. Tab Metformin 500mg 1-0-1 PC x 90 days), advice lines, and for lab reports every test row with result, units, reference range and H/L flag. Output raw transcription only — no commentary.`;

export function visionMode(): "openai" | "anthropic" | null {
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
  } catch {
    return null;
  }
  return null;
}
