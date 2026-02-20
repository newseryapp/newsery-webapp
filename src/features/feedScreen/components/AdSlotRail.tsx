type AdSlotRailProps = {
  leftLabel?: string;
  rightLabel?: string;
};

export default function AdSlotRail({
  leftLabel = "Sponsored",
  rightLabel = "Ad",
}: AdSlotRailProps) {
  return (
    <div
      className="fs-adRail"
      role="note"
      aria-label="Advertisement placeholder"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="fs-adInlineTop">
        <span className="fs-adBadge">{leftLabel}</span>
        <span className="fs-adHint">{rightLabel}</span>
      </div>
    </div>
  );
}
