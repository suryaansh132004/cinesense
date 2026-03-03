import { NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  try {
    const data = await searchMovies(query);

    return NextResponse.json({
      results: data.results.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}