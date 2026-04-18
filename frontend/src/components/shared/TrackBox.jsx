/**
 * TrackBox — renders a row of boxes for Health / Willpower tracks.
 * e.g. <TrackBox filled={3} total={7} /> → renders 7 boxes, first 3 dark red
 *
 * `label` is optional text shown before the boxes.
 */
export default function TrackBox({ filled = 0, total = 0, label }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-gray-400 text-sm w-24 shrink-0">{label}</span>}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`track-box rounded-sm ${i < filled ? "filled" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
