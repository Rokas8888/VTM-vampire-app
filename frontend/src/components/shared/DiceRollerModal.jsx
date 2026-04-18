import { useState, useRef, useEffect } from "react";
import api from "../../services/api";

// ── V5 dice mechanics ─────────────────────────────────────────────────────────

function rollPool(numDice, numHunger) {
  return Array.from({ length: numDice }, (_, i) => ({
    value: Math.floor(Math.random() * 10) + 1,
    isHunger: i < numHunger,
  }));
}

function analyze(dice) {
  const successes  = dice.filter((d) => d.value >= 6).length;
  const tens       = dice.filter((d) => d.value === 10);
  const critPairs  = Math.floor(tens.length / 2);
  const hungerTen  = dice.some((d) => d.isHunger && d.value === 10);
  // Bestial: any skull showing (hunger die 1-5) + zero total successes
  const anySkull       = dice.some((d) => d.isHunger && d.value <= 5);
  const total          = successes + critPairs * 2;
  const messyCritical  = critPairs > 0 && hungerTen;
  const bestialFailure = total === 0 && anySkull;
  let outcome, outcomeClass;
  if (bestialFailure)     { outcome = "Bestial Failure";  outcomeClass = "text-red-400"; }
  else if (total === 0)   { outcome = "Failure";           outcomeClass = "text-gray-500"; }
  else if (messyCritical) { outcome = "Messy Critical";    outcomeClass = "text-orange-400"; }
  else if (critPairs > 0) { outcome = "Critical Success!"; outcomeClass = "text-yellow-400"; }
  else                    { outcome = "Success";            outcomeClass = "text-green-400"; }
  return { total, critPairs, messyCritical, bestialFailure, outcome, outcomeClass };
}

function outcomeColor(outcome) {
  if (outcome === "Bestial Failure")   return "text-red-400";
  if (outcome === "Failure")           return "text-gray-500";
  if (outcome === "Messy Critical")    return "text-orange-400";
  if (outcome === "Critical Success!") return "text-yellow-400";
  return "text-green-400";
}

// ── SVG face symbols ──────────────────────────────────────────────────────────

// Single vampire fang — curved organic shape, pointed bottom
function Fang({ x = 30, color = "#ffffff", scale = 1 }) {
  const w = 9 * scale;
  const h = 26 * scale;
  const cx = x;
  const top = 16;
  return (
    <path
      d={`
        M ${cx - w},${top}
        L ${cx + w},${top}
        C ${cx + w},${top + 6 * scale} ${cx + 3 * scale},${top + h - 4} ${cx},${top + h}
        C ${cx - 3 * scale},${top + h - 4} ${cx - w},${top + 6 * scale} ${cx - w},${top}
        Z
      `}
      fill={color}
    />
  );
}

// Double fang — two smaller fangs side by side
function DoubleFang({ color = "#FFD700" }) {
  return (
    <>
      {/* Left fang */}
      <path
        d="M 14,16 L 26,16 C 26,22 23,33 20,41 C 17,33 14,22 14,16 Z"
        fill={color}
      />
      {/* Right fang */}
      <path
        d="M 34,16 L 46,16 C 46,22 43,33 40,41 C 37,33 34,22 34,16 Z"
        fill={color}
      />
    </>
  );
}

// Skull — drawn with SVG shapes
// holeColor should match the die body background
function Skull({ fill = "#e8dede", holeColor = "#111111" }) {
  return (
    <>
      {/* Cranium */}
      <ellipse cx="30" cy="22" rx="12" ry="10" fill={fill} />
      {/* Jaw/lower skull */}
      <path d="M 20,28 Q 20,39 30,39 Q 40,39 40,28 Z" fill={fill} />
      {/* Left eye socket */}
      <ellipse cx="25" cy="21" rx="3.8" ry="3.5" fill={holeColor} />
      {/* Right eye socket */}
      <ellipse cx="35" cy="21" rx="3.8" ry="3.5" fill={holeColor} />
      {/* Nose cavity */}
      <path d="M 28.5,27 L 31.5,27 L 30,30.5 Z" fill={holeColor} />
      {/* Jaw teeth gaps */}
      <rect x="22" y="30" width="3"   height="7" rx="1.5" fill={holeColor} />
      <rect x="28" y="30" width="4"   height="7" rx="1.5" fill={holeColor} />
      <rect x="35" y="30" width="3"   height="7" rx="1.5" fill={holeColor} />
    </>
  );
}

