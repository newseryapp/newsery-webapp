import { useEffect, useMemo, useRef, useState } from "react";
import type { Article, Feed } from "./types";
import { loadFeeds, loadSaved, saveSaved } from "./storage";
import { fetchFeedFromApi, weightsToMix } from "./fetchFeed";
import { formatRelativeTime } from "../../app/utils/time";
import "./feedScreen.css";

type Mode = "list" | "reader";

function selectedToMix(selected: string[], size: number) {
  const cats = (selected || []).filter(Boolean);
  if (cats.length === 0) return {};

  const base = Math.floor(size / cats.length);
  const rem = size - base * cats.length;

  const mix: Record<string, number> = {};
  cats.forEach((c, i) => {
    mix[c] = base + (i < rem ? 1 : 0);
  });

  return mix;
}

export default function FeedScreenPage() {
  const feeds = useMemo<Feed[]>(() => loadFeeds(), []);
  const [activeFeedId, setActiveFeedId] = useState<string>(() => feeds[0]?.id || "");
  const [itemsByFeedId, setItemsByFeedId] = useState<Record<string, Article[]>>({});
  const [saved, setSaved] = useState<Article[]>(() => loadSaved());

  const [mode, setMode] = useState<Mode>("list");
  const [readerUrl, setReaderUrl] = useState<string>("");

  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTopByFeedId = useRef<Record<string, number>>({});

  const activeFeed = useMemo(
    () => feeds.find((f) => f.id === activeFeedId) || feeds[0],
    [feeds, activeFeedId],
  );
  const activeItems = useMemo(
    () => itemsByFeedId[activeFeedId] || [],
    [itemsByFeedId, activeFeedId],
  );

  // initial load items for first feed
  useEffect(() => {
    if (!activeFeedId) return;
    if (itemsByFeedId[activeFeedId]) return;

    let cancelled = false;
    (async () => {
      try {
        console.log("[activeFeed]", activeFeed);
        const feedAny = activeFeed as any;

        const rawMix =
          feedAny?.mix ??
          (feedAny?.weights && Object.keys(feedAny.weights).length > 0
            ? weightsToMix(feedAny.weights, 50)
            : feedAny?.selected?.length
              ? selectedToMix(feedAny.selected, 50)
              : {});
        console.log("[mix debug]", {
          hasMix: !!feedAny?.mix,
          weightsKeys: feedAny?.weights ? Object.keys(feedAny.weights).length : null,
          selectedLen: feedAny?.selected?.length ?? null,
          rawMix,
          rawMixKeys: Object.keys(rawMix || {}).length,
          rawMixSum: Object.values(rawMix || {}).reduce<number>(
            (sum, v) => sum + Number(v || 0),
            0,
          ),
        });
        console.log("[about to call]", {
          rawMix,
          rawMixKeys: Object.keys(rawMix || {}).length,
          rawMixSum: Object.values(rawMix || {}).reduce<number>(
            (sum, v) => sum + Number(v || 0),
            0,
          ),
        });
        const articles = await fetchFeedFromApi(rawMix, 50);
        if (cancelled) return;
        console.log(
          "[len/uniq]",
          articles.length,
          new Set(articles.map((a) => a.id)).size,
        );
        setItemsByFeedId((prev) => {
          if (prev[activeFeedId]) return prev;
          return { ...prev, [activeFeedId]: articles };
        });
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFeedId, activeFeed, itemsByFeedId]);

  // persist saved
  useEffect(() => {
    saveSaved(saved);
  }, [saved]);

  function openFeed(feedId: string) {
    // store current scrollTop
    if (listScrollRef.current && activeFeedId) {
      scrollTopByFeedId.current[activeFeedId] = listScrollRef.current.scrollTop;
    }

    setActiveFeedId(feedId);

    // ensure items exist
    if (!itemsByFeedId[feedId]) {
      const nextFeed = feeds.find((f) => f.id === feedId) || feeds[0];
      const feedAny = nextFeed as any;
      const rawMix =
        feedAny?.mix ??
        (feedAny?.weights && Object.keys(feedAny.weights).length > 0
          ? weightsToMix(feedAny.weights, 50)
          : feedAny?.selected?.length
            ? selectedToMix(feedAny.selected, 50)
            : {});
      console.log("[mix debug]", {
        hasMix: !!feedAny?.mix,
        weightsKeys: feedAny?.weights ? Object.keys(feedAny.weights).length : null,
        selectedLen: feedAny?.selected?.length ?? null,
        rawMix,
        rawMixKeys: Object.keys(rawMix || {}).length,
        rawMixSum: Object.values(rawMix || {}).reduce<number>(
          (sum, v) => sum + Number(v || 0),
          0,
        ),
      });
      console.log("[about to call]", {
        rawMix,
        rawMixKeys: Object.keys(rawMix || {}).length,
        rawMixSum: Object.values(rawMix || {}).reduce<number>(
          (sum, v) => sum + Number(v || 0),
          0,
        ),
      });

      fetchFeedFromApi(rawMix, 50)
        .then((articles) => {
          console.log(
            "[len/uniq]",
            articles.length,
            new Set(articles.map((a) => a.id)).size,
          );
          setItemsByFeedId((prev) => {
            if (prev[feedId]) return prev;
            return { ...prev, [feedId]: articles };
          });
        })
        .catch((err) => {
          console.error(err);
        });
    }

    // if we were in reader, go back to list when switching feed
    setMode("list");
    setReaderUrl("");

    // restore scroll (next tick)
    requestAnimationFrame(() => {
      const el = listScrollRef.current;
      if (!el) return;
      el.scrollTop = scrollTopByFeedId.current[feedId] || 0;
    });
  }

  function backToFeed() {
    setMode("list");
    setReaderUrl("");
    requestAnimationFrame(() => {
      const el = listScrollRef.current;
      if (!el) return;
      el.scrollTop = scrollTopByFeedId.current[activeFeedId] || 0;
    });
  }

  function isSaved(articleId: string) {
    return saved.some((a) => a.id === articleId);
  }

  function getFeedLabel(feed: Feed) {
    const anyFeed = feed as any;

    if (typeof anyFeed.mixLabel === "string" && anyFeed.mixLabel.trim()) {
      return anyFeed.mixLabel.trim();
    }

    const candidates = [
      anyFeed.categories,
      anyFeed.categoryIds,
      anyFeed.mix,
      anyFeed.selected,
    ];

    for (const v of candidates) {
      if (typeof v === "string" && v.trim()) return v.trim();
      if (Array.isArray(v) && v.length) {
        const parts = v
          .map((x) => {
            if (x == null) return "";
            if (typeof x === "string" || typeof x === "number") return String(x);
            if (typeof x === "object") return String(x.name ?? x.id ?? "");
            return "";
          })
          .filter(Boolean);

        if (parts.length) return parts.join(", ");
      }
    }

    if (anyFeed?.weights && typeof anyFeed.weights === "object") {
      const keys = Object.keys(anyFeed.weights);
      if (keys.length) return keys.join(", ");
    }

    return "";
  }

  function toggleSave(article: Article) {
    setSaved((prev) => {
      const exists = prev.some((a) => a.id === article.id);
      if (exists) return prev.filter((a) => a.id !== article.id);
      return [article, ...prev];
    });
  }

  async function share(url: string) {
    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ url });
        return;
      }
    } catch {
      // ignore
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied.");
    } catch {
      alert(url);
    }
  }

  return (
    <div className="fs-page">
      <div className="fs-grid">
        {/* LEFT: My Feeds */}
        <section className="fs-panel">
          <div className="fs-panelHead">MY FEEDS</div>
          <div className="fs-panelBody fs-leftList">
            {feeds.length === 0 ? (
              <div className="fs-empty">
                No feeds yet. Go to Dashboard and create one.
              </div>
            ) : (
              feeds.map((feed) => {
                const label = getFeedLabel(feed);

                return (
                  <div
                    key={feed.id}
                    className={`fs-feedCard ${
                      feed.id === activeFeedId ? "is-active" : ""
                    }`}
                  >
                    <div className="fs-feedTitle">{feed.name}</div>
                    {label ? (
                      <div className="fs-feedMetaLine clamp-1">{label}</div>
                    ) : null}
                    <button
                      className="fs-btn fs-btnPrimary"
                      onClick={() => openFeed(feed.id)}
                    >
                      Open Feed →
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* CENTER: Feed / Reader */}
        <section className="fs-panel fs-center">
          <div className="fs-panelHead fs-centerHead">
            <div className="fs-centerTitle">{activeFeed?.name || "FEED"}</div>
            {mode === "reader" ? (
              <button className="fs-btn fs-btnGhost" onClick={backToFeed}>
                ← Back
              </button>
            ) : null}
          </div>

          {mode === "list" ? (
            <div className="fs-panelBody fs-stream" ref={listScrollRef}>
              {activeItems.map((a) => (
                <article
                  key={a.id}
                  className="fs-articleCard"
                  onClick={() => {
                    window.open(a.url, "_blank", "noopener,noreferrer");
                  }}
                  role="button"
                >
                  {a.imageUrl ? (
                    <img className="fs-articleImg" src={a.imageUrl} alt="" />
                  ) : (
                    <div className="fs-articleImg fs-articleImgEmpty" />
                  )}
                  <div className="fs-articleContent">
                    <div className="fs-articleTitle clamp-2">{a.title}</div>
                    {a.description ? (
                      <div className="fs-articleDesc clamp-3">{a.description}</div>
                    ) : null}
                    <div className="fs-articleMeta">
                      <span>{a.sourceName || "Source"}</span>
                      <span className="fs-dot">•</span>
                      <span>{formatRelativeTime(a.publishedAt)}</span>
                    </div>

                    <div
                      className="fs-articleActions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="fs-linkBtn" onClick={() => share(a.url)}>
                        Share
                      </button>
                      <button className="fs-linkBtn" onClick={() => toggleSave(a)}>
                        {isSaved(a.id) ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="fs-panelBody fs-reader">
              <div className="fs-readerFrameWrap">
                <iframe className="fs-iframe" src={readerUrl} title="Article" />
              </div>
              <div className="fs-readerFallback">
                If this site can’t be embedded:
                <button
                  className="fs-linkBtn"
                  onClick={() => window.open(readerUrl, "_blank")}
                >
                  Open in new tab
                </button>
                <button className="fs-linkBtn" onClick={() => share(readerUrl)}>
                  Copy link
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Saved */}
        <section className="fs-panel">
          <div className="fs-panelHead">SAVED ARTICLES</div>
          <div className="fs-panelBody">
            <div className="fs-savedList">
              {saved.length === 0 ? (
                <div className="fs-empty">No saved articles yet.</div>
              ) : (
                saved.map((a) => (
                  <div
                    key={a.id}
                    className="fs-savedCard"
                    onClick={() =>
                      window.open(a.url, "_blank", "noopener,noreferrer")
                    }
                    role="button"
                  >
                    {a.imageUrl ? (
                      <img className="fs-savedImg" src={a.imageUrl} alt="" />
                    ) : (
                      <div className="fs-savedImg fs-articleImgEmpty" />
                    )}
                    <div className="fs-savedContent">
                      <div className="fs-savedTitle clamp-2">{a.title}</div>
                      <div className="fs-articleMeta">
                        <span>{a.sourceName || "Source"}</span>
                        <span className="fs-dot">•</span>
                        <span>{formatRelativeTime(a.publishedAt)}</span>
                      </div>
                      <div
                        className="fs-articleActions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="fs-linkBtn" onClick={() => share(a.url)}>
                          Share
                        </button>
                        <button
                          className="fs-linkBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(a);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
