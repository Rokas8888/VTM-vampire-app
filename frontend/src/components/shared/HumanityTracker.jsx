// ── HumanityTracker ──────────────────────────────────────────────────────────
// 10-dot track. Stains overlay the rightmost filled dots (right to left).
//
// Dot states:
//   Filled (red)        = permanent humanity
//   Stained (dark+ring) = at risk; player clicks to add/remove; GM uses buttons
//   Empty  (grey)       = no interaction in player mode
//
// Props:
//   value              — current humanity level (1–10)
//   stains             — current stain count
//   onChangeHumanity   — (newVal) => void — freeEdit mode only
//   onChangeStains     — (newVal) => void — player or GM
//   freeEdit           — GM mode: dot clicks add/remove permanent humanity
//   locked             — all interactions disabled (during remorse roll)
//   showStainButtons   — show +/− stain buttons (GM view)

export default function HumanityTracker({
  value,
  stains,
  onChangeHumanity,
  onChangeStains,
  freeEdit = false,
  locked = false,
  showStainButtons = false,
}) {
  const maxStains = Math.max(0, 10 - value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1 flex-wrap justify-center">
        {Array.from({ length: 10 }, (_, i) => {
          const pos     = i + 1;
          const isFull  = pos <= value;
          const isStain = isFull && pos > (value - stains);

          return (
            <button
              key={i}
              disabled={locked}
              title={
                locked   ? "" :
                freeEdit ? (isFull ? "GM: remove humanity dot" : "GM: add humanity dot") :
                isStain  ? "Click to remove stain" :
                isFull   ? "Click to mark stain" : ""
              }
              onClick={() => {
                if (locked) return;
                if (freeEdit) {
                  if (isFull) onChangeHumanity?.(value - 1);
                  else        onChangeHumanity?.(value + 1);
                } else if (isFull) {
                  if (isStain) {
                    // Unstain this dot and all to its right
                    onChangeStains?.(Math.max(0, stains - (value - pos + 1)));
                  } else {
                    // Fill stains from clicked dot rightward, capped at V5 max
                    onChangeStains?.(Math.min(value - pos + 1, maxStains));
                  }
                }
                // empty dot in player mode: no action
              }}
              className={`rounded-full border transition-all ${
                isStain
                  ? "w-5 h-5 bg-void-light border-blood ring-2 ring-blood/70"
                  : isFull
                    ? "w-5 h-5 bg-blood border-blood"
                    : "w-5 h-5 border-gray-700 hover:border-gray-500"
              } ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            />
          );
        })}
      </div>

      {/* GM stain +/− buttons — always visible when showStainButtons=true */}
      {showStainButtons && onChangeStains && (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onChangeStains(Math.max(0, stains - 1))}
            disabled={stains === 0}
            className="px-2 py-1 rounded text-xs font-gothic tracking-wider border border-void-border text-gray-500 hover:text-gray-300 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors"
          >
            − Stain
          </button>
          <span className="text-xs text-gray-600 w-4 text-center">{stains}</span>
          <button
            onClick={() => onChangeStains(Math.min(maxStains, stains + 1))}
            disabled={stains >= maxStains || maxStains === 0}
            className="px-2 py-1 rounded text-xs font-gothic tracking-wider border border-blood-dark text-blood-dark hover:text-blood hover:border-blood disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors"
          >
            + Stain
          </button>
        </div>
      )}
    </div>
  );
}
