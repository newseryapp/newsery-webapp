const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * - ISO string ise "13 min ago / 5 h ago / 1 d ago" üretir
 * - Zaten "15h ago" / "1 d ago" / "... ago" gibi hazır gelmişse aynen döner
 * - Boş/geçersizse "" döner
 */
export function formatRelativeTime(input?: string): string {
  if (!input) return "";

  const s = input.trim();
  if (!s) return "";

  const looksRelative =
    /ago$/i.test(s) ||
    /\b\d+\s*(sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\b/i.test(s);

  if (looksRelative) return s;

  const t = Date.parse(s);
  if (Number.isNaN(t)) return s;

  const diff = Date.now() - t;

  if (diff < 0) return "Just now";
  if (diff < 60 * SEC) return "Just now";
  if (diff < 60 * MIN) return `${Math.floor(diff / MIN)} min ago`;
  if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)} h ago`;
  return `${Math.floor(diff / DAY)} d ago`;
}
