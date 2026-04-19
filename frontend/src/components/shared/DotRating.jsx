/**
 * DotRating — renders a row of filled/empty dots for V5 ratings.
 *
 * tempValue > 0 : that many dots rendered in blue after the permanent ones (temporary bonus)
 * tempValue < 0 : that many permanent dots shown as dimmed × (temporarily excluded)
 * All dots stay inside the max track — no overflow.
 */
export default function DotRating({ value = 0, max = 5, size = "text-lg", tempValue = 0 }) {
  const activeEnd   = value + Math.min(tempValue, 0); // last permanently-active position
  const excludedEnd = value;                           // end of excluded zone (tempValue < 0)
  const blueEnd     = value + Math.max(tempValue, 0); // end of blue zone (tempValue > 0)

  return (
    <span className={`tracking-widest ${size}`}>
      {Array.from({ length: max }, (_, i) => {
        if (i < activeEnd) {
          // Normal filled dot
          return <span key={i} className="dot-filled">●</span>;
        }
        if (tempValue < 0 && i < excludedEnd) {
          // Temporarily excluded — dim ghost dot with ×
          return (
            <span key={i} className="text-red-600 font-black" style={{ WebkitTextStroke: "0.08em currentColor" }} title="Temporarily excluded">
              ○
            </span>
          );
        }
        if (tempValue > 0 && i >= value && i < blueEnd) {
          // Temporary bonus dot — blue
          return <span key={i} className="text-blue-400">●</span>;
        }
        // Empty
        return <span key={i} className="dot-empty">●</span>;
      })}
    </span>
  );
}
