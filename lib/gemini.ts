type SentimentLabel = "positive" | "mixed" | "negative";

export type GeminiSentiment = {
  summary: string; // <= 250 words enforced
  highlights: string[]; // keep 3 bullets (nice for UI)
  sentiment: SentimentLabel;
};

function clampSentiment(v: unknown): SentimentLabel {
  return v === "positive" || v === "negative" ? (v as SentimentLabel) : "mixed";
}

function limitWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ").trim();
}

/**
 * Gemini sometimes wraps JSON in code fences or adds extra text.
 * This extracts the first JSON object (balanced braces) from the output.
 */
function extractJsonObject(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Balanced-brace scan
    const start = cleaned.indexOf("{");
    if (start === -1) throw new Error("No JSON object found in model output.");

    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        return JSON.parse(slice);
      }
    }

    throw new Error("JSON object was not properly closed.");
  }
}

function fallback(summary: string): GeminiSentiment {
  return {
    summary,
    highlights: ["AI unavailable", "Using fallback response", "Try again later"],
    sentiment: "mixed",
  };
}

export async function getAudienceSentimentFromGemini(input: {
  title: string;
  year?: string;
  rating?: number;
  reviews: string[];
}): Promise<GeminiSentiment> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallback("Add GEMINI_API_KEY to enable AI sentiment insights.");
  }

  // Requirements: max 20 reviews
  const MAX_REVIEWS = 20;

  // Keep the request bounded so it’s reliable on all titles
  const PER_REVIEW_CHARS = 1800;
  const TOTAL_CHARS = 20000;

  const collected: string[] = [];
  let used = 0;

  for (const r of (input.reviews || []).filter(Boolean).slice(0, MAX_REVIEWS)) {
    const chunk = r.slice(0, PER_REVIEW_CHARS);
    if (used + chunk.length > TOTAL_CHARS) break;
    collected.push(chunk);
    used += chunk.length;
  }

  if (collected.length === 0) {
    return fallback(
      "No audience reviews were returned by TMDB for this title, so sentiment couldn’t be generated."
    );
  }

  const prompt = `
You are analyzing audience reviews for a movie.

Movie: ${input.title}${input.year ? ` (${input.year})` : ""}
TMDB rating: ${input.rating ?? "N/A"} / 10

Important rules:
- Use ONLY the provided reviews. Do not claim external sources.
- Summary must be MAX 250 words.
- Return ONLY valid JSON (no markdown, no commentary) in this schema:
{
  "summary": "string (<=250 words)",
  "sentiment": "positive" | "mixed" | "negative",
  "highlights": ["string", "string", "string"]
}

Audience reviews (up to 20):
${collected.map((t, i) => `Review ${i + 1}: ${t}`).join("\n\n")}
`.trim();

  const model = "gemini-2.5-flash";

  const url =
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=` +
    encodeURIComponent(apiKey);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      
      if (res.status === 429) {
        return fallback("AI quota exceeded. Please try again later or upgrade your Gemini API plan.");
      }
      
      return fallback(`AI request failed (${res.status}).`);
    }

    const data = await res.json();

    console.log("Gemini full response:", JSON.stringify(data, null, 2));

    const candidate = data?.candidates?.[0];
    if (!candidate) {
      // Blocked/empty output
      return fallback("AI couldn’t generate insights right now. Try again.");
    }

    const rawText =
      candidate?.content?.parts?.map((p: any) => (p?.text ? String(p.text) : "")).join("").trim() ??
      "";

    console.log("Raw text from Gemini:", rawText);

    if (!rawText) {
      return fallback("AI returned an empty response. Try again.");
    }

    const parsed = extractJsonObject(rawText) as Partial<GeminiSentiment>;

    const summary = limitWords(String(parsed.summary ?? "").trim(), 250);
    const sentiment = clampSentiment(parsed.sentiment);

    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.map((h) => String(h).slice(0, 120)).slice(0, 3)
      : [];

    return {
      summary: summary || fallback("AI summary missing.").summary,
      sentiment,
      highlights: highlights.length === 3 ? highlights : fallback("AI highlights missing.").highlights,
    };
  } catch (err: any) {
    console.error("Gemini catch block error:", err?.message || err);
    return fallback("AI request failed due to a network/server error.");
  }
}