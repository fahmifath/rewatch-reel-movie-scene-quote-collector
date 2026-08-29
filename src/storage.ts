import { type QuoteEntry, normalizeEntry } from "./domain";

const STORAGE_KEY = "rewatch-reel-quotes";

export type LoadResult =
  | { status: "ok"; items: QuoteEntry[] }
  | { status: "empty" }
  | { status: "error"; message: string };

export function load(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { status: "empty" };

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { status: "error", message: "Stored data was in an unexpected format and could not be loaded." };
    }

    const items: QuoteEntry[] = [];
    for (const entry of parsed) {
      const normalized = normalizeEntry(entry);
      if (normalized !== null) items.push(normalized);
    }

    if (items.length === 0 && parsed.length > 0) {
      return { status: "error", message: "Stored quotes were corrupt and could not be restored." };
    }

    return items.length === 0 ? { status: "empty" } : { status: "ok", items };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "error", message: `Could not read saved quotes: ${msg}` };
  }
}

export function save(items: QuoteEntry[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