// ── V:tM d10 pentagon die ─────────────────────────────────────────────────────

function VtmDie({ value, isHunger, rolling }) {
  // Pentagon points — classic d10 silhouette
  const outer = "30,4 57,22 47,57 13,57 3,22";
  const inner = "30,10 51,25 43,52 17,52 9,25";

  const bodyFill   = isHunger ? "#250000" : "#0f0f0f";
  const bodyStroke = isHunger ? "#8B0000" : "#383838";
  const bevelColor = isHunger ? "#480000" : "#1c1c1c";
  const shadow     = isHunger
    ? "drop-shadow(0 5px 10px rgba(160,0,0,0.65))"
    : "drop-shadow(0 5px 10px rgba(0,0,0,0.9))";

  // What symbol goes on this face?
  const renderFace = () => {
    if (rolling) return null; // blank while spinning

    if (!isHunger) {
      // Regular die — fangs for success, empty for failure
      if (value === 10) return <DoubleFang color="#FFD700" />;   // gold double fang = critical
      if (value >= 6)   return <Fang color="#ffffff" />;         // white fang = success
      return null;                                               // empty = failure
    } else {
      // Hunger die — fangs for success, SKULLS for failure
      if (value === 10) return <DoubleFang color="#FF8C00" />;   // orange double fang = messy crit
      if (value >= 6)   return <Fang color="#dddddd" />;         // light fang = success (hunger present)
      if (value === 1)  return <Skull fill="#FF4444" holeColor="#250000" />;  // red skull = bestial
      return <Skull fill="#555555" holeColor="#250000" />;       // grey skull = failure
    }
  };

  return (
    <div style={{ perspective: "200px", display: "inline-block" }}>
      <div style={{ display: "inline-block", filter: shadow }}>
        <svg width="68" height="68" viewBox="0 0 60 60" style={{ display: "block" }}>
          {/* Drop shadow */}
          <polygon points={outer} fill="rgba(0,0,0,0.55)" transform="translate(2,3)" />
          {/* Main body */}
          <polygon points={outer} fill={bodyFill} stroke={bodyStroke} strokeWidth="1.8" />
          {/* Inner bevel */}
          <polygon points={inner} fill="none" stroke={bevelColor} strokeWidth="0.8" />
          {/* Top-left gloss */}
          <line x1="3" y1="22" x2="30" y2="4"
            stroke={isHunger ? "rgba(255,80,80,0.1)" : "rgba(255,255,255,0.05)"}
            strokeWidth="2" />
          {/* Face symbol */}
          {renderFace()}
        </svg>
      </div>
    </div>
  );
}

// ── Throwing die wrapper — per-die Web Animations API throw ──────────────────
//
// Each die flies in from a random off-screen position, tumbles, and bounces to
// its resting spot. `animKey` increments every roll so the effect re-triggers
// even when the same number of dice is rolled again.

function ThrowingDie({ value, isHunger, rolling, animKey }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || animKey === 0) return;
    const el = ref.current;

    // Randomise the throw for each die so they scatter naturally
    const startX   = (Math.random() - 0.5) * 380;            // ±190 px horizontal
    const startY   = -(Math.random() * 200 + 220);           // 220–420 px above
    const spinSign = Math.random() > 0.5 ? 1 : -1;
    const spinDeg  = spinSign * (720 + Math.random() * 720); // 2–4 full rotations
    const duration = 780 + Math.random() * 380;              // 780–1160 ms
    const delay    = Math.random() * 130;                    // slight stagger

    const anim = el.animate(
      [
        // T=0  — in the air, off-screen, small scale
        {
          transform: `translate(${startX}px, ${startY}px) rotate(${spinDeg}deg) scale(0.5)`,
          opacity: 0.7,
          offset: 0,
        },
        // T≈60% — arcing toward the table, still spinning
        {
          transform: `translate(${startX * 0.1}px, ${startY * 0.12}px) rotate(${spinDeg * 0.22}deg) scale(1.09)`,
          opacity: 1,
          offset: 0.60,
        },
        // T≈80% — first bounce (overshoot upward)
        {
          transform: `translate(0px, -16px) rotate(0deg) scale(1.08)`,
          opacity: 1,
          offset: 0.80,
        },
        // T≈90% — compress on impact (squish)
        {
          transform: `translate(0px, 7px) rotate(0deg) scale(0.95)`,
          offset: 0.90,
        },
        // T≈96% — tiny second bounce
        {
          transform: `translate(0px, -4px) rotate(0deg) scale(1.01)`,
          offset: 0.96,
        },
        // T=100% — settled
        {
          transform: `translate(0px, 0px) rotate(0deg) scale(1.0)`,
          opacity: 1,
          offset: 1,
        },
      ],
      {
        duration,
        delay,
        // Easing: fast drop, ease into landing
        easing: "cubic-bezier(0.2, 0.7, 0.3, 1.0)",
        fill: "backwards", // hold start state during delay
      }
    );

    return () => anim.cancel();
  }, [animKey]);

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      <VtmDie value={value} isHunger={isHunger} rolling={rolling} />
    </div>
  );
}

