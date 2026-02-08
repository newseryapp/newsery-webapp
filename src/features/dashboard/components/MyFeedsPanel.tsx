import "./myfeeds.css";
import { useNavigate } from "react-router-dom";
import { idToLabel, type CategoryId } from "../../../app/constants/categories";

export type Feed = {
  id: string;
  name: string;
  selected: CategoryId[];
  weights: Record<CategoryId, number>;
  updatedAt: number;
};

type Props = {
  feeds: Feed[];
  activeFeedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function MyFeedsPanel({
  feeds,
  activeFeedId,
  onSelect,
  onRemove,
}: Props) {
  const navigate = useNavigate();

  if (feeds.length === 0) {
    return <div className="placeholder">No saved feeds yet.</div>;
  }

  return (
    <div className="feedsList">
      {feeds.map((f) => {
        const isActive = f.id === activeFeedId;

        return (
          <div
            key={f.id}
            className={`feedCard ${isActive ? "active" : ""}`}
            onClick={() => onSelect(f.id)}
            title="Select this feed"
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(f.id);
              }
            }}
          >
            <button
              type="button"
              className="feedRemove"
              title="Remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(f.id);
              }}
            >
              ×
            </button>

            <div className="feedTitle">{f.name}</div>
            <div className="feedMeta">
              {f.selected.map((id) => idToLabel(id) ?? id).join(", ")}
            </div>

            <button
              type="button"
              className="feedAction"
              onClick={(e) => {
                e.stopPropagation(); // edit tetiklenmesin
                navigate(`/feed/${f.id}`); // feed sayfasına git
              }}
            >
              Open Feed →
            </button>
          </div>
        );
      })}
    </div>
  );
}
