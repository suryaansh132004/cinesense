"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Star,
  Users,
  Film,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

type SentimentLabel = "positive" | "mixed" | "negative";

type SearchResult = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
};

type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

type Review = {
  id: string;
  author: string;
  content: string;
};

type MovieApiResponse = {
  id: number;
  title: string;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string | null;

  credits?: { 
    cast?: CastMember[];
    crew?: Array<{ id: number; name: string; job: string }>;
  };
  reviews?: { results?: Review[] };
  similar?: { results?: SearchResult[] };

  ai?: {
    summary: string;
    highlights: string[];
    sentiment: SentimentLabel;
  };
};

type Mode = "idle" | "searching" | "selecting" | "loading" | "ready" | "error" | "person";

const IMG_500 = "https://image.tmdb.org/t/p/w500";
const IMG_200 = "https://image.tmdb.org/t/p/w200";

function isImdbId(value: string) {
  return /^tt\d{7,10}$/i.test(value.trim());
}

function posterUrl(path?: string | null, size: "w200" | "w500" = "w500") {
  if (!path) return null;
  return `${size === "w200" ? IMG_200 : IMG_500}${path}`;
}

function sentimentStyles(label: SentimentLabel) {
  switch (label) {
    case "positive":
      return {
        chip: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-400/30 dark:text-emerald-300",
        glow: "shadow-[0_0_30px_rgba(16,185,129,0.18)]",
        title: "Positive",
      };
    case "mixed":
      return {
        chip: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-400/30 dark:text-amber-300",
        glow: "shadow-[0_0_30px_rgba(245,158,11,0.18)]",
        title: "Mixed",
      };
    case "negative":
      return {
        chip: "bg-rose-500/15 text-rose-700 ring-1 ring-rose-400/30 dark:text-rose-300",
        glow: "shadow-[0_0_30px_rgba(244,63,94,0.18)]",
        title: "Negative",
      };
  }
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [movie, setMovie] = useState<MovieApiResponse | null>(null);

  const [showReviews, setShowReviews] = useState(false);

  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingType, setTrendingType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [personData, setPersonData] = useState<any>(null);

  const inferredInput = useMemo(() => {
    const v = query.trim();
    if (!v) return "—";
    return isImdbId(v) ? "IMDb ID" : "Movie name";
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        let url = `/api/trending?type=${trendingType}`;
        if (selectedGenre || selectedYear) {
          url = `/api/discover?type=${trendingType}&genre=${selectedGenre}&year=${selectedYear}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load trending titles.");
        const data = await res.json();
        setTrending(Array.isArray(data?.results) ? data.results : []);
      } catch (e: any) {
        setTrendingError(e?.message || "Trending fetch failed.");
      }
    })();
  }, [trendingType, selectedGenre, selectedYear]);

  function resetState() {
    setErrorMsg(null);
    setMovie(null);
    setSearchResults([]);
    setShowReviews(false);
  }

  async function onSearch() {
    resetState();
    setShowSuggestions(false);

    const v = query.trim();
    if (!v) {
      setErrorMsg("Please enter an IMDb ID (tt…) or a movie name.");
      setMode("error");
      return;
    }

    try {
      if (isImdbId(v)) {
        setMode("loading");
        const res = await fetch(`/api/movie?imdb=${encodeURIComponent(v)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch movie by IMDb ID.");
        setMovie(data);
        setMode("ready");
        return;
      }

      setMode("searching");
      const res = await fetch(`/api/search?query=${encodeURIComponent(v)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to search movies.");

      const results: SearchResult[] = data?.results ?? [];
      if (results.length === 0) {
        setErrorMsg("No results found. Try another name.");
        setMode("error");
        return;
      }

      setSearchResults(results);
      setMode("selecting");
    } catch (e: any) {
      setErrorMsg(e?.message || "Something went wrong.");
      setMode("error");
    }
  }

  async function onPickResult(tmdbId: number) {
    setErrorMsg(null);
    setShowReviews(false);
    setShowSuggestions(false);

    try {
      setMode("loading");
      const res = await fetch(`/api/movie?tmdb=${encodeURIComponent(String(tmdbId))}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch movie details.");
      setMovie(data);
      setMode("ready");
    } catch (e: any) {
      setErrorMsg(e?.message || "Something went wrong.");
      setMode("error");
    }
  }

  async function onPickPerson(personId: number, personName: string) {
    setErrorMsg(null);
    setShowSuggestions(false);

    try {
      setMode("loading");
      const res = await fetch(`/api/person?id=${encodeURIComponent(String(personId))}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch person details.");
      setPersonData({ ...data, name: personName });
      setMode("person");
    } catch (e: any) {
      setErrorMsg(e?.message || "Something went wrong.");
      setMode("error");
    }
  }

  const reviews = movie?.reviews?.results ?? [];
  const cast = movie?.credits?.cast ?? [];
  const crew = movie?.credits?.crew ?? [];
  const directors = crew.filter((c: any) => c.job === "Director");
  const producers = crew.filter((c: any) => c.job === "Producer").slice(0, 3);
  const writers = crew.filter((c: any) => c.job === "Screenplay" || c.job === "Writer").slice(0, 3);
  
  // Determine sentiment based on TMDB rating
  const rating = movie?.vote_average ?? 0;
  let sentiment: SentimentLabel = "mixed";
  if (rating >= 7) sentiment = "positive";
  else if (rating >= 5) sentiment = "mixed";
  else sentiment = "negative";
  
  const s = sentimentStyles(sentiment);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* background blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute -top-24 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[420px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
        {/* header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              CineSense
            </h1>
          </div>

          <ThemeToggle />
        </div>

        {/* search card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/70 p-4 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10 md:p-5 relative z-50"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
            className="relative flex items-center gap-3"
          >
            <div className="flex-1">
              <input
                type="text"
                value={query}
                onChange={async (e) => {
                  const value = e.target.value;
                  setQuery(value);
                  
                  if (value.trim().length > 2 && !isImdbId(value)) {
                    try {
                      const res = await fetch(`/api/search?query=${encodeURIComponent(value)}`);
                      const data = await res.json();
                      if (res.ok) {
                        setSuggestions(data?.results?.slice(0, 5) ?? []);
                        setShowSuggestions(true);
                      }
                    } catch {
                      setSuggestions([]);
                    }
                  } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="IMDb ID or movie name"
                className="w-full h-14 rounded-2xl px-4 text-sm cs-input"
              />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-14 top-full mt-2 rounded-2xl p-2 z-50 cs-surface-solid">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={async () => {
                      setQuery(s.title);
                      setShowSuggestions(false);
                      resetState();
                      try {
                        setMode("searching");
                        const res = await fetch(`/api/search?query=${encodeURIComponent(s.title)}`);
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error || "Failed to search movies.");
                        const results: SearchResult[] = data?.results ?? [];
                        if (results.length === 0) {
                          setErrorMsg("No results found. Try another name.");
                          setMode("error");
                          return;
                        }
                        setSearchResults(results);
                        setMode("selecting");
                      } catch (e: any) {
                        setErrorMsg(e?.message || "Something went wrong.");
                        setMode("error");
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left cs-item-hover"
                  >
                    <div className="h-12 w-8 overflow-hidden rounded bg-black/10 dark:bg-white/10">
                      {posterUrl(s.poster_path, "w200") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={posterUrl(s.poster_path, "w200")!}
                          alt={s.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] text-black/50 dark:text-white/50">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">
                        {(s.release_date || "").slice(0, 4) || "—"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="h-14 px-6 rounded-2xl font-medium hover:opacity-90 transition cs-search-btn"
            >
              Search
            </button>
          </form>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] text-black/60 cs-pill dark:text-white/60">
            Detected: <span className="font-medium">{inferredInput}</span>
          </div>

          {errorMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-700 ring-1 ring-rose-400/20 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* loading */}
          {mode === "loading" && (
            <div className="mt-4 rounded-2xl p-4 cs-surface">
              <div className="text-sm text-black/60 dark:text-white/60">
                Fetching movie data…
              </div>
            </div>
          )}

          {/* results list */}
          {mode === "selecting" && searchResults.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onPickResult(r.id)}
                  className="group flex items-center gap-3 rounded-2xl cs-bubble p-4 text-left transition hover:-translate-y-0.5"
                >
                  <div className="h-16 w-12 overflow-hidden rounded-lg bg-black/10 dark:bg-white/10">
                    {posterUrl(r.poster_path, "w200") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterUrl(r.poster_path, "w200")!}
                        alt={r.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-black/50 dark:text-white/50">
                        No poster
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.title}</div>
                    <div className="mt-1 text-xs text-black/55 dark:text-white/55">
                      {(r.release_date || "").slice(0, 4) || "—"} •{" "}
                      {typeof r.vote_average === "number"
                        ? `${r.vote_average.toFixed(1)} / 10`
                        : "—"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Trending row */}
        {trending.length > 0 && mode !== "ready" && mode !== "loading" && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="text-sm font-medium text-black/70 dark:text-white/70">
                New & Trending
              </div>
              <select
                value={trendingType}
                onChange={(e) => {
                  setTrendingType(e.target.value as "movie" | "tv");
                  setSelectedGenre("");
                  setSelectedYear("");
                }}
                className="rounded-lg cs-bubble px-3 py-1 text-xs cursor-pointer cs-select"
              >
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
              </select>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="rounded-lg cs-bubble px-3 py-1 text-xs cursor-pointer cs-select"
              >
                <option value="">All Genres</option>
                <option value="28">Action</option>
                <option value="12">Adventure</option>
                <option value="16">Animation</option>
                <option value="35">Comedy</option>
                <option value="80">Crime</option>
                <option value="18">Drama</option>
                <option value="14">Fantasy</option>
                <option value="27">Horror</option>
                <option value="10749">Romance</option>
                <option value="878">Sci-Fi</option>
                <option value="53">Thriller</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-lg cs-bubble px-3 py-1 text-xs cursor-pointer cs-select"
              >
                <option value="">All Years</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {trending.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPickResult(m.id)}
                  className="group flex flex-col gap-3 rounded-2xl bg-gray-100 p-3 ring-1 ring-black/20 backdrop-blur-xl transition hover:-translate-y-0.5 hover:ring-black/30 dark:bg-white/[0.04] dark:ring-white/10 dark:hover:ring-white/20"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-black/10 dark:bg-white/10">
                    {posterUrl(m.poster_path, "w200") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterUrl(m.poster_path, "w200")!}
                        alt={m.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-black/50 dark:text-white/50">
                        No poster
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 text-left">
                    <div className="line-clamp-2 text-sm font-medium">{m.title}</div>
                    <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                      {(m.release_date || "").slice(0, 4) || "—"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* loading */}
        <AnimatePresence>
          {mode === "loading" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10"
            >
              <div className="text-sm text-black/60 dark:text-white/60">
                Fetching movie data…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* movie view */}
        <AnimatePresence>
          {mode === "ready" && movie && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <button
                type="button"
                onClick={() => {
                  setMode("idle");
                  setMovie(null);
                  setQuery("");
                }}
                className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-black/5 px-4 py-2 text-sm ring-1 ring-black/10 transition hover:bg-black/10 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to search
              </button>

              <div className="grid gap-4 md:grid-cols-[280px_1fr] md:items-start">
              {/* poster column */}
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10 md:self-start">
                <div className="overflow-hidden rounded-xl bg-black/10 dark:bg-white/10">
                  {posterUrl(movie.poster_path, "w500") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={posterUrl(movie.poster_path, "w500")!}
                      alt={movie.title}
                      className="h-auto w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[420px] w-full items-center justify-center text-sm text-black/55 dark:text-white/55">
                      No poster available
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(movie.genres ?? []).slice(0, 3).map((g) => (
                    <span
                      key={g.id}
                      className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/65 ring-1 ring-black/10 dark:bg-white/5 dark:text-white/65 dark:ring-white/10"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* content column */}
              <div className="grid gap-4">
                {/* hero */}
                <div className={`rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10 ${s.glow}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 text-xs text-black/55 dark:text-white/55">
                        <Film className="h-4 w-4" />
                        {(movie.release_date || "").slice(0, 4) || "—"} •{" "}
                        {movie.runtime ? `${movie.runtime} min` : "—"}
                      </div>

                      <h2 className="mt-2 text-2xl font-semibold">{movie.title}</h2>

                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-sm ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
                        <Star className="h-4 w-4" />
                        <span className="font-medium">
                          {typeof movie.vote_average === "number"
                            ? `${movie.vote_average.toFixed(1)} / 10`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${s.chip}`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      Overall sentiment: <span className="font-semibold">{s.title}</span>
                    </div>
                  </div>

                  {movie.overview && (
                    <p className="mt-4 text-sm leading-relaxed text-black/65 dark:text-white/70">
                      {movie.overview}
                    </p>
                  )}
                </div>

                {/* AI sentiment */}
                <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4" />
                      AI audience sentiment
                    </div>
                    <div className="text-xs text-black/45 dark:text-white/45">
                      Based on TMDB reviews
                    </div>
                  </div>

                  {movie.ai?.summary ? (
                    <>
                      <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
                        {movie.ai.summary}
                      </p>

                      {Array.isArray(movie.ai.highlights) && movie.ai.highlights.length > 0 && (
                        <div className="mt-4 grid gap-2">
                          {movie.ai.highlights.slice(0, 3).map((h, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl bg-black/5 px-4 py-3 text-sm ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
                            >
                              {h}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-black/60 dark:text-white/60">
                      No AI summary available yet (check Gemini key + API route).
                    </p>
                  )}
                </div>

                {/* crew */}
                <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                    <Film className="h-4 w-4" />
                    Crew
                  </div>

                  <div className="grid gap-3">
                    {directors.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs text-black/50 dark:text-white/50">Directors</div>
                        <div className="flex flex-wrap gap-2">
                          {directors.map((d: any) => (
                            <button
                              key={d.id}
                              onClick={() => onPickPerson(d.id, d.name)}
                              className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/65 ring-1 ring-black/10 hover:bg-black/10 transition dark:bg-white/5 dark:text-white/65 dark:ring-white/10 dark:hover:bg-white/10"
                            >
                              {d.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {writers.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs text-black/50 dark:text-white/50">Writers</div>
                        <div className="flex flex-wrap gap-2">
                          {writers.map((w: any) => (
                            <button
                              key={w.id}
                              onClick={() => onPickPerson(w.id, w.name)}
                              className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/65 ring-1 ring-black/10 hover:bg-black/10 transition dark:bg-white/5 dark:text-white/65 dark:ring-white/10 dark:hover:bg-white/10"
                            >
                              {w.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {producers.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs text-black/50 dark:text-white/50">Producers</div>
                        <div className="flex flex-wrap gap-2">
                          {producers.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => onPickPerson(p.id, p.name)}
                              className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/65 ring-1 ring-black/10 hover:bg-black/10 transition dark:bg-white/5 dark:text-white/65 dark:ring-white/10 dark:hover:bg-white/10"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* cast */}
                <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Cast
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {cast.slice(0, 9).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onPickPerson(c.id, c.name)}
                        className="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 text-left hover:bg-black/10 transition dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
                      >
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                          {c.character || ""}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* reviews */}
                <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10">
                  <button
                    type="button"
                    onClick={() => setShowReviews((v) => !v)}
                    className="flex w-full items-center justify-between"
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium">Audience reviews</div>
                      <div className="mt-1 text-xs text-black/45 dark:text-white/45">
                        Showing {Math.min(reviews.length, 3)} of {reviews.length}
                      </div>
                    </div>
                    {showReviews ? (
                      <ChevronUp className="h-5 w-5 text-black/50 dark:text-white/50" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-black/50 dark:text-white/50" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showReviews && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 grid gap-3 overflow-hidden"
                      >
                        {reviews.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            className="rounded-xl bg-black/5 p-4 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
                          >
                            <div className="text-xs text-black/45 dark:text-white/45">
                              @{r.author}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">
                              {r.content}
                            </p>
                          </div>
                        ))}

                        {reviews.length === 0 && (
                          <div className="text-sm text-black/60 dark:text-white/60">
                            No reviews returned by TMDB for this title.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* person view */}
        <AnimatePresence>
          {mode === "person" && personData && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <button
                type="button"
                onClick={() => {
                  setMode("idle");
                  setPersonData(null);
                }}
                className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-black/5 px-4 py-2 text-sm ring-1 ring-black/10 transition hover:bg-black/10 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 backdrop-blur-xl dark:bg-white/[0.04] dark:ring-white/10">
                <h2 className="text-2xl font-semibold mb-4">{personData.name}</h2>
                <div className="mb-3 text-sm font-medium">Filmography</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                  {(personData.movie_credits?.cast || []).slice(0, 20).map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onPickResult(m.id)}
                      className="group flex flex-col gap-3 rounded-2xl bg-black/5 p-3 ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:ring-black/20 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-white/20"
                    >
                      <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-black/10 dark:bg-white/10">
                        {posterUrl(m.poster_path, "w200") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={posterUrl(m.poster_path, "w200")!}
                            alt={m.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-black/50 dark:text-white/50">
                            No poster
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="line-clamp-2 text-sm font-medium">{m.title}</div>
                        <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                          {(m.release_date || "").slice(0, 4) || "—"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {trendingError && mode !== "ready" && mode !== "person" && (
          <div className="mt-3 text-center text-[11px] text-black/35 dark:text-white/30">
            Trending note: {trendingError}
          </div>
        )}
      </main>
    </div>
  );
}
