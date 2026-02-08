// src/app/constants/categories.ts

export const CATEGORIES = [
  { id: "economy", label: "Economy" },
  { id: "markets", label: "Markets" },
  { id: "personal_finance", label: "Personal Finance" },
  { id: "politics", label: "Politics" },
  { id: "technology", label: "Technology" },
  { id: "science", label: "Science" },
  { id: "health", label: "Health" },
  { id: "entertainment", label: "Entertainment" },
  { id: "culture_art", label: "Culture & Arts" },

  { id: "sports_nfl", label: "Sports / NFL" },
  { id: "sports_nba", label: "Sports / NBA" },
  { id: "sports_mlb", label: "Sports / MLB" },
  { id: "sports_football", label: "Sports / Football" },
  { id: "sports_other", label: "Sports / Other" },
] as const;

// ✅ Geriye uyumluluk (eski kodlar string array bekliyor olabilir)
export const CATEGORY_LABELS = CATEGORIES.map((c) => c.label) as unknown as readonly string[];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as unknown as readonly string[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type CategoryLabel = (typeof CATEGORIES)[number]["label"];

// ✅ Eski type ismini kullanan yerler kırılmasın diye:
export type CategoryName = CategoryLabel;

// helpers
export function labelToId(label: string): string | undefined {
  return CATEGORIES.find((c) => c.label === label)?.id;
}
export function idToLabel(id: string): string | undefined {
  return CATEGORIES.find((c) => c.id === id)?.label;
}
