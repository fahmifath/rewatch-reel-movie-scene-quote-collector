import {
  MOOD_TAGS,
  validate,
  filterItems,
  formatDate,
  createItem,
  type QuoteEntry,
  type QuoteInput,
} from "./domain";
import { load, save } from "./storage";

let items: QuoteEntry[] = [];
let filterQuery = "";
let filterMood = "";
let deleteArmedId: string | null = null;
let deleteRevertTimer: ReturnType<typeof setTimeout> | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const liveRegion = $<HTMLElement>("live-region");
const storageBanner = $<HTMLElement>("storage-banner");
const grid = $<HTMLElement>("quote-grid");
const emptyCollection = $<HTMLElement>("empty-collection");
const emptyFilter = $<HTMLElement>("empty-filter");
const form = $<HTMLFormElement>("quote-form");
const filterQueryInput = $<HTMLInputElement>("filter-query");
const filterMoodSelect = $<HTMLSelectElement>("filter-mood");
const quoteCount = $<HTMLElement>("quote-count");

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function announce(message: string): void {
  liveRegion.textContent = "";
  requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

function reportFailure(message: string): void {
  storageBanner.textContent = message;
  storageBanner.classList.add("banner--visible");
  announce(`Error: ${message}`);
}

function dismissBanner(): void {
  storageBanner.classList.remove("banner--visible");
  storageBanner.textContent = "";
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCard(item: QuoteEntry): HTMLElement {
  const card = el("article", "card");
  card.dataset.id = item.id;
  card.dataset.mood = item.moodTag;
  card.appendChild(el("span", "card__badge", item.moodTag));

  const quoteWrap = el("blockquote", "card__quote");
  quoteWrap.appendChild(el("p", "card__quote-text", `"${item.quoteText}"`));
  card.appendChild(quoteWrap);

  const meta = el("footer", "card__meta");
  const titleYear = el("span", "card__title-year");
  titleYear.appendChild(el("cite", "card__title", item.movieTitle));
  titleYear.appendChild(el("span", "card__year", ` (${item.movieYear})`));
  meta.appendChild(titleYear);

  if (item.character) {
    meta.appendChild(el("span", "card__character", `— ${item.character}`));
  }

  const dateEl = el("time", "card__date", formatDate(item.dateAdded));
  (dateEl as HTMLTimeElement).setAttribute("datetime", item.dateAdded);
  meta.appendChild(dateEl);
  card.appendChild(meta);

  const deleteBtn = el("button", "card__delete btn btn--danger") as HTMLButtonElement;
  deleteBtn.textContent = "Delete";
  deleteBtn.setAttribute("aria-label", `Delete quote from ${item.movieTitle}`);
  deleteBtn.dataset.action = "delete";
  card.appendChild(deleteBtn);

  return card;
}

function render(): void {
  if (deleteRevertTimer !== null) {
    clearTimeout(deleteRevertTimer);
    deleteRevertTimer = null;
  }
  deleteArmedId = null;

  const filtered = filterItems(items, filterQuery, filterMood);
  quoteCount.textContent = `${items.length} quote${items.length !== 1 ? "s" : ""}`;

  if (items.length === 0) {
    grid.hidden = true;
    emptyFilter.hidden = true;
    emptyCollection.hidden = false;
    return;
  }

  if (filtered.length === 0) {
    grid.hidden = true;
    emptyCollection.hidden = true;
    emptyFilter.hidden = false;
    const queryDisplay = $("filter-query-display");
    if (queryDisplay) queryDisplay.textContent = filterQuery || filterMood;
    return;
  }

  emptyCollection.hidden = true;
  emptyFilter.hidden = true;
  grid.hidden = false;
  grid.innerHTML = "";
  for (const item of filtered) {
    grid.appendChild(createCard(item));
  }
}

function setFieldError(fieldId: string, message?: string): void {
  const field = $(fieldId);
  const errorEl = $(`${fieldId}-error`);
  if (!field) return;
  if (message) {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", `${fieldId}-error`);
    if (errorEl) errorEl.textContent = message;
  } else {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
    if (errorEl) errorEl.textContent = "";
  }
}

function clearAllErrors(): void {
  ["quote-text", "movie-title", "movie-year", "mood-tag"].forEach((id) => setFieldError(id));
}

function armDelete(itemId: string, btn: HTMLButtonElement, movieTitle: string): void {
  deleteArmedId = itemId;
  btn.textContent = "Confirm?";
  btn.setAttribute("aria-label", `Confirm deletion of quote from ${movieTitle}`);
  btn.classList.add("btn--armed");
  deleteRevertTimer = setTimeout(() => revertDelete(btn, movieTitle), 3000);
}

function revertDelete(btn: HTMLButtonElement, movieTitle: string): void {
  deleteArmedId = null;
  deleteRevertTimer = null;
  btn.textContent = "Delete";
  btn.setAttribute("aria-label", `Delete quote from ${movieTitle}`);
  btn.classList.remove("btn--armed");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAllErrors();
  dismissBanner();

  const data = new FormData(form);
  const input: QuoteInput = {
    quoteText: (data.get("quoteText") as string) ?? "",
    movieTitle: (data.get("movieTitle") as string) ?? "",
    movieYear: (data.get("movieYear") as string) ?? "",
    character: (data.get("character") as string) ?? "",
    moodTag: (data.get("moodTag") as string) ?? "",
  };

  const errors = validate(input);
  const errorKeys = Object.keys(errors) as (keyof typeof errors)[];

  if (errorKeys.length > 0) {
    const fieldIdMap: Record<string, string> = {
      quoteText: "quote-text",
      movieTitle: "movie-title",
      movieYear: "movie-year",
      moodTag: "mood-tag",
    };
    let firstFieldId = "";
    for (const key of errorKeys) {
      const fieldId = fieldIdMap[key];
      setFieldError(fieldId, errors[key]);
      if (!firstFieldId) firstFieldId = fieldId;
    }
    const firstField = $(firstFieldId);
    if (firstField) firstField.focus();
    announce(`Please fix ${errorKeys.length} error${errorKeys.length > 1 ? "s" : ""}: ${errorKeys.map((k) => errors[k]).join("; ")}`);
    return;
  }

  const newItem = createItem(input, generateId(), new Date().toISOString());
  items.unshift(newItem);

  if (!save(items)) {
    reportFailure("Your quote was added but could not be saved — it will be lost on refresh.");
  }

  render();
  const firstCard = grid.querySelector(".card") as HTMLElement | null;
  if (firstCard) firstCard.classList.add("card--new");

  form.reset();
  const quoteTextField = $("quote-text");
  if (quoteTextField) quoteTextField.focus();

  announce(`Quote from "${newItem.movieTitle}" added.`);
});

filterQueryInput.addEventListener("input", () => {
  filterQuery = filterQueryInput.value;
  render();
});

filterMoodSelect.addEventListener("change", () => {
  filterMood = filterMoodSelect.value;
  render();
});

function clearFilters(): void {
  filterQuery = "";
  filterMood = "";
  filterQueryInput.value = "";
  filterMoodSelect.value = "";
  render();
  announce("Filters cleared.");
}

$("clear-filters")?.addEventListener("click", clearFilters);
$("clear-filters-empty")?.addEventListener("click", clearFilters);

grid.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const btn = target.closest("[data-action='delete']") as HTMLButtonElement | null;
  if (!btn) return;
  const card = btn.closest(".card") as HTMLElement | null;
  if (!card) return;

  const itemId = card.dataset.id ?? "";
  const item = items.find((i) => i.id === itemId);
  if (!item) return;

  if (deleteArmedId === itemId) {
    if (deleteRevertTimer !== null) {
      clearTimeout(deleteRevertTimer);
      deleteRevertTimer = null;
    }
    deleteArmedId = null;
    items = items.filter((i) => i.id !== itemId);
    if (!save(items)) {
      reportFailure("Quote deleted but the change could not be saved — it may reappear on refresh.");
    }
    render();
    announce(`Quote from "${item.movieTitle}" deleted.`);
  } else {
    if (deleteArmedId !== null && deleteRevertTimer !== null) {
      clearTimeout(deleteRevertTimer);
      deleteRevertTimer = null;
      const prevCard = grid.querySelector(`[data-id="${deleteArmedId}"]`);
      if (prevCard) {
        const prevBtn = prevCard.querySelector("[data-action='delete']") as HTMLButtonElement | null;
        const prevItem = items.find((i) => i.id === deleteArmedId);
        if (prevBtn && prevItem) revertDelete(prevBtn, prevItem.movieTitle);
      }
      deleteArmedId = null;
    }
    armDelete(itemId, btn, item.movieTitle);
  }
});

function populateSelect(selectId: string, includeAll?: string, placeholder?: string): void {
  const sel = $(selectId) as HTMLSelectElement;
  if (!sel) return;
  if (placeholder) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.disabled = true;
    opt.selected = true;
    opt.textContent = placeholder;
    sel.appendChild(opt);
  }
  if (includeAll) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = includeAll;
    sel.appendChild(opt);
  }
  for (const tag of MOOD_TAGS) {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    sel.appendChild(opt);
  }
}

export function init(): void {
  populateSelect("mood-tag", undefined, "Select a mood…");
  populateSelect("filter-mood", "All moods");

  const result = load();
  switch (result.status) {
    case "ok":
      items = result.items;
      render();
      break;
    case "empty":
      items = [];
      render();
      break;
    case "error":
      items = [];
      reportFailure(result.message);
      render();
      break;
    default:
      void (result as never);
      reportFailure("An unexpected error occurred loading your quotes.");
  }
}
