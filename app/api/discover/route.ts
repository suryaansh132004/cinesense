import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

export async function GET(request: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY missing" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "movie";
  const genre = searchParams.get("genre") || "";
  const year = searchParams.get("year") || "";

  const mediaType = type === "tv" ? "tv" : "movie";
  const url = new URL(`${TMDB_BASE}/discover/${mediaType}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("sort_by", "popularity.desc");
  
  if (genre) url.searchParams.set("with_genres", genre);
  if (year) {
    if (mediaType === "movie") {
      url.searchParams.set("primary_release_year", year);
    } else {
      url.searchParams.set("first_air_date_year", year);
    }
  }

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: `TMDB error: ${res.status}` },
      { status: 500 }
    );
  }

  const data = await res.json();
  return NextResponse.json({ results: (data?.results ?? []).slice(0, 20) });
}
