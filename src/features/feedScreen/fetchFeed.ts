import type { Article } from "./types";

type Mix = Record<string, number>;

export function weightsToMix(
  weights: Record<string, number>,
  size: number,
): Record<string, number> {
  const entries = Object.entries(weights);
  if (entries.length === 0) return {};

  const totalWeight = entries.reduce((s, [, w]) => s + w, 0);
  if (totalWeight <= 0) return {};

  const mix: Record<string, number> = {};
  for (const [cat, w] of entries) {
    // minimum 1 item garanti
    mix[cat] = Math.max(1, Math.round((w / totalWeight) * size));
  }

  return mix;
}

export async function fetchFeedFromApi(
  mix: Mix,
  size = 50,
  mode = "initial",
): Promise<Article[]> {
  if (!mix || Object.keys(mix).length === 0) {
    return [];
  }

  console.log("[feed req]", {
    size,
    mix,
    mixKeys: Object.keys(mix || {}).length,
    mixSum: Object.values(mix || {}).reduce<number>(
      (sum, v) => sum + Number(v || 0),
      0,
    ),
  });

  const res = await fetch("/api/feed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      mix,
      size,
      mode,
    }),
  });

  if (!res.ok) {
    throw new Error(`Feed API error: ${res.status}`);
  }

  const data = await res.json();
  console.log("[feed res]", { count: data.count, mix: data.mix });

  // API -> UI uyarlaması (minimal)
  return (data.items || []).map((item: any) => ({
    id:
      item.url ??
      (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now())),
    url: item.url,
    title: item.title,
    description: item.description,
    sourceName: item.sourceName,
    publishedAt: item.publishedAt,
    imageUrl: item.imageUrl,
  }));
}
