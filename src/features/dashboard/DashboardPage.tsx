import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import SaveFeedModal from "./components/SaveFeedModal";
import MyFeedsPanel, { type Feed } from "./components/MyFeedsPanel";
import "./dashboard.css";
import {
  CATEGORIES,
  idToLabel,
  labelToId,
  type CategoryId,
} from "../../app/constants/categories";

const FEEDS_STORAGE_KEY = "newsery.webapp.feeds.v1";

const STEP = 5;
const MIN_WEIGHT = 5;

const MIN_SELECT = 2;
const MAX_SELECT = 4;

export default function DashboardPage() {
  const categoryIdSet = new Set(CATEGORIES.map((c) => c.id));

  function normalizeCategoryId(value: unknown): CategoryId | null {
    if (typeof value === "string") {
      if (categoryIdSet.has(value as CategoryId)) return value as CategoryId;
      const fromLabel = labelToId(value);
      if (fromLabel && categoryIdSet.has(fromLabel as CategoryId)) {
        return fromLabel as CategoryId;
      }
      return null;
    }

    if (value && typeof value === "object") {
      const anyValue = value as any;
      if (typeof anyValue.id === "string" && categoryIdSet.has(anyValue.id)) {
        return anyValue.id as CategoryId;
      }
      if (typeof anyValue.label === "string") {
        const fromLabel = labelToId(anyValue.label);
        if (fromLabel && categoryIdSet.has(fromLabel as CategoryId)) {
          return fromLabel as CategoryId;
        }
      }
    }

    return null;
  }

  function normalizeFeed(raw: unknown): Feed | null {
    if (!raw || typeof raw !== "object") return null;
    const anyFeed = raw as any;

    const id = typeof anyFeed.id === "string" ? anyFeed.id : null;
    const name = typeof anyFeed.name === "string" ? anyFeed.name : null;
    if (!id || !name) return null;

    const selectedIds: CategoryId[] = Array.isArray(anyFeed.selected)
      ? (anyFeed.selected
          .map((v: unknown) => normalizeCategoryId(v))
          .filter(Boolean) as CategoryId[])
      : [];

    const weights: Record<CategoryId, number> = {} as any;
    if (anyFeed.weights && typeof anyFeed.weights === "object") {
      for (const [k, v] of Object.entries(anyFeed.weights)) {
        const idKey = normalizeCategoryId(k);
        if (!idKey) continue;
        const n = typeof v === "number" ? v : Number(v);
        if (!Number.isFinite(n)) continue;
        weights[idKey] = n;
      }
    }

    const updatedAt = typeof anyFeed.updatedAt === "number" ? anyFeed.updatedAt : 0;

    return { id, name, selected: selectedIds, weights, updatedAt };
  }

  const [selected, setSelected] = useState<CategoryId[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [weights, setWeights] = useState<Record<CategoryId, number>>(
    {} as Record<CategoryId, number>,
  );
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const raw = localStorage.getItem(FEEDS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed?.feeds;
      if (!Array.isArray(list)) return [];
      return list.map(normalizeFeed).filter(Boolean) as Feed[];
    } catch {
      return [];
    }
  });
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);

  // Feed edit-mode
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [editSelected, setEditSelected] = useState<CategoryId[] | null>(null);
  const [editWeights, setEditWeights] = useState<Record<CategoryId, number> | null>(
    null,
  );

  // Save feedback
  const [savedMsg, setSavedMsg] = useState<string>(""); // kısa uyarı yazısı

  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
    } catch {
      // ignore
    }
  }, [feeds]);

  const canSave = selected.length >= MIN_SELECT;

  const isSelected = (c: CategoryId) => selected.includes(c);
  const canSelectMore = selected.length < MAX_SELECT;

  const mixMode = editingFeedId ? "edit" : "draft";

  const mixSelected = mixMode === "edit" ? (editSelected ?? []) : selected;
  const mixWeights = mixMode === "edit" ? (editWeights ?? ({} as any)) : weights;

  // Başlık yanında görünecek feed adı
  const editingFeedName =
    mixMode === "edit"
      ? feeds.find((f) => f.id === editingFeedId)?.name
      : null;

  const isEditDirty = useMemo(() => {
    if (!editingFeedId || !editSelected || !editWeights) return false;
    const f = feeds.find((x) => x.id === editingFeedId);
    if (!f) return false;

    // sadece weights kıyaslıyoruz (kategori edit yok)
    for (const c of f.selected) {
      if ((f.weights[c] ?? 0) !== (editWeights[c] ?? 0)) return true;
    }
    return false;
  }, [editingFeedId, editSelected, editWeights, feeds]);

  const mixActiveCategory: CategoryId | null =
    mixSelected.length === 0
      ? null
      : activeCategory && mixSelected.includes(activeCategory)
        ? activeCategory
        : mixSelected[0];

  function normalizeWeights(cats: CategoryId[]) {
    if (cats.length === 0) return {} as Record<CategoryId, number>;
    const base = Math.floor(100 / cats.length);
    const rest = 100 - base * cats.length;

    const next: Record<CategoryId, number> = {} as any;
    cats.forEach((c, i) => {
      next[c] = base + (i === 0 ? rest : 0);
    });

    return next;
  }

  function toggleCategory(c: CategoryId) {
    const already = isSelected(c);

    if (already) {
      const next = selected.filter((x) => x !== c);
      setSelected(next);
      setWeights(normalizeWeights(next));

      // activeCategory çıkarıldıysa, aktif olanı listeden birine kaydır
      if (activeCategory === c) {
        setActiveCategory(next[0] ?? null);
      }
      return;
    }

    // Seçim ekleme: max 4
    if (!canSelectMore) return;

    const next = [...selected, c];
    setSelected(next);
    setWeights(normalizeWeights(next));
    setActiveCategory(c);
  }

  function adjustDraftWeight(target: CategoryId, delta: number) {
    const computeNext = (prev: Record<CategoryId, number>) => {
      const current = prev[target] ?? 0;
      const nextValue = Math.max(MIN_WEIGHT, Math.min(100, current + delta));

      const diff = nextValue - current;
      if (diff === 0) return prev;

      const others = selected.filter((c) => c !== target);
      if (others.length === 0) return prev;

      const share = Math.floor(diff / others.length);
      const next = { ...prev, [target]: nextValue };

      others.forEach((c) => {
        next[c] = Math.max(MIN_WEIGHT, (next[c] ?? 0) - share);
      });

      // Son normalize (toplam = 100)
      const total = Object.values(next).reduce((a, b) => a + b, 0);
      const fix = 100 - total;
      if (fix !== 0) {
        next[target] += fix;
      }

      return next;
    };

    setWeights((prev) => computeNext(prev));
  }

  function adjustEditWeight(target: CategoryId, delta: number) {
    setEditWeights((prev) => {
      if (!prev || !editSelected) return prev;

      const current = prev[target] ?? 0;
      const nextValue = Math.max(MIN_WEIGHT, Math.min(100, current + delta));
      const diff = nextValue - current;
      if (diff === 0) return prev;

      const others = editSelected.filter((c) => c !== target);
      const share = Math.floor(diff / others.length);

      const next = { ...prev, [target]: nextValue };
      others.forEach((c) => {
        next[c] = Math.max(MIN_WEIGHT, (next[c] ?? 0) - share);
      });

      const total = Object.values(next).reduce((a, b) => a + b, 0);
      const fix = 100 - total;
      if (fix !== 0) next[target] += fix;

      return next;
    });
  }

  const selectedLabel = useMemo(
    () => mixSelected.map((id) => idToLabel(id) ?? id).join(", "),
    [mixSelected],
  );

  function resetToDefault() {
    // edit mode kapat
    setEditingFeedId(null);
    setEditSelected(null);
    setEditWeights(null);

    // seçili kart vurgusu kalksın
    setActiveFeedId(null);

    // draft default
    setSelected([]);
    setWeights({} as any);
    setActiveCategory(null);

    // mesajı da temizle
    setSavedMsg("");
  }

  function openFeedForEdit(feedId: string) {
    const f = feeds.find((x) => x.id === feedId);
    if (!f) return;

    setSavedMsg("");
    setActiveFeedId(feedId);
    setEditingFeedId(f.id);
    setEditSelected(f.selected);
    setEditWeights(f.weights);
  }

  return (
    <>
      <div
        className="dash"
        onMouseDown={() => {
          // sadece edit moddayken click-away çalışsın
          if (!editingFeedId) return;

          // Eğer tıklanan yer "arka plan" ise reset
          // (paneller stopPropagation yapacak)
          resetToDefault();
        }}
      >
        {/* LEFT */}
        <section className="panel" onMouseDown={(e) => e.stopPropagation()}>
          <div className="panelTitle">
            SELECT YOUR CATEGORIES
            <div className="panelHint">
              Pick {MIN_SELECT}–{MAX_SELECT} categories
            </div>
          </div>

          <div
            className={`panelBody categoryList ${editingFeedId ? "disabledPanel" : ""}`}
          >
            {CATEGORIES.map((cat) => {
              const selectedNow = isSelected(cat.id);
              const disabled = !selectedNow && !canSelectMore;

              return (
                <button
                  key={cat.id}
                  className={`catBtn ${selectedNow ? "active" : ""}`}
                  onClick={() => toggleCategory(cat.id)}
                  disabled={editingFeedId !== null || disabled}
                  title={
                    disabled
                      ? `Max ${MAX_SELECT} categories selected`
                      : selectedNow
                        ? "Click to remove"
                        : "Click to add"
                  }
                >
                  <span>{cat.label}</span>
                  {selectedNow ? <span className="tag">Selected</span> : null}
                </button>
              );
            })}
          </div>

          <div className="panelFooter">
            <div className="counter">
              Selected: <strong>{mixSelected.length}</strong> / {MAX_SELECT}
            </div>
          </div>
        </section>

        {/* MIDDLE */}
        <section className="panel panelMid" onMouseDown={(e) => e.stopPropagation()}>
          <div className="panelTitle">
            ADJUST YOUR MIX
            {mixMode === "edit" && editingFeedName ? (
              <span className="panelSub"> — {editingFeedName}</span>
            ) : null}
          </div>

          <div className="panelBody">
            <div className="mixSelected">
              {mixSelected.map((c) => (
                <button
                  key={c}
                  className={`mixChip ${c === mixActiveCategory ? "on" : ""}`}
                  onClick={() => setActiveCategory(c)}
                  title="Set active"
                >
                  {idToLabel(c) ?? c}
                </button>
              ))}
            </div>

            <div className="mixList">
              {mixSelected.map((c) => {
                const value = mixWeights[c] ?? 0;

                return (
                  <div
                    key={c}
                    className={`mixRow ${c === mixActiveCategory ? "active" : ""}`}
                  >
                    <div className="mixLabel">{idToLabel(c) ?? c}</div>

                    <div className="mixControls">
                      <button
                        onClick={() =>
                          mixMode === "edit"
                            ? adjustEditWeight(c, -STEP)
                            : adjustDraftWeight(c, -STEP)
                        }
                        disabled={value <= MIN_WEIGHT}
                      >
                        –
                      </button>

                      <div className="mixBar">
                        <div
                          className="mixFill"
                          style={{ width: `${value}%` }}
                        />
                      </div>

                      <button
                        onClick={() =>
                          mixMode === "edit"
                            ? adjustEditWeight(c, STEP)
                            : adjustDraftWeight(c, STEP)
                        }
                        disabled={value >= 100}
                      >
                        +
                      </button>

                      <div className="mixValue">{value}%</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="placeholder" style={{ height: 140 }}>
              {mixSelected.length === 0 ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800 }}>
                    Select {MIN_SELECT}–{MAX_SELECT} categories to start
                  </div>
                  <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                    Then adjust the weights here.
                  </div>
                </div>
              ) : (
                <>
                  Active:{" "}
                  <strong>
                    {mixActiveCategory ? idToLabel(mixActiveCategory) ?? mixActiveCategory : ""}
                  </strong>
                  <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                    Selected set: {selectedLabel}
                  </div>
                </>
              )}
            </div>

            <div className="saveRow">
              <button
                className="saveBtn"
                disabled={mixMode === "edit" ? !isEditDirty : !canSave}
                onClick={() => {
                  if (mixMode === "draft") {
                    if (!canSave) return;
                    setSaveOpen(true);
                    return;
                  }

                  // EDIT mode save
                  if (!editingFeedId || !editWeights) return;

                  setFeeds((prev) =>
                    prev.map((f) =>
                      f.id === editingFeedId
                        ? { ...f, weights: editWeights, updatedAt: Date.now() }
                        : f
                    )
                  );

                  const name = editingFeedName ?? "this feed";
                  resetToDefault();
                  setSavedMsg(`Changes saved to "${name}"`);
                  setTimeout(() => setSavedMsg(""), 2000);
                }}
              >
                {mixMode === "edit" ? "SAVE CHANGES" : "SAVE YOUR FEED"}
              </button>
            </div>

            {mixMode === "draft" && !canSave ? (
              <div className="microHint">
                Select at least {MIN_SELECT} categories to save.
              </div>
            ) : null}
          </div>
        </section>

        {/* RIGHT */}
        <section className="panel" onMouseDown={(e) => e.stopPropagation()}>
          <div className="panelTitle">MY FEEDS</div>
          <div className="panelBody">
            <MyFeedsPanel
              feeds={feeds}
              activeFeedId={activeFeedId}
              onSelect={(id) => openFeedForEdit(id)}
              onRemove={(id) => {
                const ok = window.confirm("Remove this feed?");
                if (!ok) return;

                setFeeds((prev) => prev.filter((f) => f.id !== id));

                // Dashboard'da edit seçimi olarak aktif olan silindiyse, sadece seçimi düşür.
                if (activeFeedId === id) {
                  setActiveFeedId(null);
                }
              }}
            />
          </div>
        </section>
      </div>

      <SaveFeedModal
        open={saveOpen}
        defaultName=""
        onCancel={() => {
          setSaveOpen(false);
          setSavedMsg("");
        }}
        onSave={(name) => {
          const newFeed: Feed = {
            id: nanoid(8),
            name,
            selected,
            weights,
            updatedAt: Date.now(),
          };

          setFeeds((prev) => [newFeed, ...prev]);
          setSaveOpen(false);

          // RESET to default draft
          resetToDefault();
        }}
      />

      {savedMsg ? <div className="toast">{savedMsg}</div> : null}
    </>
  );
}
