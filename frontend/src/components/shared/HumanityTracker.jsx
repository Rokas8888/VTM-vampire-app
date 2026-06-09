import { useState, useEffect, useRef } from 'react';

// Build the initial Set of stained positions from a count.
// Fills rightmost empty slots first (standard V5 display).
function initPositions(count, humanity) {
  const positions = new Set();
  const safe = Math.min(count ?? 0, Math.max(0, 10 - humanity));
  for (let i = 0; i < safe; i++) positions.add(10 - i);
  return positions;
}

// ── HumanityTracker ──────────────────────────────────────────────────────────
// stains prop = integer COUNT (what gets saved to DB).
// Positions of stain rings are tracked locally so the user can click any
// specific empty dot and have THAT dot fill — not just the rightmost.
// On external count change (poll / GM edit), positions reset to rightmost N.
//
// Props:
//   value              — current humanity (1–10)
//   stains             — stain COUNT from DB
//   onChangeHumanity   — (newVal) => void — freeEdit only
//   onChangeStains     — (newCount) => void
//   freeEdit           — GM mode: clicks edit permanent humanity
//   locked             — disabled during remorse roll
//   showStainButtons   — show +/− buttons (GM view)

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

  const [positions, setPositions] = useState(() => initPositions(stains, value));

  // Track whether the last count change came from our own click (to avoid
  // resetting positions after we fire onChangeStains).
  const selfChanged = useRef(false);

  // Sync: if count changes externally (poll, GM edit), reset to rightmost N.
  useEffect(() => {
    if (selfChanged.current) {
      selfChanged.current = false;
      return;
    }
    setPositions(initPositions(stains, value));
  }, [stains]);

  // If humanity changes, drop any stain positions that are now filled.
  useEffect(() => {
    setPositions(prev => {
      const next = new Set([...prev].filter(p => p > value));
      if (next.size !== prev.size) onChangeStains?.(next.size);
      return next;
    });
  }, [value]);

  const change = (newPositions) => {
    selfChanged.current = true;
    setPositions(newPositions);
    onChangeStains?.(newPositions.size);
  };

  // GM +/− buttons: operate on rightmost empty / stained slot
  const addRight = () => {
    for (let p = 10; p > value; p--) {
      if (!positions.has(p)) { const s = new Set(positions); s.add(p); change(s); return; }
    }
  };
  const removeRight = () => {
    for (let p = 10; p > value; p--) {
      if (positions.has(p)) { const s = new Set(positions); s.delete(p); change(s); return; }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1 flex-wrap justify-center">
        {Array.from({ length: 10 }, (_, i) => {
          const pos     = i + 1;
          const isFull  = pos <= value;
          const isStain = !isFull && positions.has(pos);

          return (
            <button
              key={i}
              disabled={locked}
              title={
                locked   ? "" :
                freeEdit ? (isFull ? "GM: remove humanity dot" : "GM: add humanity dot") :
                isStain  ? "Click to remove stain" :
                !isFull  ? "Click to add stain" : ""
              }
              onClick={() => {
                if (locked) return;
                if (freeEdit) {
                  if (isFull) onChangeHumanity?.(value - 1);
                  else        onChangeHumanity?.(value + 1);
                } else if (!isFull) {
                  const next = new Set(positions);
                  if (isStain) {
                    next.delete(pos);
                  } else if (positions.size < maxStains) {
                    next.add(pos);
                  } else {
                    return;
                  }
                  change(next);
                }
              }}
              className={`rounded-full border transition-colors ${
                isStain
                  ? "w-5 h-5 bg-void-light border-blood/40 animate-stain"
                  : isFull
                    ? "w-5 h-5 bg-blood border-blood"
                    : "w-5 h-5 border-gray-700 hover:border-gray-500"
              } ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            />
          );
        })}
      </div>

      {showStainButtons && onChangeStains && (
        <div className="flex gap-2 items-center">
          <button
            onClick={removeRight}
            disabled={positions.size === 0}
            className="px-2 py-1 rounded text-xs font-gothic tracking-wider border border-void-border text-gray-500 hover:text-gray-300 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors"
          >
            − Stain
          </button>
          <span className="text-xs text-gray-600 w-4 text-center">{positions.size}</span>
          <button
            onClick={addRight}
            disabled={positions.size >= maxStains || maxStains === 0}
            className="px-2 py-1 rounded text-xs font-gothic tracking-wider border border-blood-dark text-blood-dark hover:text-blood hover:border-blood disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors"
          >
            + Stain
          </button>
        </div>
      )}
    </div>
  );
}
