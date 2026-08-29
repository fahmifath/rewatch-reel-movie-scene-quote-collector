import { describe, it, expect } from "vitest";
import { validate, filterItems, formatDate, createItem, normalizeEntry, MOOD_TAGS, type QuoteEntry, type QuoteInput } from "../src/domain";

const makeInput = (o: Partial<QuoteInput> = {}): QuoteInput => ({
  quoteText: "You can't handle the truth!", movieTitle: "A Few Good Men", movieYear: "1992", character: "Col. Jessup", moodTag: "iconic", ...o,
});

const makeEntry = (o: Partial<QuoteEntry> = {}): QuoteEntry => ({
  id: "test-id-1", quoteText: "You can't handle the truth!", movieTitle: "A Few Good Men", movieYear: 1992, character: "Col. Jessup", moodTag: "iconic", dateAdded: "2024-03-15T10:00:00.000Z", ...o,
});

describe("validate", () => {
  it("validates inputs", () => {
    expect(validate(makeInput())).toEqual({});
    expect(validate(makeInput({ quoteText: "" })).quoteText).toBeDefined();
    expect(validate(makeInput({ quoteText: "   " })).quoteText).toBeDefined();
    expect(validate(makeInput({ quoteText: "a".repeat(501) })).quoteText).toMatch(/500/);
    expect(validate(makeInput({ quoteText: "a".repeat(500) })).quoteText).toBeUndefined();
    expect(validate(makeInput({ movieTitle: "" })).movieTitle).toBeDefined();
    expect(validate(makeInput({ movieTitle: "   " })).movieTitle).toBeDefined();
    expect(validate(makeInput({ movieTitle: "x".repeat(151) })).movieTitle).toBeDefined();
    expect(validate(makeInput({ movieYear: "" })).movieYear).toBeDefined();
    expect(validate(makeInput({ movieYear: "abc" })).movieYear).toBeDefined();
    expect(validate(makeInput({ movieYear: "1887" })).movieYear).toBeDefined();
    expect(validate(makeInput({ movieYear: "1888" })).movieYear).toBeUndefined();
    expect(validate(makeInput({ movieYear: "9999" })).movieYear).toBeDefined();
    expect(validate(makeInput({ movieYear: "199.5" })).movieYear).toBeDefined();
    expect(validate(makeInput({ moodTag: "" })).moodTag).toBeDefined();
    expect(validate(makeInput({ moodTag: "danger" })).moodTag).toBeDefined();
    for (const tag of MOOD_TAGS) expect(validate(makeInput({ moodTag: tag })).moodTag).toBeUndefined();
    expect(validate(makeInput({ character: "" }))).toEqual({});
    const errs = validate(makeInput({ quoteText: "", movieTitle: "", moodTag: "" }));
    expect(errs.quoteText && errs.movieTitle && errs.moodTag).toBeTruthy();
  });
});

describe("filterItems", () => {
  const items: QuoteEntry[] = [
    makeEntry({ id: "1", quoteText: "You can't handle the truth!", movieTitle: "A Few Good Men", character: "Col. Jessup", moodTag: "iconic" }),
    makeEntry({ id: "2", quoteText: "May the Force be with you.", movieTitle: "Star Wars", character: "Obi-Wan", moodTag: "motivating" }),
    makeEntry({ id: "3", quoteText: "Life is like a box of chocolates.", movieTitle: "Forrest Gump", character: "Forrest", moodTag: "hilarious" }),
    makeEntry({ id: "4", quoteText: "I'll be back.", movieTitle: "The Terminator", character: "Terminator", moodTag: "iconic" }),
  ];

  it("filters items properly without mutation", () => {
    expect(filterItems(items, "", "")).toHaveLength(4);
    expect(filterItems(items, "FORCE", "")[0]?.id).toBe("2");
    expect(filterItems(items, "forrest", "")[0]?.id).toBe("3");
    expect(filterItems(items, "obi-wan", "")[0]?.id).toBe("2");
    expect(filterItems(items, "", "iconic").map((i) => i.id)).toEqual(["1", "4"]);
    expect(filterItems(items, "back", "iconic")[0]?.id).toBe("4");
    expect(filterItems(items, "nomatch", "")).toHaveLength(0);
    expect(filterItems(items, "", "romantic")).toHaveLength(0);
    expect(filterItems(items, "chocolates", "iconic")).toHaveLength(0);
    expect(filterItems(items, "  force  ", "")).toHaveLength(1);
    const copy = [...items];
    filterItems(items, "force", "motivating");
    expect(items).toEqual(copy);
  });
});

describe("formatDate", () => {
  it("formats date strings and handles edge cases", () => {
    expect(formatDate("2024-03-15T10:00:00.000Z")).toBe("15 Mar 2024");
    expect(formatDate("2023-01-05T00:00:00.000Z")).toBe("05 Jan 2023");
    expect(formatDate("2022-12-31T23:59:59.000Z")).toBe("31 Dec 2022");
    expect(formatDate("not-a-date")).toBe("Unknown date");
    expect(formatDate("")).toBe("Unknown date");
    expect(formatDate("2024-03-01T00:00:00.000Z")).toBe("01 Mar 2024");
  });
});

describe("createItem", () => {
  it("creates item correctly", () => {
    const item = createItem(makeInput(), "cust-id", "2024-06-20T08:00:00.000Z");
    expect(item.id).toBe("cust-id");
    expect(item.dateAdded).toBe("2024-06-20T08:00:00.000Z");
    expect(item.movieYear).toBe(1992);
    const trimmed = createItem(makeInput({ quoteText: "  Hi  ", movieTitle: "  Movie  ", character: "  Hero  " }), "id", "now");
    expect(trimmed.quoteText).toBe("Hi");
    expect(trimmed.movieTitle).toBe("Movie");
    expect(trimmed.character).toBe("Hero");
    expect(createItem(makeInput({ character: "" }), "id", "now").character).toBe("");
  });
});

describe("normalizeEntry", () => {
  it("normalizes and rejects malformed entries", () => {
    const entry = makeEntry();
    expect(normalizeEntry(entry)).toEqual(entry);
    expect(normalizeEntry(null)).toBeNull();
    expect(normalizeEntry("abc")).toBeNull();
    expect(normalizeEntry(123)).toBeNull();
    expect(normalizeEntry([])).toBeNull();
    const { id: _, ...noId } = makeEntry();
    expect(normalizeEntry(noId)).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), id: "  " })).toBeNull();
    const { quoteText: __, ...noQuote } = makeEntry();
    expect(normalizeEntry(noQuote)).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), quoteText: "" })).toBeNull();
    const { movieTitle: ___, ...noTitle } = makeEntry();
    expect(normalizeEntry(noTitle)).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), movieTitle: "" })).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), movieYear: "1992" })).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), movieYear: 1800 })).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), movieYear: 3000 })).toBeNull();
    const { moodTag: ____, ...noMood } = makeEntry();
    expect(normalizeEntry(noMood)).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), moodTag: "invalid" })).toBeNull();
    const { dateAdded: _____, ...noDate } = makeEntry();
    expect(normalizeEntry(noDate)).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), dateAdded: "invalid-date" })).toBeNull();
    expect(normalizeEntry({ ...makeEntry(), character: "" })?.character).toBe("");
    const normalized = normalizeEntry({ ...makeEntry(), quoteText: "  quote  ", movieTitle: "  title  " });
    expect(normalized?.quoteText).toBe("quote");
    expect(normalized?.movieTitle).toBe("title");
  });
});