import { useEffect, useMemo, useState } from "react";
import "./myfeeds.css";

type Props = {
  open: boolean;
  defaultName?: string;
  onCancel: () => void;
  onSave: (name: string) => void;
};

export default function SaveFeedModal({
  open,
  defaultName,
  onCancel,
  onSave,
}: Props) {
  const initial = useMemo(() => defaultName?.trim() || "", [defaultName]);
  const [name, setName] = useState(initial);

  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") {
        const v = name.trim();
        if (v.length >= 2) onSave(v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, name, onCancel, onSave]);

  if (!open) return null;

  const canSave = name.trim().length >= 2;

  return (
    <div className="modalOverlay" onMouseDown={onCancel}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTitle">Name your feed</div>
        <div className="modalSub">Give this mix a short, memorable name.</div>

        <input
          className="modalInput"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning Brief"
          autoFocus
        />

        <div className="modalActions">
          <button className="btnGhost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btnPrimary"
            disabled={!canSave}
            onClick={() => onSave(name.trim())}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
