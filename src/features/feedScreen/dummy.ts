import type { Article } from "./types";

function make(
  id: string,
  url: string,
  title: string,
  desc: string,
  source: string,
  publishedAt: string,
  imageUrl?: string,
): Article {
  return {
    id,
    url,
    title,
    description: desc,
    sourceName: source,
    publishedAt,
    imageUrl,
  };
}

export function getDummyArticles(feedId: string): Article[] {
  // feedId’ye göre ufak varyasyon
  const seed = feedId?.slice(0, 6) || "default";

  return [
    make(
      `a-${seed}-1`,
      "https://example.com/article-1",
      "Fortnite down – Server status and maintenance schedule for update 39.40",
      "While we love a good update, we could do without the excessive server downtime.",
      "Mirror • newsdata",
      "15h ago",
      "https://images.unsplash.com/photo-1520975958225-8f1bd1d7c71f?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-2`,
      "https://example.com/article-2",
      "If They Gave Grammys for Live Shows, the AmericanFest Salute to Neil Young Would Be a Contender",
      "The evening before Music’s Biggest Night, there is always Music’s Smallest but Mightiest Night...",
      "Variety • newsdata",
      "15h ago",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-3`,
      "https://example.com/article-3",
      "Netflix fans ‘gripped’ by twisty thriller based on ‘masterpiece’ novel",
      "The Netflix adaptation of the classic novel has been praised for its gripping twists and turns.",
      "Manchester Evening News • newsdata",
      "15h ago",
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-4`,
      "https://example.com/article-4",
      "MacBook Pro OLED: Everything We Know About Apple’s Next Big Leap",
      "Apple is preparing to introduce significant updates to its MacBook Pro lineup, combining...",
      "Geeky Gadgets",
      "1d ago",
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-5`,
      "https://example.com/article-5",
      "6 daily habits to slow aging, from a Harvard brain expert",
      "Long before “brain health” became a buzzword, Rudolph E. Tanzi was rewriting the science behind...",
      "Spokane Spokesman-Review",
      "10d ago",
      // image yok: no-image state test
    ),
    make(
      `a-${seed}-6`,
      "https://example.com/article-6",
      "How a simple pricing change reshaped the streaming wars",
      "Analysts say a small tweak in bundling strategy can ripple across the entire subscription economy.",
      "Tech Desk",
      "2d ago",
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-7`,
      "https://example.com/article-7",
      "Markets open mixed as investors watch inflation data",
      "Traders weighed earnings guidance against the latest macro signals ahead of the close.",
      "Finance Daily",
      "3d ago",
    ),
    make(
      `a-${seed}-8`,
      "https://example.com/article-8",
      "Space startups race to build cheaper satellites",
      "A new generation of modular platforms aims to shorten development cycles and cut launch costs.",
      "Science Wire",
      "4d ago",
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-9`,
      "https://example.com/article-9",
      "The small habit that makes big meetings shorter",
      "Teams that agree on one sentence before a call tend to finish earlier and decide faster.",
      "Worklife",
      "5d ago",
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-10`,
      "https://example.com/article-10",
      "A beginner’s guide to reading nutrition labels",
      "Here’s what to look for when comparing products and avoiding common marketing tricks.",
      "Health Brief",
      "6d ago",
    ),
    make(
      `a-${seed}-11`,
      "https://example.com/article-11",
      "Why electric grids are getting smarter (and more complex)",
      "Utilities are rolling out sensors and software, but the transition creates new reliability challenges.",
      "Energy Journal",
      "1w ago",
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=60",
    ),
    make(
      `a-${seed}-12`,
      "https://example.com/article-12",
      "The overlooked feature that makes laptops feel faster",
      "It’s not just the CPU—storage, memory, and thermal limits can dominate real-world performance.",
      "Product Lab",
      "2w ago",
      // image yok: no-image state test
    ),
  ];
}

export function getDummyArticlesSized(
  feedId: string,
  size = 50,
): Article[] {
  const base = getDummyArticles(feedId);
  if (!base.length || size <= 0) return [];

  return Array.from({ length: size }, (_, idx) => {
    const source = base[idx % base.length];
    const serial = idx + 1;

    return {
      ...source,
      id: `${source.id}-${serial}`,
      url: `${source.url}?feed=${encodeURIComponent(feedId || "default")}&item=${serial}`,
      title: `${source.title} #${serial}`,
    };
  });
}
