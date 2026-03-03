import { NextResponse } from "next/server";
import { findByImdb, getMovieDetails } from "@/lib/tmdb";
import { getAudienceSentimentFromGemini, type GeminiSentiment } from "@/lib/gemini";

function aiFallback(message: string): GeminiSentiment {
  return {
    summary: message,
    highlights: ["AI unavailable", "Movie details loaded", "Fallback used"],
    sentiment: "mixed",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tmdb = searchParams.get("tmdb");
  const imdb = searchParams.get("imdb");

  try {
    let movieId: number | null = null;

    if (tmdb) {
      const parsed = Number(tmdb);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ error: "Invalid TMDB id" }, { status: 400 });
      }
      movieId = parsed;
    } else if (imdb) {
      const findRes = await findByImdb(imdb);
      movieId = findRes?.movie_results?.[0]?.id ?? null;
    }

    if (!movieId) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const data = await getMovieDetails(String(movieId));

    const title = data?.title ?? "Unknown";
    const year = data?.release_date?.slice(0, 4);
    const rating = data?.vote_average;

    // TMDB reviews array → pass to Gemini (max 20 handled inside gemini.ts)
    const reviewTexts: string[] =
      data?.reviews?.results?.map((r: any) => r?.content).filter(Boolean) ?? [];

    let ai: GeminiSentiment = aiFallback("AI insights not available yet.");

    // Gemini is NON-CRITICAL: never crash the endpoint
try {
  console.log("Gemini key present?", Boolean(process.env.GEMINI_API_KEY));

  ai = await getAudienceSentimentFromGemini({
    title,
    year,
    rating,
    reviews: reviewTexts,
  });
} catch (err: any) {
  console.error("Gemini failed (non-fatal):", err?.message ?? err);
  ai = aiFallback("AI failed to generate insights. Please try again.");
}

    return NextResponse.json({ ...data, ai });
  } catch (err: any) {
    console.error("MOVIE ROUTE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}