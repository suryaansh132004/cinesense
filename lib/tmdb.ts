const TMDB_BASE = "https://api.themoviedb.org/3";

const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ TMDB_API_KEY missing");
}

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY ?? "");

  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  );

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status}`);
  }

  return res.json();
}

export async function searchMovies(query: string) {
  return tmdbFetch("/search/movie", {
    query,
    include_adult: "false",
  });
}

export async function getMovieDetails(movieId: string) {
  return tmdbFetch(`/movie/${movieId}`, {
    append_to_response: "credits,reviews,similar",
  });
}

export async function findByImdb(imdbId: string) {
  return tmdbFetch(`/find/${imdbId}`, {
    external_source: "imdb_id",
  });
}