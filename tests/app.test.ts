// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import html from "../index.html?raw";

function setupDom() { document.documentElement.innerHTML = html; localStorage.clear(); vi.resetModules(); }
async function boot() { (await import("../src/app")).init(); }
const entry = (id: string, o: Record<string, unknown> = {}) => ({
  id, quoteText: `Quote ${id}`, movieTitle: `Movie ${id}`, movieYear: 2000,
  character: "", moodTag: "iconic", dateAdded: "2024-01-01T00:00:00.000Z", ...o,
});

describe("app interaction", () => {
  beforeEach(setupDom);

  it("delete-confirm state stays in sync when a different action re-renders mid-flow", async () => {
    localStorage.setItem("rewatch-reel-quotes", JSON.stringify([entry("a")]));
    await boot();
    const grid = document.getElementById("quote-grid")!;
    const btn = grid.querySelector("[data-action='delete']") as HTMLButtonElement;
    btn.click();
    expect(btn.textContent).toBe("Confirm?");
    (document.getElementById("quote-text") as HTMLTextAreaElement).value = "New";
    (document.getElementById("movie-title") as HTMLInputElement).value = "New Movie";
    (document.getElementById("movie-year") as HTMLInputElement).value = "2020";
    (document.getElementById("mood-tag") as HTMLSelectElement).value = "hilarious";
    document.getElementById("quote-form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    const btnAfter = grid.querySelector('[data-id="a"] [data-action="delete"]') as HTMLButtonElement;
    expect(btnAfter.textContent).toBe("Delete");
    btnAfter.click();
    expect(grid.querySelector('[data-id="a"]')).not.toBeNull();
  });

  it("partial storage corruption keeps valid quotes and surfaces the failure banner", async () => {
    localStorage.setItem("rewatch-reel-quotes", JSON.stringify([entry("good"), entry("bad", { movieYear: 9999 })]));
    await boot();
    const grid = document.getElementById("quote-grid")!;
    const banner = document.getElementById("storage-banner")!;
    expect(grid.querySelectorAll(".card").length).toBe(1);
    expect(banner.classList.contains("banner--visible")).toBe(true);
    expect(banner.textContent).toMatch(/could not be restored/i);
  });
});