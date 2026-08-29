import { type QuoteEntry, normalizeEntry } from "./domain";

const STORAGE_KEY = "rewatch-reel-quotes";

export type LoadResult =
  | { status: "ok"; items: QuoteEntry[] }
  | { status: "empty" }
  | { status: "partial"; items: QuoteEntry[]; message: string }
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
    let dropped = 0;
    for (const entry of parsed) {
      const normalized = normalizeEntry(entry);
      if (normalized !== null) items.push(normalized);
      else dropped++;
    }

    if (dropped > 0 && items.length === 0) {
      return { status: "error", message: "Stored quotes were corrupt and could not be restored." };
    }
    if (dropped > 0) {
      return {
        status: "partial",
        items,
        message: `${dropped} saved quote${dropped === 1 ? "" : "s"} could not be restored due to corrupted data.`,
      };
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