// ── Modal / Sidebar ───────────────────────────────────────────────────────────
//
// When `sidebar={true}` the roller renders as a fixed right-side panel that
// follows scroll and never overlaps the main content with a backdrop.
// When `sidebar={false}` (default) it renders as a centered modal with overlay.

export default function DiceRollerModal({
  onClose,
  hunger = 0,
  manualHunger = false,   // GM mode: let user set hunger manually
  mode = "normal",
  remorsePool = 1,
  onRemorseResult,
  characterId = null,
  sidebar = false,        // if true: fixed sidebar, not full-screen overlay
}) {
  const [numDice,      setNumDice]      = useState(mode === "remorse" ? remorsePool : 5);
  const [hungerInput,  setHungerInput]  = useState(0);   // only used when manualHunger=true
  const [dice,         setDice]         = useState([]);
  const [rolling,      setRolling]      = useState(false);
  const [results,      setResults]      = useState(null);
  const [rollCount,    setRollCount]    = useState(0);   // increments each throw to retrigger animations
  const [history,      setHistory]      = useState([]);
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [simpleMode,   setSimpleMode]   = useState(false); // ignore hunger dice entirely

  const hungerCount = mode === "remorse" || simpleMode
    ? 0
    : Math.min(manualHunger ? hungerInput : hunger, numDice);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/api/dice/history?limit=10");
      setHistory(res.data);
    } catch (_) { /* silent — user may not be authenticated */ }
  };

  useEffect(() => { fetchHistory(); }, []);

  const roll = () => {
    setRollCount((c) => c + 1);
    setRolling(true);
    setResults(null);
    const count = mode === "remorse" ? remorsePool : numDice;
    setDice(Array.from({ length: count }, (_, i) => ({ value: 0, isHunger: i < hungerCount })));
    const finalDice = rollPool(count, hungerCount);
    setTimeout(async () => {
      setDice(finalDice);
      const res = analyze(finalDice);
      setResults(res);
      setRolling(false);
      // Persist the roll to backend
      try {
        await api.post("/api/dice/save", {
          pool_size:       count,
          hunger_dice:     hungerCount,
          total_successes: res.total,
          crit_pairs:      res.critPairs,
          messy_critical:  res.messyCritical,
          bestial_failure: res.bestialFailure,
          outcome:         res.outcome,
          character_id:    characterId,
          label:           mode === "remorse" ? "Remorse Check" : null,
        });
        fetchHistory();
      } catch (_) { /* silent */ }
    }, 1000);
  };

  const acceptRemorse = () => {
    if (results && onRemorseResult) onRemorseResult(results.total > 0);
    onClose();
  };

  // ── Shared inner content (same for both sidebar and modal) ──────────────────
  const innerContent = (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-gothic text-2xl text-blood">
          {mode === "remorse" ? "Remorse Check" : "Dice Roller"}
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* Simple / V5 mode toggle — only in normal mode */}
      {mode === "normal" && (
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setSimpleMode(false)}
            className={`flex-1 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
              !simpleMode
                ? "border-blood text-blood bg-blood-dark/20"
                : "border-void-border text-gray-500 hover:border-gray-500"
            }`}
          >
            V5 Roll
          </button>
          <button
            onClick={() => setSimpleMode(true)}
            className={`flex-1 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
              simpleMode
                ? "border-blood text-blood bg-blood-dark/20"
                : "border-void-border text-gray-500 hover:border-gray-500"
            }`}
          >
            Simple Roll
          </button>
        </div>
      )}

      {/* Remorse info */}
      {mode === "remorse" && (
        <div className="bg-blood-dark/20 border border-blood-dark rounded p-3 mb-5 text-sm text-gray-400">
          <p className="text-gray-200 mb-1 font-gothic">Your vampire has accrued stains this session.</p>
          <p>
            Rolling <span className="text-white font-bold">{remorsePool}</span>{" "}
            {remorsePool === 1 ? "die" : "dice"} — at least 1 success preserves Humanity.
          </p>
          <p className="text-gray-600 text-xs mt-1">No hunger dice in Remorse rolls.</p>
        </div>
      )}

      {/* Pool control */}
      {mode === "normal" && (
        <div className="flex flex-col gap-3 mb-5">
          {/* Dice pool row */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm font-gothic tracking-wider w-24">Dice Pool:</span>
            <button onClick={() => setNumDice(Math.max(1, numDice - 1))}
              className="w-8 h-8 rounded border border-void-border text-gray-400 hover:text-white hover:border-blood transition-colors text-lg leading-none">−</button>
            <span className="text-white font-gothic text-xl w-8 text-center">{numDice}</span>
            <button onClick={() => setNumDice(Math.min(20, numDice + 1))}
              className="w-8 h-8 rounded border border-void-border text-gray-400 hover:text-white hover:border-blood transition-colors text-lg leading-none">+</button>
          </div>

          {/* Hunger row — hidden in simple mode */}
          {!simpleMode && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-red-400/80 text-sm font-gothic tracking-wider w-24">Hunger:</span>
              {manualHunger ? (
                <>
                  <button
                    onClick={() => setHungerInput(Math.max(0, hungerInput - 1))}
                    className="w-8 h-8 rounded border border-blood-dark/50 text-red-400/70 hover:text-red-300 hover:border-blood transition-colors text-lg leading-none">−</button>
                  <span className="text-red-300 font-gothic text-xl w-8 text-center">{hungerInput}</span>
                  <button
                    onClick={() => setHungerInput(Math.min(5, hungerInput + 1))}
                    className="w-8 h-8 rounded border border-blood-dark/50 text-red-400/70 hover:text-red-300 hover:border-blood transition-colors text-lg leading-none">+</button>
                </>
              ) : (
                <span className="text-red-300 font-gothic text-xl w-8 text-center">{hungerCount}</span>
              )}
              <div className="flex gap-4 text-xs text-gray-500 items-center">
                {numDice - hungerCount > 0 && (
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 60 60">
                      <polygon points="30,4 57,22 47,57 13,57 3,22" fill="#0f0f0f" stroke="#383838" strokeWidth="3"/>
                    </svg>
                    {numDice - hungerCount} regular
                  </span>
                )}
                {hungerCount > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <svg width="14" height="14" viewBox="0 0 60 60">
                      <polygon points="30,4 57,22 47,57 13,57 3,22" fill="#250000" stroke="#8B0000" strokeWidth="3"/>
                    </svg>
                    {hungerCount} hunger
                  </span>
                )}
              </div>
            </div>
          )}
          {simpleMode && (
            <p className="text-xs text-gray-600 italic">Simple mode — no hunger dice, no messy criticals or bestial failures.</p>
          )}
        </div>
      )}

      {/* Satanic ritual table */}
      <div
        className="relative mb-5 rounded-sm overflow-visible"
        style={{
          border: "1px solid #5a0000",
          boxShadow: "0 0 0 1px #2a0000, 0 0 24px rgba(139,0,0,0.18), inset 0 0 80px rgba(0,0,0,0.85)",
          background: `
            radial-gradient(ellipse at 40% 35%, rgba(70,10,10,0.45) 0%, transparent 55%),
            radial-gradient(ellipse at 60% 65%, rgba(45,5,5,0.3)  0%, transparent 45%),
            repeating-linear-gradient(88deg, transparent 0, transparent 5px,  rgba(0,0,0,0.13) 5px,  rgba(0,0,0,0.13) 6px),
            repeating-linear-gradient( 2deg, transparent 0, transparent 10px, rgba(0,0,0,0.07) 10px, rgba(0,0,0,0.07) 11px),
            linear-gradient(150deg, #1e0707 0%, #0d0303 45%, #180606 100%)
          `,
          minHeight: sidebar ? "180px" : "260px",
        }}
      >
        {/* Table surface engraving — inverted pentagram + corner sigils */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <svg
            width="100%" height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <filter id="etch">
                <feGaussianBlur stdDeviation="0.6" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="starFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#8B0000" stopOpacity="0.09"/>
                <stop offset="100%" stopColor="#8B0000" stopOpacity="0.01"/>
              </radialGradient>
            </defs>
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="#3a0000" strokeWidth="0.4" rx="0.5" opacity="0.7"/>
            {[[7,7],[93,7],[7,93],[93,93]].map(([cx,cy]) => (
              <g key={`${cx}-${cy}`} opacity="0.55" filter="url(#etch)">
                <circle cx={cx} cy={cy} r="4.5" fill="none" stroke="#5a0000" strokeWidth="0.5"/>
                <line x1={cx} y1={cy-4.5} x2={cx} y2={cy+4.5} stroke="#5a0000" strokeWidth="0.5"/>
                <line x1={cx-4.5} y1={cy} x2={cx+4.5} y2={cy} stroke="#5a0000" strokeWidth="0.5"/>
              </g>
            ))}
            <circle cx="50" cy="50" r="43" fill="none" stroke="#5a0000" strokeWidth="0.5" opacity="0.45" filter="url(#etch)"/>
            {Array.from({length:12},(_,i)=>i*30).map((deg)=>(
              <line key={deg} x1="50" y1="5.5" x2="50" y2="8.5" stroke="#3d0000" strokeWidth="0.35" opacity="0.5" transform={`rotate(${deg},50,50)`}/>
            ))}
            <path d="M50,90 L26.49,17.64 L88.04,62.36 L11.96,62.36 L73.51,17.64 Z"
              fill="url(#starFill)" stroke="#6a0000" strokeWidth="0.7" opacity="0.7" filter="url(#etch)"/>
            {[[50,90],[11.96,62.36],[26.49,17.64],[73.51,17.64],[88.04,62.36]].map(([px,py])=>(
              <circle key={`${px}-${py}`} cx={px} cy={py} r="1.5" fill="#6a0000" opacity="0.55" filter="url(#etch)"/>
            ))}
            <circle cx="50" cy="50" r="37" fill="none" stroke="#3d0000" strokeWidth="0.35" opacity="0.4"/>
            <circle cx="50" cy="50" r="3" fill="none" stroke="#5a0000" strokeWidth="0.4" opacity="0.45"/>
            <circle cx="50" cy="50" r="0.9" fill="#5a0000" opacity="0.45"/>
          </svg>
        </div>
        {/* Dice layer */}
        <div className={`relative z-10 flex flex-wrap gap-3 justify-center items-center p-4 ${sidebar ? "min-h-[180px]" : "min-h-[260px]"}`}>
          {dice.length === 0 ? (
            <p className="text-red-900/50 font-gothic tracking-widest text-sm">Cast the dice upon the altar…</p>
          ) : (
            dice.map((d, i) => (
              <ThrowingDie key={i} value={d.value} isHunger={d.isHunger} rolling={rolling} animKey={rollCount} />
            ))
          )}
        </div>
      </div>

      {/* Results */}
      {results && !rolling && (
        <div className="mb-5 text-center">
          <p className={`font-gothic text-3xl mb-1 ${results.outcomeClass}`}>{results.outcome}</p>
          <p className="text-gray-400 text-sm">
            <span className="text-white font-bold">{results.total}</span>{" "}
            success{results.total !== 1 ? "es" : ""}
            {results.critPairs > 0 && (
              <span className="text-yellow-500 ml-2">· {results.critPairs} critical pair{results.critPairs > 1 ? "s" : ""}</span>
            )}
            {results.messyCritical  && <span className="text-orange-400 ml-2">· Messy!</span>}
            {results.bestialFailure && <span className="text-red-400 ml-2">· Bestial!</span>}
          </p>
          {results.bestialFailure && (
            <p className="text-red-400/70 text-xs mt-2 italic">The Beast takes hold — your vampire acts on pure instinct, heedless of consequence.</p>
          )}
          {results.messyCritical && (
            <p className="text-orange-400/70 text-xs mt-2 italic">Victory tainted by Hunger — collateral damage is inevitable.</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        {mode === "remorse" ? (
          results && !rolling ? (
            <button onClick={acceptRemorse} className="vtm-btn">
              {results.total > 0 ? "Humanity Holds — Continue" : "Accept the Descent"}
            </button>
          ) : (
            <button onClick={roll} disabled={rolling} className="vtm-btn">
              {rolling ? "Rolling…" : "Roll Remorse"}
            </button>
          )
        ) : (
          <button onClick={roll} disabled={rolling} className="vtm-btn flex-1">
            {rolling ? "Rolling…" : dice.length === 0 ? "Roll Dice" : "Roll Again"}
          </button>
        )}
      </div>

      {/* Roll History */}
      {mode === "normal" && (
        <div className="mt-4 pt-4 border-t border-void-border">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-300 text-xs font-gothic tracking-wider transition-colors w-full"
          >
            <span className={`inline-block transition-transform duration-200 ${historyOpen ? "rotate-90" : ""}`}>▶</span>
            Recent Rolls{history.length > 0 ? ` (${history.length})` : " — none yet"}
          </button>
          {historyOpen && history.length > 0 && (
            <div className="mt-2 space-y-1 max-h-44 overflow-y-auto pr-1">
              {history.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-black/30 border border-void-border/40">
                  <span className={`w-28 truncate font-gothic ${outcomeColor(r.outcome)}`}>{r.outcome}</span>
                  <span className="text-gray-400 w-20">{r.total_successes} success{r.total_successes !== 1 ? "es" : ""}</span>
                  <span className="text-gray-600 flex-1">
                    {r.pool_size}d{r.hunger_dice > 0 && <span className="text-red-900 ml-1">({r.hunger_dice}h)</span>}
                  </span>
                  {r.label && <span className="text-gray-700 italic truncate max-w-[80px]">{r.label}</span>}
                  <span className="text-gray-700 tabular-nums ml-auto">
                    {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend — hidden in simple mode */}
      {mode === "normal" && !simpleMode && (
        <div className="mt-5 pt-4 border-t border-void-border">
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <svg width="18" height="18" viewBox="0 0 60 60">
                <polygon points="30,4 57,22 47,57 13,57 3,22" fill="#0f0f0f" stroke="#383838" strokeWidth="2"/>
                <Fang color="#ffffff" />
              </svg>
              fang = success (6–9)
            </span>
            <span className="flex items-center gap-1 text-yellow-700">
              <svg width="18" height="18" viewBox="0 0 60 60">
                <polygon points="30,4 57,22 47,57 13,57 3,22" fill="#0f0f0f" stroke="#383838" strokeWidth="2"/>
                <DoubleFang color="#FFD700" />
              </svg>
              double fang = critical (10)
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <svg width="18" height="18" viewBox="0 0 60 60">
                <polygon points="30,4 57,22 47,57 13,57 3,22" fill="#250000" stroke="#8B0000" strokeWidth="2"/>
                <Skull fill="#555555" holeColor="#250000" />
              </svg>
              skull = hunger failure
            </span>
            <span className="flex items-center gap-1 text-red-700">
              <svg width="18" height="18" viewBox="0 0 60 60">
                <polygon points="30,4 57,22 47,57 13,57 3,22" fill="#250000" stroke="#8B0000" strokeWidth="2"/>
                <Skull fill="#FF4444" holeColor="#250000" />
              </svg>
              red skull = bestial
            </span>
            <span className="flex items-center gap-1 text-orange-700">
              <svg width="18" height="18" viewBox="0 0 60 60">
                <polygon points="30,4 57,22 47,57 13,57 3,22" fill="#250000" stroke="#8B0000" strokeWidth="2"/>
                <DoubleFang color="#FF8C00" />
              </svg>
              hunger 10 = messy crit
            </span>
          </div>
        </div>
      )}
    </>
  );

  // ── Sidebar mode: fixed right panel ──────────────────────────────────────────
  if (sidebar) {
    return (
      <div className="fixed top-0 right-0 h-full w-[360px] bg-void-light border-l border-blood-dark z-40 shadow-2xl overflow-y-auto">
        <div className="p-5">
          {innerContent}
        </div>
      </div>
    );
  }

  // ── Modal mode: centered overlay ──────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-void-light border border-blood-dark rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {innerContent}
      </div>
    </div>
  );
}
