type AdSlotInlineProps = {
  leftLabel?: string;
  rightLabel?: string;
};

export default function AdSlotInline({
  leftLabel = "Sponsored",
  rightLabel = "Ad",
}: AdSlotInlineProps) {
  return (
    <div
      className="fs-adInline"
      role="note"
      aria-label="Advertisement placeholder"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="fs-adInlineTop">
        <span className="fs-adBadge">{leftLabel}</span>
        <span className="fs-adHint">{rightLabel}</span>
      </div>
      {/* intentionally empty body for a clean, pro placeholder */}
    </div>
  );
}
