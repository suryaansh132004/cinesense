import { NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("id");

  if (!personId) {
    return NextResponse.json({ error: "Missing person ID" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY missing" }, { status: 500 });
  }

  try {
    const url = new URL(`${TMDB_BASE}/person/${personId}`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("append_to_response", "movie_credits");

    const res = await fetch(url.toString());

    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
