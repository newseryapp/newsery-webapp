export type Feed = {
  id: string;
  name: string;
  mixLabel?: string; // "Economy, Politics, Science"
};

export type Article = {
  id: string;
  title: string;
  description?: string;
  sourceName?: string;
  publishedAt?: string; // ISO or display
  url: string;
  imageUrl?: string;
};

