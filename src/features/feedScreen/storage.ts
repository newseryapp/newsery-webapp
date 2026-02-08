import type { Feed, Article } from "./types";

const FEEDS_KEY = "newsery.webapp.feeds.v1";
const SAVED_KEY = "newsery.webapp.saved.v1";

export function loadFeeds(): Feed[] {
  try {
    const raw = localStorage.getItem(FEEDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    // bazı implementasyonlar { feeds: [...] } tutabilir:
    if (parsed && Array.isArray(parsed.feeds)) return parsed.feeds;
    return [];
  } catch {
    return [];
  }
}

export function loadSaved(): Article[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSaved(list: Article[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

