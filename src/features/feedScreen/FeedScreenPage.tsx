import { useEffect, useMemo, useRef, useState } from "react";
import type { Article, Feed } from "./types";
import { loadFeeds, loadSaved, saveSaved } from "./storage";
import { fetchFeedFromApi, weightsToMix } from "./fetchFeed";
import { getDummyArticlesSized } from "./dummy";
import { formatRelativeTime } from "../../app/utils/time";
import AdSlotInline from "./components/AdSlotInline";
import AdSlotRail from "./components/AdSlotRail";
import "./feedScreen.css";

type Mode = "list" | "reader";
type FeedAdItem = { kind: "ad"; id: string };
const FS_PANEL_COUNT = 3;

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

function injectInlineAds<T extends { id: string }>(
  items: T[],
  interval = 10,
): Array<T | FeedAdItem> {
  if (!items || items.length === 0) return [];

  const out: Array<T | FeedAdItem> = [];
  let slotCount = 0;

  for (let i = 0; i < items.length; i++) {
    out.push(items[i]);

    const isBoundary = (i + 1) % interval === 0;
    const notLastItem = i !== items.length - 1;

    if (isBoundary && notLastItem) {
      slotCount++;
      out.push({ kind: "ad", id: `ad-inline-${slotCount}` });
    }
  }

  return out;
}

