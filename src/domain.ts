export const MOOD_TAGS = ["motivating", "hilarious", "heartbreaking", "iconic", "suspenseful", "romantic"] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

export interface QuoteEntry {
  id: string;
  quoteText: string;
  movieTitle: string;
  movieYear: number;
  character: string;
  moodTag: MoodTag;
  dateAdded: string;
}

export interface QuoteInput {
  quoteText: string;
  movieTitle: string;
  movieYear: string;
  character: string;
  moodTag: string;
}

export interface ValidationErrors {
  quoteText?: string;
  movieTitle?: string;
  movieYear?: string;
  moodTag?: string;
}

const MAX_QUOTE = 500;
const MAX_TITLE = 150;
const CURRENT_YEAR = 2026;

export function validate(input: QuoteInput): ValidationErrors {
  const errs: ValidationErrors = {};
  const quote = input.quoteText?.trim() ?? "";
  const title = input.movieTitle?.trim() ?? "";
  const yearStr = input.movieYear?.trim() ?? "";
  const yearNum = parseInt(yearStr, 10);

  if (!quote) errs.quoteText = "Quote text is required.";
  else if (quote.length > MAX_QUOTE) errs.quoteText = `Quote must be ${MAX_QUOTE} characters or fewer.`;

  if (!title) errs.movieTitle = "Movie title is required.";
  else if (title.length > MAX_TITLE) errs.movieTitle = `Title must be ${MAX_TITLE} characters or fewer.`;

  if (!yearStr) errs.movieYear = "Movie year is required.";
  else if (isNaN(yearNum) || !Number.isInteger(yearNum) || String(yearNum) !== yearStr) errs.movieYear = "Year must be a whole number.";
  else if (yearNum < 1888 || yearNum > CURRENT_YEAR) errs.movieYear = `Year must be between 1888 and ${CURRENT_YEAR}.`;

  if (!input.moodTag || !(MOOD_TAGS as readonly string[]).includes(input.moodTag)) {
    errs.moodTag = "Please select a mood tag.";
  }
  return errs;
}

export function createItem(input: QuoteInput, id: string, now: string): QuoteEntry {
  return {
    id,
    quoteText: input.quoteText.trim(),
    movieTitle: input.movieTitle.trim(),
    movieYear: parseInt(input.movieYear, 10),
    character: input.character.trim(),
    moodTag: input.moodTag as MoodTag,
    dateAdded: now,
  };
}

export function filterItems(items: QuoteEntry[], query: string, moodTag: string): QuoteEntry[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesQuery =
      !q ||
      item.quoteText.toLowerCase().includes(q) ||
      item.movieTitle.toLowerCase().includes(q) ||
      item.character.toLowerCase().includes(q);
    const matchesMood = !moodTag || item.moodTag === moodTag;
    return matchesQuery && matchesMood;
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Unknown date";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function normalizeEntry(raw: unknown): QuoteEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id.trim()) return null;
  if (typeof r.quoteText !== "string" || !r.quoteText.trim()) return null;
  if (typeof r.movieTitle !== "string" || !r.movieTitle.trim()) return null;
  if (typeof r.movieYear !== "number" || !Number.isInteger(r.movieYear) || r.movieYear < 1888 || r.movieYear > CURRENT_YEAR) return null;
  if (typeof r.character !== "string") return null;
  if (typeof r.moodTag !== "string" || !(MOOD_TAGS as readonly string[]).includes(r.moodTag)) return null;
  if (typeof r.dateAdded !== "string" || isNaN(new Date(r.dateAdded).getTime())) return null;

  return {
    id: r.id.trim(),
    quoteText: r.quoteText.trim(),
    movieTitle: r.movieTitle.trim(),
    movieYear: r.movieYear,
    character: r.character.trim(),
    moodTag: r.moodTag as MoodTag,
    dateAdded: r.dateAdded,
  };
}
