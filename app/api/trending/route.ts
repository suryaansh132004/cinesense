import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY missing" }, { status: 500 });
  }

  const url = new URL(`${TMDB_BASE}/trending/movie/week`);
  url.searchParams.set("api_key", API_KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: `TMDB error: ${res.status}` },
      { status: 500 }
    );
  }

  const data = await res.json();
  return NextResponse.json({ results: (data?.results ?? []).slice(0, 10) });
}