export default function FeedScreenPage() {
  const feeds = useMemo<Feed[]>(() => loadFeeds(), []);
  const [activeFeedId, setActiveFeedId] = useState<string>(() => feeds[0]?.id || "");
  const [itemsByFeedId, setItemsByFeedId] = useState<Record<string, Article[]>>({});
  const [saved, setSaved] = useState<Article[]>(() => loadSaved());
  const useDummyFeed = import.meta.env.VITE_USE_DUMMY_FEED === "true";
  const dummyFeedIdFallback = "dummy-default";

  const [mode, setMode] = useState<Mode>("list");
  const [readerUrl, setReaderUrl] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState(1);

  const fsScrollerRef = useRef<HTMLDivElement | null>(null);
  const fsScrollEndTimerRef = useRef<number | null>(null);
  const fsProgrammaticTimerRef = useRef<number | null>(null);
  const isInitRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const isScrollSessionRef = useRef(false);
  const scrollStartIndexRef = useRef(1);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTopByFeedId = useRef<Record<string, number>>({});

  const activeFeed = useMemo(
    () => feeds.find((f) => f.id === activeFeedId) || feeds[0],
    [feeds, activeFeedId],
  );
  const activeItemsFeedId =
    useDummyFeed && !activeFeedId ? dummyFeedIdFallback : activeFeedId;
  const activeItems = useMemo(
    () => itemsByFeedId[activeItemsFeedId] || [],
    [itemsByFeedId, activeItemsFeedId],
  );

  function getScrollerIndex(scroller: HTMLDivElement) {
    const width = scroller.clientWidth || 1;
    const raw = Math.round(scroller.scrollLeft / width);
    return Math.max(0, Math.min(FS_PANEL_COUNT - 1, raw));
  }

  function updateActiveIndexFromScroller() {
    const scroller = fsScrollerRef.current;
    if (!scroller) return;
    const idx = getScrollerIndex(scroller);
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  }

  function snapToMiddleInstant() {
    const scroller = fsScrollerRef.current;
    if (!scroller) return;
    const width = scroller.clientWidth || 0;
    if (width > 0) scroller.scrollLeft = width;
  }

  function scrollToPanel(index: number) {
    const scroller = fsScrollerRef.current;
    if (!scroller) return;
    const width = scroller.clientWidth || 0;
    const target = Math.max(0, Math.min(FS_PANEL_COUNT - 1, index));
    if (width <= 0) return;

    isProgrammaticScrollRef.current = true;
    if (fsProgrammaticTimerRef.current !== null) {
      window.clearTimeout(fsProgrammaticTimerRef.current);
    }
    scroller.scrollTo({ left: target * width, behavior: "smooth" });
    setActiveIndex(target);
    fsProgrammaticTimerRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      fsProgrammaticTimerRef.current = null;
    }, 350);
  }

  // initial load items for first feed
  useEffect(() => {
    const feedId =
      useDummyFeed && !activeFeedId ? dummyFeedIdFallback : activeFeedId;
    if (!feedId) return;
    if (itemsByFeedId[feedId]) return;

    let cancelled = false;
    (async () => {
      try {
        if (useDummyFeed) {
          const articles = getDummyArticlesSized(feedId, 50);
          if (cancelled) return;
          setItemsByFeedId((prev) => {
            if (prev[feedId]) return prev;
            return { ...prev, [feedId]: articles };
          });
          return;
        }

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
  }, [activeFeedId, activeFeed, itemsByFeedId, useDummyFeed]);

  // persist saved
  useEffect(() => {
    saveSaved(saved);
  }, [saved]);

  // Mobile swipe/snap stabilizer for 3 columns
  useEffect(() => {
    const scroller = fsScrollerRef.current;
    if (!scroller) return;

    let rafId: number | null = null;
    let initRafId: number | null = null;
    const initTimerIds: number[] = [];
    const isMobile = () => window.innerWidth <= 900;

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateActiveIndexFromScroller();

        if (!isMobile()) return;
        if (isInitRef.current) return;

        if (!isScrollSessionRef.current) {
          isScrollSessionRef.current = true;
          scrollStartIndexRef.current = getScrollerIndex(scroller);
        }

        if (fsScrollEndTimerRef.current !== null) {
          window.clearTimeout(fsScrollEndTimerRef.current);
        }
        fsScrollEndTimerRef.current = window.setTimeout(() => {
          if (isInitRef.current || isProgrammaticScrollRef.current) {
            isScrollSessionRef.current = false;
            fsScrollEndTimerRef.current = null;
            return;
          }

          const width = scroller.clientWidth || 1;
          const raw = getScrollerIndex(scroller);
          const delta = raw - scrollStartIndexRef.current;
          const deltaClamped = Math.max(-1, Math.min(1, delta));
          const target = Math.max(
            0,
            Math.min(FS_PANEL_COUNT - 1, scrollStartIndexRef.current + deltaClamped),
          );
          scroller.scrollTo({ left: target * width, behavior: "smooth" });
          setActiveIndex(target);
          isScrollSessionRef.current = false;
          fsScrollEndTimerRef.current = null;
        }, 120);
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });

    if (isMobile()) {
      isInitRef.current = true;
      initRafId = window.requestAnimationFrame(() => {
        snapToMiddleInstant();
        updateActiveIndexFromScroller();
      });

      initTimerIds.push(
        window.setTimeout(() => {
          snapToMiddleInstant();
          updateActiveIndexFromScroller();
        }, 50),
      );
      initTimerIds.push(
        window.setTimeout(() => {
          snapToMiddleInstant();
          updateActiveIndexFromScroller();
        }, 250),
      );
      initTimerIds.push(
        window.setTimeout(() => {
          snapToMiddleInstant();
          updateActiveIndexFromScroller();
          isInitRef.current = false;
        }, 400),
      );
    } else {
      isInitRef.current = false;
      updateActiveIndexFromScroller();
    }

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (initRafId !== null) window.cancelAnimationFrame(initRafId);
      initTimerIds.forEach((id) => window.clearTimeout(id));
      if (fsScrollEndTimerRef.current !== null) {
        window.clearTimeout(fsScrollEndTimerRef.current);
        fsScrollEndTimerRef.current = null;
      }
      if (fsProgrammaticTimerRef.current !== null) {
        window.clearTimeout(fsProgrammaticTimerRef.current);
        fsProgrammaticTimerRef.current = null;
      }
      isProgrammaticScrollRef.current = false;
      isScrollSessionRef.current = false;
    };
  }, []);

  function openFeed(feedId: string) {
    const effectiveFeedId =
      useDummyFeed && !feedId ? dummyFeedIdFallback : feedId;

    // store current scrollTop
    if (listScrollRef.current && activeFeedId) {
      scrollTopByFeedId.current[activeFeedId] = listScrollRef.current.scrollTop;
    }

    setActiveFeedId(effectiveFeedId);

    // ensure items exist
    if (!itemsByFeedId[effectiveFeedId]) {
      if (useDummyFeed) {
        const articles = getDummyArticlesSized(effectiveFeedId, 50);
        setItemsByFeedId((prev) => {
          if (prev[effectiveFeedId]) return prev;
          return { ...prev, [effectiveFeedId]: articles };
        });
      } else {
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
    }

    // if we were in reader, go back to list when switching feed
    setMode("list");
    setReaderUrl("");

    // restore scroll (next tick)
    requestAnimationFrame(() => {
      const el = listScrollRef.current;
      if (!el) return;
      el.scrollTop = scrollTopByFeedId.current[effectiveFeedId] || 0;
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
        <div
          className="fsScroller"
          ref={fsScrollerRef}
        >
          <aside className="fs-adGutter fs-adGutterLeft">
            <AdSlotRail />
          </aside>

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
              {injectInlineAds(activeItems, 12).map((item) => {
                if ("kind" in item && item.kind === "ad") {
                  return <AdSlotInline key={item.id} />;
                }

                const a = item as Article;

                return (
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
                );
              })}
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

          <aside className="fs-adGutter fs-adGutterRight">
            <AdSlotRail />
          </aside>
        </div>
        <div className="fsDots" aria-label="Feed panels">
          {Array.from({ length: FS_PANEL_COUNT }, (_, idx) => (
            <button
              type="button"
              key={idx}
              className={`fsDot ${activeIndex === idx ? "isActive" : ""}`}
              onClick={() => scrollToPanel(idx)}
              aria-label={`Go to panel ${idx + 1}`}
            >
              {activeIndex === idx ? "●" : "○"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
