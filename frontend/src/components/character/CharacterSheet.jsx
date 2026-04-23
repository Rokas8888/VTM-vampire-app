import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import DotRating from "../shared/DotRating";
import DiceRollerModal from "../shared/DiceRollerModal";
import ConditionBadges from "../shared/ConditionBadges";
import { getClanBg } from "../../utils/clanImages";

// ── Weapon / Possession suggestion lists ─────────────────────────────────────
const WEAPON_NAME_SUGGESTIONS = [
  "Combat Knife","Hunting Knife","Stake","Baseball Bat","Machete","Sword","Axe",
  "Fire Axe","Chainsaw","Brass Knuckles","Pistol","Revolver","Shotgun",
  "Assault Rifle","Sniper Rifle","Submachine Gun","Crossbow","Bow",
];
const WEAPON_DAMAGE_SUGGESTIONS = [
  "Strength+1 (Aggravated)","Strength+2 (Aggravated)","Strength (Aggravated)",
  "Strength+1 (Superficial)","2 (Aggravated)","3 (Aggravated)",
  "4 (Aggravated)","5 (Aggravated)",
];
const WEAPON_RANGE_SUGGESTIONS = [
  "Close","Close/Reach","Reach","Short","Medium","Long","Extreme",
];
const WEAPON_TRAITS_SUGGESTIONS = [
  "Concealable","Loud","Messy","Piercing","Staking","Two-handed","Burst Fire","Fully Automatic","Silenced",
];

// ── SuggestionInput — text input with datalist suggestions ───────────────────
function SuggestionInput({ id, value, onChange, suggestions, placeholder, autoFocus }) {
  return (
    <>
      <input
        list={id}
        className="vtm-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <datalist id={id}>
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
    </>
  );
}

// ── Attribute / skill groupings ──────────────────────────────────────────────

const PHYSICAL_ATTRS  = ["Strength", "Dexterity", "Stamina"];
const SOCIAL_ATTRS    = ["Charisma", "Manipulation", "Composure"];
const MENTAL_ATTRS    = ["Intelligence", "Wits", "Resolve"];
const PHYSICAL_SKILLS = ["Athletics", "Brawl", "Craft", "Drive", "Firearms", "Larceny", "Melee", "Stealth", "Survival"];
const SOCIAL_SKILLS   = ["Animal_Ken", "Etiquette", "Insight", "Intimidation", "Leadership", "Performance", "Persuasion", "Streetwise", "Subterfuge"];
const MENTAL_SKILLS   = ["Academics", "Awareness", "Finance", "Investigation", "Medicine", "Occult", "Politics", "Science", "Technology"];
const GENERATION_LABEL = { childer: "13th Generation (Childer)", neonate: "12th Generation (Neonate)", ancillae: "11th Generation (Ancillae)" };
const TOTAL_BOXES = 15;


// ── Build damage track array from stored counts (V5: agg fills from right) ───
function buildTrack(maxActive, sup, agg) {
  const arr = Array(maxActive).fill(0);
  for (let i = maxActive - 1; i >= 0 && i >= maxActive - agg; i--) arr[i] = 2;
  for (let i = maxActive - agg - 1; i >= 0 && i >= maxActive - agg - sup; i--) arr[i] = 1;
  return arr;
}

// ── Dot tracker (Blood Potency, Hunger) ──────────────────────────────────────
// Click filled dot at last position → decrease. Click empty → set to that value.
function DotTracker({ value, max, onChange, variant = "blood" }) {
  const filledCls =
    variant === "hunger" ? "bg-red-700 border-red-700" : "bg-blood border-blood";
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(value === i + 1 ? i : i + 1)}
          title={`Set to ${i + 1}`}
          className={`w-5 h-5 rounded-full border transition-all ${
            i < value ? filledCls : "border-gray-700 hover:border-gray-500"
          }`}
        />
      ))}
    </div>
  );
}

// ── Humanity tracker with 3 dot states ───────────────────────────────────────
// Full (red) → Stained (smaller, dim red) → Empty (grey)
// Clicking a full dot → marks it as a stain (pending remorse check)
// Clicking a stained dot → restores it to full
// Clicking an empty dot → restore if stains exist, otherwise set value
function HumanityTracker({ value, stains, onChangeHumanity, onChangeStains }) {
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {Array.from({ length: 10 }, (_, i) => {
        const pos      = i + 1;
        const isFull   = pos <= value;
        const isStain  = pos > value && pos <= value + stains;
        return (
          <button
            key={i}
            title={isFull ? "Mark as stain (remorse required)" : isStain ? "Remove stain" : "Restore dot"}
            onClick={() => {
              if (isFull) {
                // last filled dot becomes a stain
                onChangeHumanity(value - 1);
                onChangeStains(stains + 1);
              } else if (isStain) {
                // un-stain (restore)
                onChangeHumanity(value + 1);
                onChangeStains(stains - 1);
              } else {
                // empty: restore from stain pool if possible, else set directly
                if (stains > 0) {
                  onChangeHumanity(value + 1);
                  onChangeStains(stains - 1);
                } else {
                  onChangeHumanity(pos);
                }
              }
            }}
            className={`rounded-full border transition-all ${
              isFull  ? "w-5 h-5 bg-blood border-blood" :
              isStain ? "w-3 h-3 bg-blood-dark/50 border-blood-dark mx-1" :
                        "w-5 h-5 border-gray-700 hover:border-gray-500"
            }`}
          />
        );
      })}
    </div>
  );
}

// ── Single damage box (empty / superficial / aggravated) ─────────────────────
function DamageBox({ state, onClick }) {
  const cls =
    state === 2 ? "border-blood bg-blood-dark/50 text-blood" :
    state === 1 ? "border-yellow-600 bg-yellow-900/30 text-yellow-500" :
                  "border-gray-700 hover:border-gray-500 text-transparent";
  return (
    <button
      onClick={onClick}
      title={state === 0 ? "Click → superficial" : state === 1 ? "Click → aggravated" : "Click → clear"}
      className={`w-6 h-6 border rounded-sm transition-colors flex items-center justify-center text-xs font-bold ${cls}`}
    >
      {state === 1 ? "/" : state === 2 ? "×" : "·"}
    </button>
  );
}

// ── Full damage track (15 boxes; first maxActive are interactive) ─────────────
function DamageTrack({ track, maxActive, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: TOTAL_BOXES }, (_, i) => {
        if (i >= maxActive) {
          return <div key={i} className="w-6 h-6 border border-gray-900 rounded-sm bg-gray-950 opacity-20" />;
        }
        return (
          <DamageBox
            key={i}
            state={track[i] ?? 0}
            onClick={() => {
              const next = [...track];
              next[i] = (next[i] + 1) % 3;
              onChange(next);
            }}
          />
        );
      })}
    </div>
  );
}

// ── Extract roll hint from V5 system_text ────────────────────────────────────
function getRollHint(text) {
  if (!text) return null;
  const dp = text.match(/dice pool[:\s]+([^\n]+)/i);
  if (dp) return "Roll: " + dp[1].trim().slice(0, 72);
  const cost = text.match(/^cost[:\s]+([^\n]+)/im);
  if (cost) return "Cost: " + cost[1].trim().slice(0, 72);
  const first = text.split(/\n/)[0];
  return first.length <= 90 ? first : first.slice(0, 87) + "…";
}

// ── Single discipline power card ─────────────────────────────────────────────
// learned   = character already knows it (expandable, shown always)
// available = character has enough discipline dots but hasn't learned it yet
//             (shown only in improve mode, with XP button)
// Powers are always included with dot purchases — no separate XP cost ever.
function PowerCard({ power }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border border-void-border bg-void-light/20 rounded-lg transition-colors cursor-pointer hover:border-blood/40"
      onClick={() => setOpen((o) => !o)}
    >
      {/* Card front */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-200">{power.name}</span>
              <span className="text-blood-dark text-xs shrink-0">
                {"●".repeat(power.level)}{"○".repeat(5 - power.level)}
              </span>
            </div>
            {!open && (
              <p className="text-xs text-gray-600 mt-1 truncate">
                {getRollHint(power.system_text) || power.description?.slice(0, 80) || ""}
              </p>
            )}
          </div>
          <span className="text-gray-700 text-xs shrink-0">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-3 pb-3 border-t border-void-border/40 pt-3 space-y-2">
          {power.description && (
            <p className="text-xs text-gray-500 italic leading-relaxed">{power.description}</p>
          )}
          {power.system_text && (
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{power.system_text}</p>
          )}
          {power.prerequisite && (
            <p className="text-xs text-gray-600">
              <span className="text-gray-500">Prerequisite:</span> {power.prerequisite}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Discipline card (header + powers) ────────────────────────────────────────
// Normal mode: only learned powers shown as expandable cards.
// Improve mode: also shows available (unlearned, within current dot level) with XP buttons.
// Raising a dot: V5 includes ONE free power at the new level — show a picker before submitting.
const RITUAL_DISC_NAMES = ["Blood Sorcery"];

function DisciplineCard({ cd, learnedPowerIds, isInClan, onImprove, onUnimprove, availableXp, onClaimFreePower, tempDots, onAddTempDot, onRemoveTempDot, freeEdit, onRemoveDiscipline, learnedRituals = [], onOpenRitualBook }) {
  const [expandedRituals, setExpandedRituals] = useState(new Set());
  const toggleRitual = (id) => setExpandedRituals(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const disc        = cd.discipline;
  const allPowers   = disc.powers ?? [];
  const newLevel    = cd.level + 1;
  // V5: in-clan dot = new_level × 5, out-of-clan = new_level × 7
  const upgradeCost = newLevel * (isInClan ? 5 : 7);
  const refundCost  = cd.level  * (isInClan ? 5 : 7);
  // V5: additional power = flat 3 (in-clan) or 5 (out-of-clan)
  const extraPowerCost = isInClan ? 3 : 5;

  const canUpgrade = onImprove && cd.level < 5 && (freeEdit || availableXp >= upgradeCost);

  // Powers at the NEW level that aren't learned yet (candidates for the free pick on upgrade)
  const freeCandidates = allPowers.filter(
    (p) => p.level === newLevel && !learnedPowerIds.has(p.id)
  );

  // State for the free-power picker shown when "+" is clicked
  const [picking, setPicking]         = useState(false);
  const [pickedPowerId, setPickedPowerId] = useState(null);

  // Info popup for powers shown inside any picker
  const [powerInfo, setPowerInfo] = useState(null);

  // ── Underpowered detection (predator type bonus dot has no power chosen) ──
  // Count learned powers per level for this discipline
  const learnedForThisDisc = allPowers.filter((p) => learnedPowerIds.has(p.id));
  const learnedCount = learnedForThisDisc.length;
  const isUnderpowered = learnedCount < cd.level;
  // The missing level = the lowest level that has no learned power
  const missingLevel = (() => {
    for (let lvl = 1; lvl <= cd.level; lvl++) {
      const hasAtLevel = learnedForThisDisc.some((p) => p.level === lvl);
      if (!hasAtLevel) return lvl;
    }
    return null;
  })();
  const claimCandidates = missingLevel
    ? allPowers.filter((p) => p.level === missingLevel && !learnedPowerIds.has(p.id))
    : [];

  // State for the claim-free-power picker
  const [claiming, setClaiming]             = useState(false);
  const [claimPickedId, setClaimPickedId]   = useState(null);

  const handleRaiseDot = () => {
    if (freeCandidates.length === 0) {
      // No power to pick — just raise the dot
      onImprove("discipline", null, { discipline_id: disc.id });
    } else if (freeCandidates.length === 1) {
      // Only one option — auto-select it
      onImprove("discipline", null, { discipline_id: disc.id, power_id: freeCandidates[0].id });
    } else {
      // Multiple options — show picker
      setPicking(true);
      setPickedPowerId(freeCandidates[0].id);
    }
  };

  const handleConfirmPick = () => {
    onImprove("discipline", null, { discipline_id: disc.id, power_id: pickedPowerId || undefined });
    setPicking(false);
  };

  // Only show learned powers; no separate "buy a power" mechanic in V5
  const learnedPowers = allPowers.filter((p) => learnedPowerIds.has(p.id));

  return (
    <div className={`bg-void border rounded-lg p-4 ${isUnderpowered ? "border-yellow-700/60" : "border-void-border"}`}>
      {/* Discipline header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="font-gothic text-lg text-gray-200">{disc.name}</span>
          {freeEdit && onRemoveDiscipline && (
            <button
              onClick={() => onRemoveDiscipline(disc.id)}
              className="text-gray-700 hover:text-blood text-xs transition-colors"
              title="Remove discipline"
            >✕</button>
          )}
          {!isInClan && (onImprove || onUnimprove) && (
            <span className="ml-2 text-xs text-gray-600 italic">out-of-clan</span>
          )}
          {/* Warning icon — free power not yet claimed */}
          {isUnderpowered && (
            <button
              onClick={() => { setClaiming((v) => !v); setClaimPickedId(claimCandidates[0]?.id ?? null); }}
              title="Free power from predator type not yet chosen — click to pick"
              className="text-yellow-500 hover:text-yellow-300 text-base leading-none transition-colors"
            >⚠</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Regular dots + colored temp dots */}
          <DotRating value={cd.level + (tempDots < 0 ? tempDots : 0)} max={5} size="text-sm" />
          {tempDots > 0 && (
            <span className="text-blue-400 text-sm tracking-widest">{"●".repeat(tempDots)}</span>
          )}
          {tempDots < 0 && (
            <span className="text-red-500 text-sm tracking-widest">{"●".repeat(-tempDots)}</span>
          )}
          {/* Undo last dot (−) */}
          {onUnimprove && cd.level > 1 && (
            <button
              onClick={() => onUnimprove("discipline", null, { discipline_id: disc.id })}
              title={`Refund ${refundCost} XP — lower to ${cd.level - 1} and remove power`}
              className="w-5 h-5 rounded-full border border-gray-700 text-gray-600 hover:border-blood hover:text-blood text-xs font-bold leading-none transition-colors"
            >−</button>
          )}
          {/* Raise dot (+) */}
          {onImprove && cd.level < 5 && (
            <button
              onClick={handleRaiseDot}
              disabled={!canUpgrade}
              title={canUpgrade ? `Raise to ${newLevel} (${upgradeCost} XP) — pick 1 power` : `Need ${upgradeCost} XP (have ${availableXp})`}
              className={`w-5 h-5 rounded-full border text-xs font-bold leading-none transition-colors ${
                canUpgrade
                  ? "border-blood text-blood hover:bg-blood hover:text-white"
                  : "border-gray-700 text-gray-700 cursor-not-allowed"
              }`}
            >+</button>
          )}
          {/* Temp dot controls */}
          {onRemoveTempDot && (cd.level + tempDots) > 1 && (
            <button
              onClick={() => onRemoveTempDot(disc.id)}
              title={tempDots >= 0 ? "Remove a dot temporarily (shown in red)" : "Remove another temporary dot"}
              className="w-5 h-5 rounded-full border border-red-800 text-red-600 hover:border-red-500 hover:text-red-400 text-xs font-bold leading-none transition-colors"
            >−</button>
          )}
          {onAddTempDot && (cd.level + tempDots) < 5 && (
            <button
              onClick={() => onAddTempDot(disc.id)}
              title="Add temporary dot (shown in blue)"
              className="w-5 h-5 rounded-full border border-blue-700 text-blue-500 hover:border-blue-400 hover:bg-blue-900/30 text-xs font-bold leading-none transition-colors"
            >+</button>
          )}
        </div>
      </div>

      {/* Power picker — shown when multiple choices exist at the new level */}
      {picking && (
        <div className="mb-3 bg-void-light border border-blood-dark/40 rounded p-3">
          <p className="text-xs text-blood-dark font-gothic tracking-wider uppercase mb-2">
            Choose your level-{newLevel} power (included in {upgradeCost} XP)
          </p>
          <div className="space-y-1 mb-3">
            {freeCandidates.map((p) => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`freePower-${disc.id}`}
                  value={p.id}
                  checked={pickedPowerId === p.id}
                  onChange={() => setPickedPowerId(p.id)}
                  className="accent-blood"
                />
                <span className="text-sm text-gray-300">{p.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setPowerInfo(p); }}
                  className="text-gray-600 hover:text-blood text-xs ml-auto shrink-0"
                  title="View power details"
                >ℹ</button>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleConfirmPick} className="vtm-btn py-1 px-3 text-xs">
              Confirm ({upgradeCost} XP)
            </button>
            <button onClick={() => setPicking(false)} className="vtm-btn-secondary py-1 px-3 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Claim free predator-type power panel ── */}
      {claiming && isUnderpowered && (
        <div className="mb-3 bg-yellow-950/30 border border-yellow-700/50 rounded p-3">
          <p className="text-xs text-yellow-400 font-gothic tracking-wider uppercase mb-1">
            Free Power — Predator Type Bonus
          </p>
          <p className="text-gray-400 text-xs mb-3">
            Your predator type granted a free level-{missingLevel} dot in {disc.name}.
            Choose the power that comes with it:
          </p>
          {claimCandidates.length === 0 ? (
            <p className="text-gray-600 text-xs italic">No powers available at this level.</p>
          ) : (
            <div className="space-y-1 mb-3">
              {claimCandidates.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`claim-${disc.id}`}
                    checked={claimPickedId === p.id}
                    onChange={() => setClaimPickedId(p.id)}
                    className="accent-yellow-600"
                  />
                  <span className="text-sm text-gray-300">{p.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPowerInfo(p); }}
                    className="text-gray-600 hover:text-yellow-500 text-xs ml-auto shrink-0"
                    title="View power details"
                  >ℹ</button>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { if (claimPickedId) onClaimFreePower(claimPickedId); setClaiming(false); }}
              disabled={!claimPickedId}
              className="vtm-btn py-1 px-3 text-xs disabled:opacity-40"
            >
              Claim Power (Free)
            </button>
            <button onClick={() => setClaiming(false)} className="vtm-btn-secondary py-1 px-3 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Learned power cards */}
      {learnedPowers.length === 0 ? (
        <p className="text-gray-700 text-xs italic">No powers learned yet.</p>
      ) : (
        <div className="space-y-2">
          {learnedPowers.map((power) => (
            <PowerCard key={power.id} power={power} />
          ))}
        </div>
      )}

      {/* ── Rituals / Ceremonies (Blood Sorcery & Oblivion only) ── */}
      {RITUAL_DISC_NAMES.includes(disc.name) && (
        <div className="mt-3 pt-3 border-t border-void-border/40">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-gothic">
              {disc.name === "Oblivion" ? "Ceremonies" : "Rituals"}
            </p>
            <button
              onClick={onOpenRitualBook}
              className="flex items-center gap-1 text-xs bg-blood/20 hover:bg-blood/40 text-blood hover:text-white border border-blood/50 hover:border-blood rounded px-2 py-0.5 transition-colors font-gothic tracking-wide"
            >
              📓 Ritual Book
              {learnedRituals.length === 0 && (
                <span className="text-yellow-500" title="Free ritual to claim!">⚠</span>
              )}
            </button>
          </div>
          {learnedRituals.length === 0 ? (
            <p className="text-gray-700 text-xs italic">No {disc.name === "Oblivion" ? "ceremonies" : "rituals"} learned.</p>
          ) : (
            <div className="space-y-0.5">
              {learnedRituals.map(cr => {
                const isOpen = expandedRituals.has(cr.id);
                const hasDetail = !!(cr.ritual.description || cr.ritual.system_text);
                return (
                  <div key={cr.id}>
                    <div
                      className={`flex items-center gap-2 text-xs rounded px-1 py-0.5 transition-colors ${hasDetail ? "cursor-pointer hover:bg-white/5" : ""}`}
                      onClick={() => hasDetail && toggleRitual(cr.id)}
                    >
                      <span className="text-blood-dark w-12 shrink-0">{"●".repeat(cr.ritual.level)}</span>
                      <span className="text-gray-300 flex-1">{cr.ritual.name}</span>
                      {hasDetail && (
                        <span className="text-gray-600 text-[10px] shrink-0">{isOpen ? "▲" : "▼"}</span>
                      )}
                    </div>
                    {isOpen && (
                      <div className="ml-14 mb-1 space-y-1 border-l border-blood-dark/30 pl-2 py-1">
                        {cr.ritual.description && (
                          <p className="text-gray-400 text-[11px] italic leading-relaxed">{cr.ritual.description}</p>
                        )}
                        {cr.ritual.system_text && (
                          <p className="text-gray-300 text-[11px] leading-relaxed whitespace-pre-line">{cr.ritual.system_text}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Power info popup — triggered by ℹ buttons inside pickers */}
      {powerInfo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPowerInfo(null)}
        >
          <div
            className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-gothic text-xl text-blood">{powerInfo.name}</h3>
              <button onClick={() => setPowerInfo(null)} className="text-gray-500 hover:text-white ml-4">✕</button>
            </div>
            <p className="text-blood-dark text-xs mb-3">
              {"●".repeat(powerInfo.level)}{"○".repeat(5 - powerInfo.level)}
            </p>
            {powerInfo.description && (
              <p className="text-gray-400 text-sm italic mb-3 leading-relaxed">{powerInfo.description}</p>
            )}
            {powerInfo.system_text && (
              <div className="border-t border-void-border pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">System</p>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{powerInfo.system_text}</p>
              </div>
            )}
            {powerInfo.prerequisite && (
              <p className="text-xs text-gray-600 mt-3">
                <span className="text-gray-500">Prerequisite:</span> {powerInfo.prerequisite}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Attribute/skill column ────────────────────────────────────────────────────
function StatColumn({ heading, names, lookup, specialtyMap, traitType, onImprove, onUnimprove, availableXp, tempDotsMap, onAddTempDot, onRemoveTempDot, freeEdit, onAddSpecialty, onDeleteSpecialty }) {
  const minVal = traitType === "attribute" ? 1 : 0;
  const canEditSpecialties = traitType === "skill" && (onImprove || freeEdit) && (onAddSpecialty || onDeleteSpecialty);
  // Per-skill "add specialty" input state
  const [addingSpecialtyFor, setAddingSpecialtyFor] = useState(null);
  const [newSpecialtyText, setNewSpecialtyText] = useState("");

  return (
    <div className="flex-1 min-w-[160px]">
      <p className="font-gothic text-blood-dark text-sm tracking-wider uppercase mb-2">{heading}</p>
      {names.map((name) => {
        const val         = lookup[name] ?? 0;
        const displayName = name.replace("_", " ");
        const specs       = specialtyMap?.[name] ?? [];
        const buyCost     = traitType === "attribute" ? (val + 1) * 5 : (val + 1) * 3;
        const refund      = traitType === "attribute" ? val * 5 : val * 3;
        const canAfford   = onImprove && val < 5 && (freeEdit || availableXp >= buyCost);
        const tempVal     = tempDotsMap?.[name] ?? 0;
        const isAddingHere = addingSpecialtyFor === name;
        return (
          <div key={name} className="mb-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-gray-300 text-sm truncate">{displayName}</span>
            <div className="flex items-center gap-1 shrink-0">
              {/* Undo improve / temp remove */}
              {onUnimprove ? (
                val > minVal ? (
                  <button
                    onClick={() => onUnimprove(traitType, name)}
                    title={`Refund ${refund} XP — lower to ${val - 1}`}
                    className="w-5 h-5 rounded-full border border-gray-700 text-gray-600 hover:border-blood hover:text-blood text-xs font-bold leading-none transition-colors"
                  >−</button>
                ) : (
                  <span className="w-5 h-5 inline-block shrink-0" />
                )
              ) : onRemoveTempDot ? (
                (val + tempVal) > minVal ? (
                  <button
                    onClick={() => onRemoveTempDot(traitType, name)}
                    title={tempVal >= 0 ? "Remove a dot temporarily (shown in red)" : "Remove another temporary dot"}
                    className="w-5 h-5 rounded-full border border-red-800 text-red-600 hover:border-red-500 hover:text-red-400 text-xs font-bold leading-none transition-colors"
                  >−</button>
                ) : (
                  <span className="w-5 h-5 inline-block shrink-0" />
                )
              ) : null}

              {/* Dots: permanent filled, blue temp bonus, or dim × for excluded — all inside track */}
              <DotRating value={val} tempValue={tempVal} max={5} size="text-sm" />

              {/* Raise improve / temp add */}
              {onImprove ? (
                val < 5 ? (
                  <button
                    onClick={() => onImprove(traitType, name)}
                    disabled={!canAfford}
                    title={canAfford ? `Spend ${buyCost} XP → ${val + 1}` : `Need ${buyCost} XP (have ${availableXp})`}
                    className={`w-5 h-5 rounded-full border text-xs font-bold leading-none transition-colors ${
                      canAfford ? "border-blood text-blood hover:bg-blood hover:text-white" : "border-gray-700 text-gray-700 cursor-not-allowed"
                    }`}
                  >+</button>
                ) : (
                  <span className="w-5 h-5 inline-block shrink-0" />
                )
              ) : onAddTempDot ? (
                val + tempVal < 5 ? (
                  <button
                    onClick={() => onAddTempDot(traitType, name)}
                    title="Add temporary dot (shown in blue)"
                    className="w-5 h-5 rounded-full border border-blue-700 text-blue-500 hover:border-blue-400 hover:bg-blue-900/30 text-xs font-bold leading-none transition-colors"
                  >+</button>
                ) : (
                  <span className="w-5 h-5 inline-block shrink-0" />
                )
              ) : null}
            </div>
          </div>

          {/* Specialties — shown below skill row in improve/freeEdit mode */}
          {traitType === "skill" && (
            <div className="ml-0 mt-0.5">
              {specs.map((sp) => (
                <span key={sp} className="inline-flex items-center gap-1 text-blood-dark text-xs mr-2">
                  <span className="italic">{sp}</span>
                  {canEditSpecialties && onDeleteSpecialty && (
                    <button
                      onClick={() => onDeleteSpecialty(name, sp)}
                      title="Remove specialty"
                      className="text-gray-700 hover:text-blood leading-none transition-colors"
                    >✕</button>
                  )}
                </span>
              ))}
              {canEditSpecialties && onAddSpecialty && val > 0 && (
                isAddingHere ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      autoFocus
                      className="bg-void border border-void-border rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-blood w-28"
                      placeholder="Specialty…"
                      value={newSpecialtyText}
                      onChange={(e) => setNewSpecialtyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSpecialtyText.trim()) {
                          onAddSpecialty(name, newSpecialtyText.trim());
                          setNewSpecialtyText("");
                          setAddingSpecialtyFor(null);
                        }
                        if (e.key === "Escape") { setAddingSpecialtyFor(null); setNewSpecialtyText(""); }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newSpecialtyText.trim()) {
                          onAddSpecialty(name, newSpecialtyText.trim());
                          setNewSpecialtyText("");
                          setAddingSpecialtyFor(null);
                        }
                      }}
                      className="text-blood text-xs hover:text-red-400"
                    >✓</button>
                    <button
                      onClick={() => { setAddingSpecialtyFor(null); setNewSpecialtyText(""); }}
                      className="text-gray-600 text-xs hover:text-gray-400"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingSpecialtyFor(name); setNewSpecialtyText(""); }}
                    className="text-gray-700 hover:text-blood text-xs transition-colors"
                    title="Add specialty"
                  >+ spec</button>
                )
              )}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h3 className="font-gothic text-blood text-lg tracking-widest uppercase border-b border-void-border pb-1 mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Main CharacterSheet ───────────────────────────────────────────────────────

export default function CharacterSheet({
  character,
  onAddWeapon,
  onDeleteWeapon,
  onAddPossession,
  onDeletePossession,
  onImprove,       // (traitType, traitName, extra) — shows buy buttons when provided
  onUnimprove,     // (traitType, traitName, extra) — shows undo buttons when provided
  onSaveSession,   // (sessionData) — called by "End Session"
  onHungerChange,  // (newHunger) — lets parent track hunger for dice roller
  onCharacterUpdate, // (updatedCharacter) — called after merit/flaw/background add-remove
  onClaimFreePower,  // (powerId) — called when player claims free predator-type power
  tempMode = false,  // when true, shows blue temp-dot +/- buttons
  onSetTempDots,     // (tempDotsObj) — saves temp dots to backend
  freeEdit = false,  // when true, all stats editable for free (retainer mode)
  onOpenRetainer,    // (retainerId) — opens retainer sheet
  onAddPredatorType, // () — called when player wants to set a predator type post-wizard
  onAddSpecialty,    // (skillName, specialtyName) — add specialty
  onDeleteSpecialty, // (skillName, specialtyName) — delete specialty
}) {
  const availableXp = character.total_xp - character.spent_xp;

  // ── Session state ────────────────────────────────────────────────────────
  const [currentBP,       setCurrentBP]       = useState(character.blood_potency);
  const [currentHunger,   setCurrentHunger]   = useState(character.current_hunger ?? 0);
  const [currentHumanity, setCurrentHumanity] = useState(character.humanity);
  const [stains,          setStains]          = useState(0);
  const [healthTrack,     setHealthTrack]     = useState(() =>
    buildTrack(character.health, character.health_superficial, character.health_aggravated));
  const [wpTrack,         setWpTrack]         = useState(() =>
    buildTrack(character.willpower, character.willpower_superficial, character.willpower_aggravated));
  const [sessionDirty,    setSessionDirty]    = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [autoSaveStatus,  setAutoSaveStatus]  = useState(null); // null | "saving" | "saved"
  const autoSaveTimer = useRef(null);

  // Add discipline (retainer only)
  const [showAddDisc, setShowAddDisc] = useState(false);
  const [availDiscs, setAvailDiscs] = useState([]);
  const [addDiscId, setAddDiscId] = useState(null);

  // Retainers
  const [showRetainerForm, setShowRetainerForm] = useState(false);
  const [retainerName, setRetainerName] = useState("");
  const [retainerConcept, setRetainerConcept] = useState("");
  const [retainerLevel, setRetainerLevel] = useState("");
  const [retainerSaving, setRetainerSaving] = useState(false);
  const retainerMerits = character.merits.filter(m => m.merit.name.toLowerCase().includes("retainer"));
  const retainerMeritCount = retainerMerits.length;
  // Levels already claimed by existing retainers
  const usedRetainerLevels = (character.retainers || []).map(r => r.retainer_level).filter(Boolean);
  // Available levels = retainer merit levels not yet assigned to a retainer
  const availableRetainerLevels = retainerMerits.map(m => m.level).filter(lvl => !usedRetainerLevels.includes(lvl));

  // Portrait upload
  const [portraitUrl, setPortraitUrl] = useState(character.portrait_url || null);
  const [portraitUploading, setPortraitUploading] = useState(false);
  const portraitInputRef = useRef(null);

  const handlePortraitUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPortraitUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/api/portraits/${character.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPortraitUrl(res.data.portrait_url);
    } catch (err) {
      console.error("Portrait upload failed", err);
    } finally {
      setPortraitUploading(false);
    }
  };

  // Dice roller state
  const [showRemorse,     setShowRemorse]     = useState(false);

  // Inline weapon form
  const [showWeaponForm,  setShowWeaponForm]  = useState(false);
  const [weaponForm,      setWeaponForm]      = useState({ name: "", damage: "", range: "", clips: "", traits: "", notes: "" });
  const [weaponError,     setWeaponError]     = useState(null);
  const [weaponSaving,    setWeaponSaving]    = useState(false);

  // Inline possession form
  const [showPossessionForm, setShowPossessionForm] = useState(false);
  const [possessionForm,     setPossessionForm]     = useState({ name: "", description: "" });
  const [possessionError,    setPossessionError]    = useState(null);
  const [possessionSaving,   setPossessionSaving]   = useState(false);

  // Active conditions on this character
  const [activeConditions, setActiveConditions] = useState([]);

  // Info popup (merit / flaw / background details)
  const [infoPopup, setInfoPopup] = useState(null); // { name, description, system_text } | null

  // Clan bane dropdown
  const [showClanBane, setShowClanBane] = useState(false);

  // Notes — always-visible inline textarea with auto-save
  const [notesText,    setNotesText]    = useState(character.notes || "");
  const [notesSaving,  setNotesSaving]  = useState(false);
  const notesTimer = useRef(null);

  // Beliefs editing
  const [showBeliefEdit,  setShowBeliefEdit]  = useState(false);
  const [beliefForm,      setBeliefForm]      = useState({ conviction: "", touchstone: "" });
  const [tenetForm,       setTenetForm]       = useState("");
  const [beliefSaving,    setBeliefSaving]    = useState(false);
  const [beliefError,     setBeliefError]     = useState(null);

  // Expanded inline descriptions in Advantages & Flaws section
  const [expandedAdvantages, setExpandedAdvantages] = useState(new Set());
  const toggleAdvantageExpand = (key) =>
    setExpandedAdvantages((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Add-merit/flaw/background panel (shown when onImprove is active OR editAdvantages is on)
  const [editAdvantages, setEditAdvantages] = useState(false);
  // Ritual book
  const [showRitualBook, setShowRitualBook] = useState(false);
  const [ritualBookDiscId, setRitualBookDiscId] = useState(null); // which discipline opened the book
  const [allRituals, setAllRituals] = useState([]);
  const [ritualSearch, setRitualSearch] = useState("");
  const [ritualLevelFilter, setRitualLevelFilter] = useState([]); // [] = all
  const [ritualInfoId, setRitualInfoId] = useState(null);
  const [ritualError, setRitualError] = useState(null);
  const [ritualPage, setRitualPage] = useState(0);       // which level index (0–4)
  const [ritualSubPage, setRitualSubPage] = useState(0); // pagination within a level

  const [showAddAdvantage, setShowAddAdvantage] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [addAdvType, setAddAdvType] = useState("merit"); // "merit"|"flaw"|"background"
  const [availGameData, setAvailGameData] = useState({ merits: [], flaws: [], backgrounds: [] });
  const [addAdvId, setAddAdvId] = useState(null);
  const [addAdvLevel, setAddAdvLevel] = useState(1);
  const [addAdvNotes, setAddAdvNotes] = useState("");
  const [addAdvSaving, setAddAdvSaving] = useState(false);
  const [addAdvError, setAddAdvError] = useState(null);
  const fetchConditions = async (id) => {
    try {
      const res = await api.get(`/api/conditions/character/${id}`);
      setActiveConditions(res.data);
    } catch (_) { setActiveConditions([]); }
  };

  // Reset on character change
  useEffect(() => {
    setCurrentBP(character.blood_potency);
    setCurrentHunger(character.current_hunger ?? 0);
    setCurrentHumanity(character.humanity);
    setStains(0);
    setHealthTrack(buildTrack(character.health, character.health_superficial, character.health_aggravated));
    setWpTrack(buildTrack(character.willpower, character.willpower_superficial, character.willpower_aggravated));
    setSessionDirty(false);
    setSaving(false);
    setShowRemorse(false);
    setShowWeaponForm(false);
    setWeaponForm({ name: "", damage: "", range: "", clips: "", traits: "", notes: "" });
    setWeaponError(null);
    setShowPossessionForm(false);
    setPossessionForm({ name: "", description: "" });
    setPossessionError(null);
    fetchConditions(character.id);
    setShowAddAdvantage(false);
    setAddAdvError(null);
    setNotesText(character.notes || "");
    setShowBeliefEdit(false);
    setBeliefForm({ conviction: "", touchstone: "" });
    setTenetForm("");
    setBeliefError(null);
  }, [character.id]);

  // Load game data lists when the add-advantage panel opens
  useEffect(() => {
    if (!showAddAdvantage) return;
    Promise.all([
      api.get("/api/game-data/merits").catch(() => ({ data: [] })),
      api.get("/api/game-data/flaws").catch(() => ({ data: [] })),
      api.get("/api/game-data/backgrounds").catch(() => ({ data: [] })),
    ]).then(([m, fl, bg]) => {
      setAvailGameData({ merits: m.data, flaws: fl.data, backgrounds: bg.data });
    });
  }, [showAddAdvantage]);

  // On mount: immediately save current state so GM sees the player as "live"
  useEffect(() => {
    if (!character.id) return;
    api.put(`/api/characters/${character.id}/session`, {
      blood_potency:         character.blood_potency,
      current_hunger:        character.current_hunger ?? 0,
      humanity:              character.humanity,
      health_superficial:    character.health_superficial,
      health_aggravated:     character.health_aggravated,
      willpower_superficial: character.willpower_superficial,
      willpower_aggravated:  character.willpower_aggravated,
    }).catch(() => {});
  }, [character.id]);

  // Auto-save: whenever session state is dirty, debounce 1.5 s then silently persist
  useEffect(() => {
    if (!sessionDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus("saving");
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/api/characters/${character.id}/session`, {
          blood_potency:         currentBP,
          current_hunger:        currentHunger,
          humanity:              currentHumanity,
          health_superficial:    healthTrack.filter((s) => s === 1).length,
          health_aggravated:     healthTrack.filter((s) => s === 2).length,
          willpower_superficial: wpTrack.filter((s) => s === 1).length,
          willpower_aggravated:  wpTrack.filter((s) => s === 2).length,
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus(null), 2000);
      } catch (_) {
        setAutoSaveStatus(null);
      }
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [sessionDirty, currentBP, currentHunger, currentHumanity, healthTrack, wpTrack]);

  // Dirty-marking setters
  const dirty = () => setSessionDirty(true);
  const setBP  = (v) => { setCurrentBP(v); dirty(); };
  const setHg  = (v) => { setCurrentHunger(v); dirty(); if (onHungerChange) onHungerChange(v); };
  const setHum = (v) => { setCurrentHumanity(v); dirty(); };
  const setStn = (v) => { setStains(v); dirty(); };
  const setHT  = (v) => { setHealthTrack(v); dirty(); };
  const setWT  = (v) => { setWpTrack(v); dirty(); };

  // The core save call with explicit values (used after remorse resolution)
  const performSave = async (humanity, stainCount) => {
    if (!onSaveSession) return;
    setSaving(true);
    await onSaveSession({
      blood_potency:          currentBP,
      current_hunger:         currentHunger,
      humanity,
      health_superficial:     healthTrack.filter((s) => s === 1).length,
      health_aggravated:      healthTrack.filter((s) => s === 2).length,
      willpower_superficial:  wpTrack.filter((s) => s === 1).length,
      willpower_aggravated:   wpTrack.filter((s) => s === 2).length,
    });
    setSaving(false);
    setSessionDirty(false);
    // stainCount should be 0 after remorse; update local state
    setCurrentHumanity(humanity);
    setStains(stainCount);
  };

  // "End Session" button handler
  const handleEndSession = () => {
    if (stains > 0) {
      setShowRemorse(true); // force remorse roll first
    } else {
      performSave(currentHumanity, 0);
    }
  };

  // Called after the remorse dice roll
  const handleRemorseResult = (success) => {
    if (success) {
      // Stains wiped — humanity restored
      const restored = currentHumanity + stains;
      performSave(restored, 0);
    } else {
      // Failed — lose 1 humanity, stains cleared
      const fallen = Math.max(0, currentHumanity - 1);
      performSave(fallen, 0);
    }
    setShowRemorse(false);
  };

  // Remorse pool = empty boxes = max(1, 10 - filled - stained)
  const remorsePool = Math.max(1, 10 - currentHumanity - stains);

  // Lookup maps
  const attrMap = Object.fromEntries(character.attributes.map((a) => [a.name, a.value]));
  const skillMap = Object.fromEntries(character.skills.map((s) => [s.name, s.value]));
  const specialtyMap = {};
  for (const sp of character.specialties) {
    if (!specialtyMap[sp.skill_name]) specialtyMap[sp.skill_name] = [];
    specialtyMap[sp.skill_name].push(sp.specialty_name);
  }
  // Set of learned power IDs (used by DisciplineCard to mark ✓ on powers)
  const learnedPowerIds = new Set(character.powers.map((cp) => cp.power.id));

  // ── Temp dots ─────────────────────────────────────────────────────────────
  const tempDots = character.temp_dots || { attributes: {}, skills: {}, disciplines: {} };

  // Stamina temp dots add/remove health slots; Composure temp dots add/remove willpower slots
  const staminaTemp  = tempDots.attributes?.["Stamina"]  ?? 0;
  const composureTemp = tempDots.attributes?.["Composure"] ?? 0;
  const effectiveHealth    = Math.max(1, character.health    + staminaTemp);
  const effectiveWillpower = Math.max(1, character.willpower + composureTemp);

  const handleAddTempDot = (category, key) => {
    if (!onSetTempDots) return;
    const current = tempDots[category]?.[String(key)] ?? 0;
    const updated = {
      ...tempDots,
      [category]: { ...(tempDots[category] || {}), [String(key)]: current + 1 }
    };
    onSetTempDots(updated);
  };

  const handleRemoveTempDot = (category, key) => {
    if (!onSetTempDots) return;
    const current = tempDots[category]?.[String(key)] ?? 0;
    const newVal = current - 1;
    const updated = {
      ...tempDots,
      [category]: { ...(tempDots[category] || {}), [String(key)]: newVal }
    };
    onSetTempDots(updated);
  };

  // ── Notes auto-save ───────────────────────────────────────────────────────
  const handleNotesChange = (val) => {
    setNotesText(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setNotesSaving(true);
      try {
        await api.put(`/api/characters/${character.id}`, { notes: val });
        if (onCharacterUpdate) {
          // update the parent's copy with new notes
          onCharacterUpdate({ ...character, notes: val });
        }
      } catch (_) { /* silent */ }
      finally { setNotesSaving(false); }
    }, 1200);
  };

  // ── Belief handlers ───────────────────────────────────────────────────────
  const handleAddConviction = async () => {
    if (!beliefForm.conviction.trim() || !beliefForm.touchstone.trim()) {
      setBeliefError("Both conviction and touchstone are required.");
      return;
    }
    setBeliefSaving(true); setBeliefError(null);
    try {
      const res = await api.post(`/api/characters/${character.id}/convictions`, beliefForm);
      if (onCharacterUpdate) onCharacterUpdate(res.data);
      setBeliefForm({ conviction: "", touchstone: "" });
    } catch (err) {
      setBeliefError(err.response?.data?.detail || "Failed to add conviction.");
    } finally { setBeliefSaving(false); }
  };

  const handleRemoveConviction = async (convictionId) => {
    try {
      const res = await api.delete(`/api/characters/${character.id}/convictions/${convictionId}`);
      if (onCharacterUpdate) onCharacterUpdate(res.data);
    } catch (_) { /* silent */ }
  };

  const handleAddTenet = async () => {
    if (!tenetForm.trim()) { setBeliefError("Tenet text is required."); return; }
    setBeliefSaving(true); setBeliefError(null);
    try {
      const res = await api.post(`/api/characters/${character.id}/tenets`, { tenet: tenetForm });
      if (onCharacterUpdate) onCharacterUpdate(res.data);
      setTenetForm("");
    } catch (err) {
      setBeliefError(err.response?.data?.detail || "Failed to add tenet.");
    } finally { setBeliefSaving(false); }
  };

  const handleRemoveTenet = async (tenetId) => {
    try {
      const res = await api.delete(`/api/characters/${character.id}/tenets/${tenetId}`);
      if (onCharacterUpdate) onCharacterUpdate(res.data);
    } catch (_) { /* silent */ }
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header — two cards side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Card 1: Name + Concept + Ambition / Desire stacked */}
        <div className="bg-void-light border border-void-border rounded-lg p-6 flex flex-col gap-3">
          <div>
            <h2 className="font-gothic text-4xl text-blood mb-1">{character.name}</h2>
            <p className="text-gray-400 text-sm">{character.concept}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-500 text-xs uppercase tracking-widest">Ambition</span>
              <br /><span className="text-gray-300">{character.ambition || "—"}</span>
            </p>
            <p className="pt-1">
              <span className="text-gray-500 text-xs uppercase tracking-widest">Desire</span>
              <br /><span className="text-gray-300">{character.desire || "—"}</span>
            </p>
          </div>
          {activeConditions.length > 0 && (
            <div className="pt-3 border-t border-void-border/50">
              <p className="text-xs text-gray-600 font-gothic tracking-widest uppercase mb-2">Active Conditions</p>
              <ConditionBadges conditions={activeConditions} />
            </div>
          )}
        </div>

        {/* Card 2: Clan + Predator Type + Generation — with clan background image */}
        <div
          className="border border-void-border rounded-lg p-6 flex flex-col gap-4 relative overflow-hidden"
          style={{ minHeight: "160px" }}
        >
          {/* Background image layer */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${getClanBg(character.clan?.name)}')` }}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/75" />
          {/* Static noise overlay (SVG turbulence, non-animated) */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
            }}
          />
          {/* Content on top */}
          <div className="relative z-10 flex gap-4 h-full">
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Clan</p>
                <p className="font-gothic text-lg text-gray-100">{character.clan?.name ?? "—"}</p>
                {character.clan?.bane && (
                  <div className="mt-1">
                    <button
                      onClick={() => setShowClanBane(v => !v)}
                      className="flex items-center gap-1 text-blood text-xs hover:text-red-400 transition-colors"
                    >
                      <span className={`transition-transform duration-200 ${showClanBane ? "rotate-90" : ""}`}>▶</span>
                      <span className="font-gothic tracking-wider">Clan Bane</span>
                    </button>
                    {showClanBane && (
                      <p className="mt-1 text-gray-300 text-xs leading-relaxed bg-black/30 rounded p-2 border border-blood/20">
                        {character.clan.bane}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Predator Type</p>
                {character.predator_type?.name
                  ? <p className="text-gray-200 text-sm">{character.predator_type.name}</p>
                  : onAddPredatorType
                    ? <button onClick={onAddPredatorType} className="text-blood text-xs hover:text-red-400 transition-colors font-gothic tracking-wider">+ Set Predator Type →</button>
                    : <p className="text-gray-200 text-sm">—</p>
                }
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Generation</p>
                <p className="text-gray-200 text-sm">{GENERATION_LABEL[character.generation] ?? "—"}</p>
              </div>
            </div>

            {/* Portrait — sits over the clan art */}
            <div className="relative shrink-0 self-stretch flex items-center">
              <div
                className="w-36 h-full min-h-[120px] rounded-lg border-2 border-void-border/60 overflow-hidden bg-void/60 cursor-pointer group"
                onClick={() => portraitInputRef.current?.click()}
                title="Click to upload photo"
              >
                {portraitUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${portraitUrl}`}
                    alt="Portrait"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs text-center px-2">
                    {portraitUploading ? "…" : "Add\nPhoto"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-gray-300">
                  {portraitUploading ? "Uploading…" : "Change"}
                </div>
              </div>
              <input
                ref={portraitInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePortraitUpload}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── Core Stats ── */}
      <div className="mb-6 space-y-3">

        {/* Dot trackers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-void-light border border-void-border rounded-lg p-4 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Blood Potency</p>
            <DotTracker value={currentBP} max={5} onChange={setBP} variant="blood" />
          </div>
          <div className="bg-void-light border border-void-border rounded-lg p-4 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Hunger</p>
            <DotTracker value={currentHunger} max={5} onChange={setHg} variant="hunger" />
          </div>
          <div className="bg-void-light border border-void-border rounded-lg p-4 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">
              Humanity
              {stains > 0 && (
                <span className="ml-2 text-blood-dark text-xs">(stains: {stains})</span>
              )}
            </p>
            <HumanityTracker
              value={currentHumanity}
              stains={stains}
              onChangeHumanity={setHum}
              onChangeStains={setStn}
            />
            {stains > 0 && (
              <p className="text-gray-600 text-xs mt-2">Remorse roll required at End Session</p>
            )}
          </div>
        </div>

        {/* Damage tracks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-void-light border border-void-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-gray-500 text-xs uppercase tracking-widest">Health</p>
              <p className="text-gray-700 text-xs">
                <span className="text-yellow-600">/ superficial</span>
                <span className="mx-1">·</span>
                <span className="text-blood">× aggravated</span>
              </p>
            </div>
            <DamageTrack track={healthTrack} maxActive={effectiveHealth} onChange={setHT} />
          </div>
          <div className="bg-void-light border border-void-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-gray-500 text-xs uppercase tracking-widest">Willpower</p>
              <p className="text-gray-700 text-xs">
                <span className="text-yellow-600">/ superficial</span>
                <span className="mx-1">·</span>
                <span className="text-blood">× aggravated</span>
              </p>
            </div>
            <DamageTrack track={wpTrack} maxActive={effectiveWillpower} onChange={setWT} />
          </div>
        </div>

        {/* End Session button */}
        {onSaveSession && (
          <div className="flex justify-end items-center gap-3">
            {/* Auto-save indicator */}
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-gray-600 animate-pulse">● syncing…</span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-xs text-green-700">● live</span>
            )}
            {stains > 0 && (
              <p className="text-blood-dark text-xs font-gothic">
                ⚠ Remorse check required ({remorsePool} {remorsePool === 1 ? "die" : "dice"})
              </p>
            )}
            <button
              onClick={handleEndSession}
              disabled={(!sessionDirty && stains === 0) || saving}
              className={`px-4 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
                (sessionDirty || stains > 0) && !saving
                  ? stains > 0
                    ? "border-blood text-blood bg-blood-dark/20 hover:bg-blood-dark/40"
                    : "border-blood text-blood hover:bg-blood-dark/20"
                  : "border-gray-800 text-gray-700 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving…" : stains > 0 ? "⚑ End Session — Roll Remorse" : sessionDirty ? "⚑ End Session — Save" : "Session saved"}
            </button>
          </div>
        )}
      </div>

      {/* ── Attributes ── */}
      <Section title="Attributes">
        {onImprove && !freeEdit && <p className="text-xs text-gray-600 mb-3">Cost: new level × 5 XP · Available: <span className="text-blood">{availableXp} XP</span></p>}
        {tempMode && <p className="text-xs text-blue-500/70 mb-3">Temp mode active — blue dots are temporary and not XP-spent.</p>}
        <div className="flex flex-wrap gap-6">
          <StatColumn heading="Physical" names={PHYSICAL_ATTRS}  lookup={attrMap} traitType="attribute" onImprove={onImprove} onUnimprove={onUnimprove} availableXp={availableXp} freeEdit={freeEdit}
            tempDotsMap={tempDots.attributes} onAddTempDot={tempMode ? (_, n) => handleAddTempDot("attributes", n) : undefined} onRemoveTempDot={tempMode ? (_, n) => handleRemoveTempDot("attributes", n) : undefined} />
          <StatColumn heading="Social"   names={SOCIAL_ATTRS}    lookup={attrMap} traitType="attribute" onImprove={onImprove} onUnimprove={onUnimprove} availableXp={availableXp} freeEdit={freeEdit}
            tempDotsMap={tempDots.attributes} onAddTempDot={tempMode ? (_, n) => handleAddTempDot("attributes", n) : undefined} onRemoveTempDot={tempMode ? (_, n) => handleRemoveTempDot("attributes", n) : undefined} />
          <StatColumn heading="Mental"   names={MENTAL_ATTRS}    lookup={attrMap} traitType="attribute" onImprove={onImprove} onUnimprove={onUnimprove} availableXp={availableXp} freeEdit={freeEdit}
            tempDotsMap={tempDots.attributes} onAddTempDot={tempMode ? (_, n) => handleAddTempDot("attributes", n) : undefined} onRemoveTempDot={tempMode ? (_, n) => handleRemoveTempDot("attributes", n) : undefined} />
        </div>
      </Section>

      {/* ── Skills ── */}
      <Section title="Skills">
        {onImprove && !freeEdit && <p className="text-xs text-gray-600 mb-3">Cost: new level × 3 XP · Available: <span className="text-blood">{availableXp} XP</span></p>}
        <div className="flex flex-wrap gap-6">
          <StatColumn heading="Physical" names={PHYSICAL_SKILLS} lookup={skillMap} specialtyMap={specialtyMap} traitType="skill" onImprove={onImprove} onUnimprove={onUnimprove} availableXp={availableXp} freeEdit={freeEdit}
            tempDotsMap={tempDots.skills} onAddTempDot={tempMode ? (_, n) => handleAddTempDot("skills", n) : undefined} onRemoveTempDot={tempMode ? (_, n) => handleRemoveTempDot("skills", n) : undefined}
            onAddSpecialty={onAddSpecialty} onDeleteSpecialty={onDeleteSpecialty} />
          <StatColumn heading="Social"   names={SOCIAL_SKILLS}   lookup={skillMap} specialtyMap={specialtyMap} traitType="skill" onImprove={onImprove} onUnimprove={onUnimprove} availableXp={availableXp} freeEdit={freeEdit}
            tempDotsMap={tempDots.skills} onAddTempDot={tempMode ? (_, n) => handleAddTempDot("skills", n) : undefined} onRemoveTempDot={tempMode ? (_, n) => handleRemoveTempDot("skills", n) : undefined}
            onAddSpecialty={onAddSpecialty} onDeleteSpecialty={onDeleteSpecialty} />
          <StatColumn heading="Mental"   names={MENTAL_SKILLS}   lookup={skillMap} specialtyMap={specialtyMap} traitType="skill" onImprove={onImprove} onUnimprove={onUnimprove} availableXp={availableXp} freeEdit={freeEdit}
            tempDotsMap={tempDots.skills} onAddTempDot={tempMode ? (_, n) => handleAddTempDot("skills", n) : undefined} onRemoveTempDot={tempMode ? (_, n) => handleRemoveTempDot("skills", n) : undefined}
            onAddSpecialty={onAddSpecialty} onDeleteSpecialty={onDeleteSpecialty} />
        </div>
      </Section>

      {/* ── Disciplines ── */}
      <Section title="Disciplines">
        {(onImprove || onUnimprove) && !freeEdit && (
          <p className="text-xs text-gray-600 mb-3">
            Raise dot: new level × 5 XP (in-clan) / × 7 XP (out-of-clan) — 1 power included per dot ·
            Available: <span className="text-blood">{availableXp} XP</span>
          </p>
        )}
        {character.disciplines.length === 0 ? (
          <p className="text-gray-600 text-sm">No disciplines.</p>
        ) : (
          <div className="space-y-4">
            {character.disciplines.map((cd) => {
              const isInClan = (character.clan?.disciplines ?? []).some(
                (d) => d.id === cd.discipline.id
              );
              const discTempDots = tempDots.disciplines?.[String(cd.discipline.id)] ?? 0;
              return (
                <DisciplineCard
                  key={cd.discipline.id}
                  cd={cd}
                  learnedPowerIds={learnedPowerIds}
                  isInClan={isInClan}
                  onImprove={onImprove}
                  onUnimprove={onUnimprove}
                  availableXp={availableXp}
                  onClaimFreePower={onClaimFreePower}
                  tempDots={discTempDots}
                  onAddTempDot={tempMode ? (discId) => handleAddTempDot("disciplines", discId) : undefined}
                  onRemoveTempDot={tempMode ? (discId) => handleRemoveTempDot("disciplines", discId) : undefined}
                  freeEdit={freeEdit}
                  onRemoveDiscipline={freeEdit ? async (discId) => {
                    const res = await api.delete(`/api/characters/${character.id}/disciplines/${discId}`);
                    if (onCharacterUpdate) onCharacterUpdate(res.data);
                  } : undefined}
                  learnedRituals={(character.rituals || []).filter(cr => cr.ritual.discipline_id === cd.discipline.id)}
                  onOpenRitualBook={async () => {
                    if (allRituals.length === 0) {
                      const res = await api.get("/api/game-data/rituals");
                      setAllRituals(res.data);
                    }
                    setRitualBookDiscId(cd.discipline.id);
                    setShowRitualBook(true);
                    setRitualSearch("");
                    setRitualError(null);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Add discipline — retainer (free) or improve mode (XP cost) */}
        {onImprove && (
          <div className="mt-3 border-t border-void-border/40 pt-3">
            {showAddDisc ? (
              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={addDiscId ?? ""}
                  onChange={(e) => setAddDiscId(Number(e.target.value) || null)}
                  className="vtm-input text-sm flex-1"
                  onFocus={async () => {
                    if (availDiscs.length === 0) {
                      const res = await api.get("/api/game-data/disciplines");
                      setAvailDiscs(res.data);
                    }
                  }}
                >
                  <option value="">Select discipline…</option>
                  {availDiscs.filter((d) => !character.disciplines.some((cd) => cd.discipline.id === d.id)).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  disabled={!addDiscId}
                  onClick={async () => {
                    if (freeEdit) {
                      const res = await api.post(`/api/characters/${character.id}/disciplines`, { discipline_id: addDiscId });
                      if (onCharacterUpdate) onCharacterUpdate(res.data);
                    } else {
                      await onImprove("discipline", null, { discipline_id: addDiscId });
                    }
                    setShowAddDisc(false); setAddDiscId(null);
                  }}
                  className="vtm-btn text-sm py-1 px-3 disabled:opacity-40"
                >Add</button>
                <button onClick={() => { setShowAddDisc(false); setAddDiscId(null); }} className="text-xs text-gray-600 hover:text-gray-300">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddDisc(true)} className="text-xs text-gray-600 hover:text-blood transition-colors font-gothic tracking-wider">+ Add Discipline</button>
            )}
          </div>
        )}
      </Section>

      {/* ── Advantages & Flaws ── */}
      <Section title={
        <div className="flex items-center justify-between">
          <span>Advantages &amp; Flaws</span>
          <button
            onClick={() => { setEditAdvantages((v) => !v); setShowAddAdvantage(false); }}
            className="text-xs font-sans normal-case tracking-normal text-gray-600 hover:text-blood transition-colors"
          >
            {editAdvantages ? "✕ Done" : "Edit"}
          </button>
        </div>
      }>

        {/* Info popup overlay */}
        {infoPopup && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setInfoPopup(null)}>
            <div className="bg-void-light border border-void-border rounded-lg p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-gothic text-blood text-lg">{infoPopup.name}</h4>
                <button onClick={() => setInfoPopup(null)} className="text-gray-600 hover:text-gray-300 ml-3">✕</button>
              </div>
              {infoPopup.dots && <p className="text-blood-dark text-xs mb-2">{"●".repeat(infoPopup.dots)}{"○".repeat(5 - infoPopup.dots)}</p>}
              {infoPopup.description && <p className="text-gray-400 text-sm italic mb-3 leading-relaxed">{infoPopup.description}</p>}
              {infoPopup.system_text && <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{infoPopup.system_text}</p>}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Merits */}
          <div>
            <p className="font-gothic text-blood-dark text-sm tracking-wider uppercase mb-2">Merits</p>
            {character.merits.length === 0
              ? <p className="text-gray-600 text-sm">None</p>
              : character.merits.map((cm, i) => {
                  const key = `merit-${i}`;
                  const isOpen = expandedAdvantages.has(key);
                  const hasDesc = !!(cm.merit.description || cm.notes);
                  return (
                    <div key={i} className="mb-1.5">
                      <div className="flex justify-between items-center text-sm gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-gray-300 font-medium">{cm.merit.name}</span>
                          {cm.merit.name.toLowerCase().includes("retainer") && (character.retainers || []).length < retainerMeritCount && (
                            <span className="text-yellow-500 text-xs ml-1" title="No retainer created for this merit">⚠</span>
                          )}
                          {hasDesc && (
                            <button
                              onClick={() => toggleAdvantageExpand(key)}
                              className="text-gray-600 hover:text-gray-400 transition-colors text-[10px] shrink-0 ml-0.5 leading-none"
                              title={isOpen ? "Collapse" : "Expand description"}
                            >{isOpen ? "▲" : "▼"}</button>
                          )}
                          <button
                            onClick={() => setInfoPopup({ name: cm.merit.name, dots: cm.level, description: cm.merit.description, system_text: cm.merit.system_text })}
                            className="text-gray-700 hover:text-blood transition-colors text-xs shrink-0 ml-0.5"
                            title="View full details"
                          >ℹ</button>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <DotRating value={cm.level} max={5} size="text-xs" />
                          {editAdvantages && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.delete(`/api/characters/${character.id}/merits/${cm.merit.id}?level=${cm.level}`);
                                  if (onCharacterUpdate) onCharacterUpdate(res.data);
                                } catch (e) { console.error(e); }
                              }}
                              className="text-gray-700 hover:text-blood text-xs ml-1 transition-colors"
                              title="Remove merit"
                            >✕</button>
                          )}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="mt-0.5 ml-1 text-xs text-gray-500 leading-relaxed">
                          {cm.notes && <p className="text-gray-400 italic mb-0.5">"{cm.notes}"</p>}
                          {cm.merit.description && <p>{cm.merit.description}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>

          {/* Backgrounds */}
          <div>
            <p className="font-gothic text-blood-dark text-sm tracking-wider uppercase mb-2">Backgrounds</p>
            {character.backgrounds.length === 0
              ? <p className="text-gray-600 text-sm">None</p>
              : character.backgrounds.map((cb, i) => {
                  const key = `bg-${i}`;
                  const isOpen = expandedAdvantages.has(key);
                  const hasDesc = !!cb.background.description;
                  return (
                    <div key={i} className="mb-1.5">
                      <div className="flex justify-between items-center text-sm gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-gray-300 font-medium">{cb.background.name}</span>
                          {hasDesc && (
                            <button
                              onClick={() => toggleAdvantageExpand(key)}
                              className="text-gray-600 hover:text-gray-400 transition-colors text-[10px] shrink-0 ml-0.5 leading-none"
                              title={isOpen ? "Collapse" : "Expand description"}
                            >{isOpen ? "▲" : "▼"}</button>
                          )}
                          <button
                            onClick={() => setInfoPopup({ name: cb.background.name, description: cb.background.description, system_text: cb.background.system_text })}
                            className="text-gray-700 hover:text-blood transition-colors text-xs shrink-0 ml-0.5"
                            title="View full details"
                          >ℹ</button>
                        </div>
                        {/* Background level with +/- in improve mode */}
                        <div className="flex items-center gap-1 shrink-0">
                          {onUnimprove ? (
                            cb.level > 1 ? (
                              <button
                                onClick={() => onUnimprove("background", null, { background_id: cb.background.id })}
                                title={`Refund ${cb.level * 3} XP — lower to ${cb.level - 1}`}
                                className="w-4 h-4 rounded-full border border-gray-700 text-gray-600 hover:border-blood hover:text-blood text-xs font-bold leading-none transition-colors"
                              >−</button>
                            ) : <span className="w-4 h-4 inline-block" />
                          ) : null}
                          <DotRating value={cb.level} max={5} size="text-xs" />
                          {onImprove ? (
                            cb.level < 5 ? (
                              <button
                                onClick={() => onImprove("background", null, { background_id: cb.background.id })}
                                disabled={availableXp < (cb.level + 1) * 3}
                                title={availableXp >= (cb.level + 1) * 3 ? `Spend ${(cb.level + 1) * 3} XP → ${cb.level + 1}` : `Need ${(cb.level + 1) * 3} XP`}
                                className={`w-4 h-4 rounded-full border text-xs font-bold leading-none transition-colors ${
                                  availableXp >= (cb.level + 1) * 3
                                    ? "border-blood text-blood hover:bg-blood hover:text-white"
                                    : "border-gray-700 text-gray-700 cursor-not-allowed"
                                }`}
                              >+</button>
                            ) : <span className="w-4 h-4 inline-block" />
                          ) : null}
                          {editAdvantages && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.delete(`/api/characters/${character.id}/backgrounds/${cb.background.id}`);
                                  if (onCharacterUpdate) onCharacterUpdate(res.data);
                                } catch (e) { console.error(e); }
                              }}
                              className="text-gray-700 hover:text-blood text-xs ml-1 transition-colors"
                              title="Remove background"
                            >✕</button>
                          )}
                        </div>
                      </div>
                      {isOpen && cb.background.description && (
                        <div className="mt-0.5 ml-1 text-xs text-gray-500 leading-relaxed">
                          <p>{cb.background.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>

          {/* Flaws */}
          <div>
            <p className="font-gothic text-blood-dark text-sm tracking-wider uppercase mb-2">Flaws</p>
            {character.flaws.length === 0
              ? <p className="text-gray-600 text-sm">None</p>
              : character.flaws.map((cf, i) => {
                  const key = `flaw-${i}`;
                  const isOpen = expandedAdvantages.has(key);
                  const hasDesc = !!(cf.flaw.description || cf.notes);
                  return (
                    <div key={i} className="mb-1.5">
                      <div className="flex justify-between items-center text-sm gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-gray-300 font-medium">{cf.flaw.name}</span>
                          {hasDesc && (
                            <button
                              onClick={() => toggleAdvantageExpand(key)}
                              className="text-gray-600 hover:text-gray-400 transition-colors text-[10px] shrink-0 ml-0.5 leading-none"
                              title={isOpen ? "Collapse" : "Expand description"}
                            >{isOpen ? "▲" : "▼"}</button>
                          )}
                          <button
                            onClick={() => setInfoPopup({ name: cf.flaw.name, dots: cf.flaw.value, description: cf.flaw.description, system_text: cf.flaw.system_text })}
                            className="text-gray-700 hover:text-blood transition-colors text-xs shrink-0 ml-0.5"
                            title="View full details"
                          >ℹ</button>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-blood-dark text-xs">{"●".repeat(cf.flaw.value)}</span>
                          {editAdvantages && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.delete(`/api/characters/${character.id}/flaws/${cf.flaw.id}`);
                                  if (onCharacterUpdate) onCharacterUpdate(res.data);
                                } catch (e) { console.error(e); }
                              }}
                              className="text-gray-700 hover:text-blood text-xs ml-1 transition-colors"
                              title="Remove flaw"
                            >✕</button>
                          )}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="mt-0.5 ml-1 text-xs text-gray-500 leading-relaxed">
                          {cf.notes && <p className="text-gray-400 italic mb-0.5">"{cf.notes}"</p>}
                          {cf.flaw.description && <p>{cf.flaw.description}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Add merit/flaw/background panel — shown when improve mode or editAdvantages is on */}
        {(onImprove || onUnimprove || editAdvantages) && (
          <div className="mt-4 border-t border-void-border/40 pt-4">
            <button
              onClick={() => { setShowAddAdvantage((v) => !v); setAddAdvError(null); setAddAdvId(null); setAddAdvLevel(1); setAddAdvNotes(""); }}
              className={`text-xs font-gothic tracking-wider px-3 py-1.5 rounded border transition-colors ${
                showAddAdvantage
                  ? "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  : "border-blood-dark/60 text-blood hover:bg-blood-dark/20 hover:border-blood"
              }`}
            >
              {showAddAdvantage ? "✕ Cancel" : "+ Add Merit / Flaw / Background"}
            </button>

            {showAddAdvantage && (
              <div className="mt-3 bg-void border border-void-border rounded-lg p-4 space-y-3">
                {/* Type tabs */}
                <div className="flex gap-2">
                  {["merit", "flaw", "background"].map((t) => (
                    <button key={t} onClick={() => { setAddAdvType(t); setAddAdvId(null); setAddAdvLevel(1); setAddAdvNotes(""); }}
                      className={`px-3 py-1 rounded text-xs font-gothic capitalize transition-colors ${addAdvType === t ? "bg-blood-dark/40 border border-blood-dark text-blood" : "border border-void-border text-gray-500 hover:border-gray-500"}`}
                    >{t}</button>
                  ))}
                </div>

                {/* Browse button (left) + selected item display (right) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPickerSearch(""); setShowPickerModal(true); }}
                    className="vtm-btn py-1 px-3 text-sm shrink-0"
                  >Browse</button>
                  <div className="flex-1 bg-void-light border border-void-border rounded px-3 py-2 text-sm text-gray-400 min-h-[36px] flex items-center justify-between gap-2">
                    {addAdvId
                      ? (() => {
                          const list = addAdvType === "merit" ? availGameData.merits : addAdvType === "flaw" ? availGameData.flaws : availGameData.backgrounds;
                          const item = list.find((x) => x.id === addAdvId);
                          const dots = item ? (item.value ?? item.cost ?? null) : null;
                          return item ? (
                            <>
                              <span>{item.name}</span>
                              {dots > 0 && (
                                <span className="text-blood-dark text-xs tracking-tight shrink-0">
                                  {"●".repeat(Math.min(dots, 5))}
                                </span>
                              )}
                            </>
                          ) : <span>Selected</span>;
                        })()
                      : <span className="text-gray-600">None selected…</span>
                    }
                  </div>
                </div>

                {/* Level (merits + backgrounds) */}
                {addAdvType !== "flaw" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Level:</span>
                    {[1,2,3,4,5].map((l) => (
                      <button key={l} onClick={() => setAddAdvLevel(l)}
                        className={`w-5 h-5 rounded-full border text-xs font-bold transition-colors ${addAdvLevel >= l ? "bg-blood border-blood text-white" : "border-gray-700 text-gray-700"}`}
                      >·</button>
                    ))}
                    <span className="text-gray-600 text-xs ml-1">{addAdvLevel}</span>
                  </div>
                )}

                {/* Notes */}
                <input
                  value={addAdvNotes}
                  onChange={(e) => setAddAdvNotes(e.target.value)}
                  placeholder="Notes / specification (optional)"
                  className="vtm-input text-sm"
                />

                {addAdvError && <p className="text-blood text-xs">{addAdvError}</p>}

                <button
                  disabled={!addAdvId || addAdvSaving}
                  onClick={async () => {
                    if (!addAdvId) return;
                    setAddAdvSaving(true); setAddAdvError(null);
                    try {
                      let res;
                      if (addAdvType === "merit") {
                        res = await api.post(`/api/characters/${character.id}/merits`, { merit_id: addAdvId, level: addAdvLevel, notes: addAdvNotes || null });
                      } else if (addAdvType === "flaw") {
                        res = await api.post(`/api/characters/${character.id}/flaws`, { flaw_id: addAdvId, notes: addAdvNotes || null });
                      } else {
                        res = await api.post(`/api/characters/${character.id}/backgrounds`, { background_id: addAdvId, level: addAdvLevel, notes: addAdvNotes || null });
                      }
                      if (onCharacterUpdate) onCharacterUpdate(res.data);
                      setShowAddAdvantage(false);
                    } catch (err) {
                      setAddAdvError(err.response?.data?.detail || "Failed to add.");
                    } finally {
                      setAddAdvSaving(false);
                    }
                  }}
                  className="vtm-btn py-1 px-4 text-sm disabled:opacity-40"
                >
                  {addAdvSaving ? "Adding…" : `Add ${addAdvType}`}
                </button>
              </div>
            )}

            {/* ── Picker modal ── */}
            {showPickerModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPickerModal(false)}>
                <div className="bg-void-light border border-void-border rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-void-border shrink-0">
                    <h4 className="font-gothic text-blood text-lg capitalize">Choose a {addAdvType}</h4>
                    <button onClick={() => setShowPickerModal(false)} className="text-gray-600 hover:text-gray-300">✕</button>
                  </div>
                  {/* Search */}
                  <div className="px-5 py-3 shrink-0">
                    <input
                      autoFocus
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder={`Search ${addAdvType}s…`}
                      className="vtm-input text-sm w-full"
                    />
                  </div>
                  {/* List */}
                  <div className="overflow-y-auto px-5 pb-5 space-y-2">
                    {(addAdvType === "merit" ? availGameData.merits : addAdvType === "flaw" ? availGameData.flaws : availGameData.backgrounds)
                      .filter((item) => item.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                      .map((item) => {
                        const dots = item.value ?? item.cost ?? null;
                        const isSelected = addAdvId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => { setAddAdvId(item.id); setShowPickerModal(false); }}
                            className={`rounded-lg border p-3 cursor-pointer transition-colors ${isSelected ? "border-blood bg-blood-dark/20" : "border-void-border hover:border-gray-500 bg-void"}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-gray-200 font-medium text-sm">{item.name}</span>
                              {dots && <span className="text-blood-dark text-xs shrink-0">{"●".repeat(dots)}</span>}
                            </div>
                            {item.description && (
                              <p className="text-gray-500 text-xs mt-1 leading-relaxed italic">{item.description}</p>
                            )}
                            {item.system_text && (
                              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{item.system_text}</p>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Beliefs ── */}
      <Section title="Beliefs">
        {/* Chronicle Tenets */}
        {character.tenets.length > 0 && (
          <div className="mb-4">
            <p className="font-gothic text-blood-dark text-sm tracking-wider uppercase mb-2">Chronicle Tenets</p>
            <ul className="space-y-1">
              {character.tenets.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300">{t.tenet}</span>
                  <button
                    onClick={() => handleRemoveTenet(t.id)}
                    className="text-gray-700 hover:text-blood transition-colors text-xs ml-1 shrink-0"
                    title="Remove tenet"
                  >✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Convictions & Touchstones */}
        {character.convictions.length > 0 && (
          <div className="mb-4">
            <p className="font-gothic text-blood-dark text-sm tracking-wider uppercase mb-2">Convictions & Touchstones</p>
            {character.convictions.map((c) => (
              <div key={c.id} className="mb-2 text-sm flex items-start gap-2">
                <div className="flex-1">
                  <span className="text-gray-300 font-medium">{c.conviction}</span>
                  <span className="text-gray-600"> — anchored by </span>
                  <span className="text-gray-400 italic">{c.touchstone}</span>
                </div>
                <button
                  onClick={() => handleRemoveConviction(c.id)}
                  className="text-gray-700 hover:text-blood transition-colors text-xs shrink-0 mt-0.5"
                  title="Remove conviction"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {character.tenets.length === 0 && character.convictions.length === 0 && (
          <p className="text-gray-600 text-sm mb-3">No beliefs recorded.</p>
        )}

        {/* Edit / Add beliefs */}
        <div className="border-t border-void-border/40 pt-3">
          <button
            onClick={() => { setShowBeliefEdit((v) => !v); setBeliefError(null); }}
            className="text-xs text-gray-600 hover:text-blood transition-colors font-gothic tracking-wider"
          >
            {showBeliefEdit ? "✕ Close" : "+ Add Conviction / Tenet"}
          </button>

          {showBeliefEdit && (
            <div className="mt-3 bg-void border border-void-border rounded-lg p-4 space-y-4">
              {/* Add conviction */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">New Conviction</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <input
                    className="vtm-input text-sm"
                    placeholder="Conviction (e.g. I protect the innocent)"
                    value={beliefForm.conviction}
                    onChange={(e) => setBeliefForm({ ...beliefForm, conviction: e.target.value })}
                  />
                  <input
                    className="vtm-input text-sm"
                    placeholder="Touchstone (e.g. My sister Maria)"
                    value={beliefForm.touchstone}
                    onChange={(e) => setBeliefForm({ ...beliefForm, touchstone: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleAddConviction}
                  disabled={beliefSaving || !beliefForm.conviction.trim() || !beliefForm.touchstone.trim()}
                  className="vtm-btn py-1 px-3 text-xs disabled:opacity-40"
                >Add Conviction</button>
              </div>

              {/* Add tenet */}
              <div className="border-t border-void-border/30 pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">New Chronicle Tenet</p>
                <div className="flex gap-2">
                  <input
                    className="vtm-input text-sm flex-1"
                    placeholder="Tenet (e.g. Never kill a mortal)"
                    value={tenetForm}
                    onChange={(e) => setTenetForm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTenet()}
                  />
                  <button
                    onClick={handleAddTenet}
                    disabled={beliefSaving || !tenetForm.trim()}
                    className="vtm-btn py-1 px-3 text-xs disabled:opacity-40"
                  >Add Tenet</button>
                </div>
              </div>

              {beliefError && <p className="text-blood text-xs">{beliefError}</p>}
            </div>
          )}
        </div>
      </Section>

      {/* ── Weapons ── */}
      <Section title="Weapons">
        {character.weapons.length === 0
          ? <p className="text-gray-600 text-sm">No weapons recorded.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 text-xs uppercase tracking-wider border-b border-void-border">
                    <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Damage</th>
                    <th className="pb-2 pr-4">Range</th><th className="pb-2 pr-4">Clips</th>
                    <th className="pb-2 pr-4">Traits</th><th className="pb-2">Notes</th>
                    {onDeleteWeapon && <th className="pb-2" />}
                  </tr>
                </thead>
                <tbody>
                  {character.weapons.map((w) => (
                    <tr key={w.id} className="border-b border-void-border/30 hover:bg-void/30">
                      <td className="py-2 pr-4 text-gray-200 font-medium">{w.name}</td>
                      <td className="py-2 pr-4 text-gray-400">{w.damage || "—"}</td>
                      <td className="py-2 pr-4 text-gray-400">{w.range || "—"}</td>
                      <td className="py-2 pr-4 text-gray-400">{w.clips || "—"}</td>
                      <td className="py-2 pr-4 text-gray-400">{w.traits || "—"}</td>
                      <td className="py-2 text-gray-500 text-xs">{w.notes || ""}</td>
                      {onDeleteWeapon && (
                        <td className="py-2 pl-3">
                          <button onClick={() => onDeleteWeapon(w.id)} className="text-gray-700 hover:text-blood transition-colors text-xs">✕</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {/* Inline add weapon form */}
        {onAddWeapon && !showWeaponForm && (
          <button
            onClick={() => setShowWeaponForm(true)}
            className="mt-3 text-xs text-gray-600 hover:text-blood transition-colors font-gothic tracking-wider"
          >
            + Add Weapon
          </button>
        )}
        {onAddWeapon && showWeaponForm && (
          <div className="mt-4 bg-void border border-void-border rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Name *</label>
                <SuggestionInput
                  id="cs-weapon-name"
                  value={weaponForm.name}
                  onChange={(v) => setWeaponForm({ ...weaponForm, name: v })}
                  suggestions={WEAPON_NAME_SUGGESTIONS}
                  placeholder="e.g. Combat Knife"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Damage</label>
                <SuggestionInput
                  id="cs-weapon-damage"
                  value={weaponForm.damage}
                  onChange={(v) => setWeaponForm({ ...weaponForm, damage: v })}
                  suggestions={WEAPON_DAMAGE_SUGGESTIONS}
                  placeholder="e.g. Strength+1 (Aggravated)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Range</label>
                <SuggestionInput
                  id="cs-weapon-range"
                  value={weaponForm.range}
                  onChange={(v) => setWeaponForm({ ...weaponForm, range: v })}
                  suggestions={WEAPON_RANGE_SUGGESTIONS}
                  placeholder="e.g. Close"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Clips / Ammo</label>
                <input
                  className="vtm-input"
                  placeholder="e.g. 15+1"
                  value={weaponForm.clips}
                  onChange={(e) => setWeaponForm({ ...weaponForm, clips: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Traits</label>
                <SuggestionInput
                  id="cs-weapon-traits"
                  value={weaponForm.traits}
                  onChange={(v) => setWeaponForm({ ...weaponForm, traits: v })}
                  suggestions={WEAPON_TRAITS_SUGGESTIONS}
                  placeholder="e.g. Concealable"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                <input
                  className="vtm-input"
                  placeholder="optional"
                  value={weaponForm.notes}
                  onChange={(e) => setWeaponForm({ ...weaponForm, notes: e.target.value })}
                />
              </div>
            </div>
            {weaponError && <p className="text-blood text-sm mb-2">{weaponError}</p>}
            <div className="flex gap-3">
              <button
                disabled={weaponSaving}
                onClick={async () => {
                  if (!weaponForm.name.trim()) { setWeaponError("Weapon name is required."); return; }
                  setWeaponError(null); setWeaponSaving(true);
                  try {
                    await onAddWeapon(weaponForm);
                    setWeaponForm({ name: "", damage: "", range: "", clips: "", traits: "", notes: "" });
                    setShowWeaponForm(false);
                  } catch (err) {
                    setWeaponError(err.response?.data?.detail || "Failed to add weapon.");
                  } finally { setWeaponSaving(false); }
                }}
                className="vtm-btn py-1 px-4 text-sm"
              >
                {weaponSaving ? "Adding…" : "Add Weapon"}
              </button>
              <button
                onClick={() => { setShowWeaponForm(false); setWeaponError(null); setWeaponForm({ name: "", damage: "", range: "", clips: "", traits: "", notes: "" }); }}
                className="vtm-btn-secondary py-1 px-3 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── Possessions ── */}
      <Section title="Possessions">
        {character.possessions.length === 0
          ? <p className="text-gray-600 text-sm">No possessions recorded.</p>
          : (
            <ul className="space-y-2">
              {character.possessions.map((p) => (
                <li key={p.id} className="flex justify-between items-start gap-4 text-sm border-b border-void-border/30 pb-2">
                  <div>
                    <span className="text-gray-200 font-medium">{p.name}</span>
                    {p.description && <span className="text-gray-500 ml-2">— {p.description}</span>}
                  </div>
                  {onDeletePossession && (
                    <button onClick={() => onDeletePossession(p.id)} className="text-gray-700 hover:text-blood transition-colors text-xs flex-shrink-0">✕</button>
                  )}
                </li>
              ))}
            </ul>
          )}

        {/* Inline add possession form */}
        {onAddPossession && !showPossessionForm && (
          <button
            onClick={() => setShowPossessionForm(true)}
            className="mt-3 text-xs text-gray-600 hover:text-blood transition-colors font-gothic tracking-wider"
          >
            + Add Possession
          </button>
        )}
        {onAddPossession && showPossessionForm && (
          <div className="mt-4 bg-void border border-void-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Name *</label>
                <input
                  className="vtm-input"
                  placeholder="e.g. Burner phone, Safe house key"
                  value={possessionForm.name}
                  onChange={(e) => setPossessionForm({ ...possessionForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <input
                  className="vtm-input"
                  placeholder="optional"
                  value={possessionForm.description}
                  onChange={(e) => setPossessionForm({ ...possessionForm, description: e.target.value })}
                />
              </div>
            </div>
            {possessionError && <p className="text-blood text-sm mb-2">{possessionError}</p>}
            <div className="flex gap-3">
              <button
                disabled={possessionSaving}
                onClick={async () => {
                  if (!possessionForm.name.trim()) { setPossessionError("Possession name is required."); return; }
                  setPossessionError(null); setPossessionSaving(true);
                  try {
                    await onAddPossession(possessionForm);
                    setPossessionForm({ name: "", description: "" });
                    setShowPossessionForm(false);
                  } catch (err) {
                    setPossessionError(err.response?.data?.detail || "Failed to add possession.");
                  } finally { setPossessionSaving(false); }
                }}
                className="vtm-btn py-1 px-4 text-sm"
              >
                {possessionSaving ? "Adding…" : "Add Possession"}
              </button>
              <button
                onClick={() => { setShowPossessionForm(false); setPossessionError(null); setPossessionForm({ name: "", description: "" }); }}
                className="vtm-btn-secondary py-1 px-3 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── Biography & Haven ── */}
      {(character.biography || character.haven_location) && (
        <Section title="Biography & Haven">
          {character.biography && (
            <div className="mb-4">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Biography</p>
              <p className="text-gray-300 text-sm whitespace-pre-line">{character.biography}</p>
            </div>
          )}
          {character.haven_location && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Haven</p>
              <p className="text-gray-300 text-sm">
                {character.haven_location}
                {character.haven_description && ` — ${character.haven_description}`}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* ── Notes — always visible, inline editable ── */}
      <Section title="Notes">
        <div className="relative">
          <textarea
            className="vtm-input w-full h-32 text-sm text-gray-300"
            style={{ resize: "vertical" }}
            placeholder="Session notes, secrets, reminders… only you and your GM can see this."
            value={notesText}
            onChange={(e) => handleNotesChange(e.target.value)}
          />
          {notesSaving && (
            <span className="absolute bottom-2 right-2 text-xs text-gray-600 animate-pulse">saving…</span>
          )}
        </div>
      </Section>

      {/* ── Retainers ── */}
      {retainerMeritCount > 0 && (
        <Section title="Retainers">
          <div className="space-y-3">
            {(character.retainers || []).map((r) => (
              <div key={r.id} className="border-2 border-blue-800/60 rounded-lg p-4 bg-blue-950/10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-gothic text-blue-300 text-lg">{r.name}</p>
                    {r.retainer_level && <span className="text-blue-700 text-sm">{"●".repeat(r.retainer_level)}</span>}
                  </div>
                  {r.concept && <p className="text-gray-500 text-xs">{r.concept}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenRetainer && onOpenRetainer(r.id)}
                    className="text-xs text-blue-400 hover:text-blue-200 border border-blue-800 rounded px-2 py-1 transition-colors"
                  >View Sheet</button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete retainer ${r.name}?`)) return;
                      const res = await api.delete(`/api/characters/${character.id}/retainers/${r.id}`);
                      if (onCharacterUpdate) onCharacterUpdate(res.data);
                    }}
                    className="text-xs text-gray-700 hover:text-blood transition-colors"
                  >✕</button>
                </div>
              </div>
            ))}

            {(character.retainers || []).length < retainerMeritCount && !showRetainerForm && (
              <div className="flex items-center gap-2 text-yellow-600 text-sm border border-yellow-800/40 rounded-lg px-3 py-2 bg-yellow-950/10">
                <span>⚠</span>
                <span>You have {retainerMeritCount - (character.retainers || []).length} unfilled retainer slot(s).</span>
                <button onClick={() => setShowRetainerForm(true)} className="ml-auto text-xs text-blue-400 hover:text-blue-200 border border-blue-800 rounded px-2 py-1">+ Add</button>
              </div>
            )}

            {(character.retainers || []).length < retainerMeritCount && (
              showRetainerForm ? (
                <div className="border border-blue-800/40 rounded-lg p-4 space-y-3 bg-void">
                  <input
                    autoFocus
                    value={retainerName}
                    onChange={(e) => setRetainerName(e.target.value)}
                    placeholder="Retainer name…"
                    className="vtm-input text-sm w-full"
                  />
                  <input
                    value={retainerConcept}
                    onChange={(e) => setRetainerConcept(e.target.value)}
                    placeholder="Concept (human, ghoul, etc.)…"
                    className="vtm-input text-sm w-full"
                  />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Retainer level (which merit dot)</label>
                    <select
                      value={retainerLevel}
                      onChange={(e) => setRetainerLevel(e.target.value)}
                      className="vtm-input text-sm w-full"
                    >
                      <option value="">— pick level —</option>
                      {availableRetainerLevels.map(lvl => (
                        <option key={lvl} value={lvl}>{"●".repeat(lvl)} (level {lvl})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={!retainerName || !retainerLevel || retainerSaving}
                      onClick={async () => {
                        setRetainerSaving(true);
                        try {
                          const res = await api.post(`/api/characters/${character.id}/retainers`, { name: retainerName, concept: retainerConcept || null, retainer_level: parseInt(retainerLevel) });
                          if (onCharacterUpdate) onCharacterUpdate(res.data);
                          setShowRetainerForm(false); setRetainerName(""); setRetainerConcept(""); setRetainerLevel("");
                        } finally { setRetainerSaving(false); }
                      }}
                      className="vtm-btn py-1 px-4 text-sm disabled:opacity-40"
                    >{retainerSaving ? "Creating…" : "Create Retainer"}</button>
                    <button onClick={() => { setShowRetainerForm(false); setRetainerLevel(""); }} className="text-xs text-gray-600 hover:text-gray-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRetainerForm(true)}
                  className="text-xs text-blue-500 hover:text-blue-300 transition-colors font-gothic tracking-wider"
                >+ Add Retainer ({(character.retainers || []).length}/{retainerMeritCount})</button>
              )
            )}
          </div>
        </Section>
      )}

      {/* ── Ritual Book Modal ── */}
      {showRitualBook && (() => {
        const ritualDiscs = character.disciplines.filter(cd => RITUAL_DISC_NAMES.includes(cd.discipline.name));
        const learnedIds = new Set((character.rituals || []).map(cr => cr.ritual.id));
        const discForBook = ritualDiscs.find(cd => cd.discipline.id === ritualBookDiscId);

        // All rituals for this discipline, filtered by search
        let allFiltered = allRituals.filter(r => r.discipline_id === ritualBookDiscId);
        if (ritualSearch) allFiltered = allFiltered.filter(r =>
          r.name.toLowerCase().includes(ritualSearch.toLowerCase()) ||
          (r.description || "").toLowerCase().includes(ritualSearch.toLowerCase())
        );

        const discName  = discForBook?.discipline.name ?? "";
        const bookTitle = discName === "Oblivion" ? "Book of Night" : "Liber Sanguinis";

        // ritualPage = current level (1–5); clamp to levels that actually exist
        const existingLevels = [...new Set(allRituals.filter(r => r.discipline_id === ritualBookDiscId).map(r => r.level))].sort();
        const currentLevel   = existingLevels[ritualPage] ?? existingLevels[0] ?? 1;

        // Left page — rituals at current level matching search, paginated
        const ITEMS_PER_SUBPAGE = 10;
        const levelRituals    = allFiltered.filter(r => r.level === currentLevel);
        const totalSubPages   = Math.ceil(levelRituals.length / ITEMS_PER_SUBPAGE);
        const subPageStart    = ritualSubPage * ITEMS_PER_SUBPAGE;
        const visibleRituals  = levelRituals.slice(subPageStart, subPageStart + ITEMS_PER_SUBPAGE);

        // Right page — selected ritual detail
        const selectedRitual = ritualInfoId ? allFiltered.find(r => r.id === ritualInfoId) ?? null : null;

        // Left page — compact list row
        const ListEntry = ({ r }) => {
          const learned   = learnedIds.has(r.id);
          const canLearn  = discForBook && discForBook.level >= r.level;
          const alreadyHasLvl1 = r.level === 1 && (character.rituals || []).some(cr =>
            cr.ritual.discipline_id === r.discipline_id && cr.ritual.level === 1
          );
          const xpCost = (r.level === 1 && !alreadyHasLvl1) ? 0 : r.level * 3;
          const hasXp  = freeEdit || availableXp >= xpCost;
          const isSelected = ritualInfoId === r.id;

          return (
            <div
              onClick={() => setRitualInfoId(isSelected ? null : r.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors mb-0.5 ${
                isSelected ? "bg-blood-dark/30 border border-blood-dark/50" : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className="text-blood/60 text-[9px] shrink-0 w-8">{"●".repeat(r.level)}</span>
              <span className={`flex-1 text-xs font-gothic leading-tight truncate ${learned ? "text-blood" : "text-white"}`}>
                {r.name}
              </span>
              {learned ? (
                <span className="text-[9px] text-blood/50 shrink-0">✓</span>
              ) : (
                <button
                  disabled={!canLearn || !hasXp}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setRitualError(null);
                    try {
                      const res = await api.post(`/api/characters/${character.id}/rituals/${r.id}`);
                      if (onCharacterUpdate) onCharacterUpdate(res.data);
                    } catch (err) { setRitualError(err.response?.data?.detail || "Failed."); }
                  }}
                  className="shrink-0 text-[10px] bg-blood hover:bg-red-600 text-white font-gothic rounded px-1.5 py-0.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title={!canLearn ? `Need ${discName} level ${r.level}` : !hasXp ? `Need ${xpCost} XP` : "Learn"}
                >{xpCost === 0 ? "Free" : `${xpCost}xp`}</button>
              )}
            </div>
          );
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={() => { setShowRitualBook(false); setRitualInfoId(null); }}>
            <div className="flex flex-col w-full max-w-4xl" onClick={e => e.stopPropagation()}>

              {/* Book title */}
              <h2 className="font-gothic text-center text-blood/70 tracking-[0.3em] uppercase text-sm mb-2 drop-shadow-lg">{bookTitle}</h2>

              {/* Filter bar */}
              <div className="flex gap-2 items-center mb-2 flex-wrap justify-center">
                <input
                  autoFocus
                  value={ritualSearch}
                  onChange={e => { setRitualSearch(e.target.value); setRitualInfoId(null); setRitualSubPage(0); }}
                  placeholder="Search rituals…"
                  className="bg-black/60 border border-blood-dark/40 text-gray-300 placeholder-gray-700 rounded px-3 py-1 text-sm w-48 focus:outline-none focus:border-blood/60"
                />
                <button onClick={() => { setShowRitualBook(false); setRitualInfoId(null); }} className="ml-auto text-gray-700 hover:text-blood text-lg leading-none transition-colors">✕</button>
              </div>

              {/* Book spread */}
              <div className="flex shadow-2xl" style={{ minHeight: "520px" }}>
                {/* Left cover edge */}
                <div className="w-5 rounded-l" style={{ background: "linear-gradient(to right, #050202, #120508, #1a0808)" }} />

                {/* Left page — ritual list for current level with sub-pagination */}
                <div className="flex-1 flex flex-col p-4" style={{ background: "linear-gradient(160deg, #0e0608 0%, #130a0a 60%, #0a0404 100%)", borderRight: "2px solid #3d0808" }}>
                  <p className="text-center text-blood/40 text-[10px] uppercase tracking-widest font-gothic mb-1">
                    {discName === "Oblivion" ? "Ceremonies of the Dead" : "Rites of Blood"}
                  </p>
                  <p className="text-center text-blood/60 text-xs font-gothic mb-3 border-b border-blood-dark/20 pb-2">
                    Level {currentLevel}
                  </p>

                  {/* Ritual rows */}
                  <div className="flex-1">
                    {visibleRituals.length === 0 ? (
                      <p className="text-gray-700 text-xs italic text-center mt-8">No rituals found.</p>
                    ) : visibleRituals.map(r => <ListEntry key={r.id} r={r} />)}
                  </div>

                  {/* Sub-page controls inside left page */}
                  {totalSubPages > 1 && (
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-blood-dark/20">
                      <button
                        disabled={ritualSubPage === 0}
                        onClick={() => setRitualSubPage(p => p - 1)}
                        className="text-gray-400 hover:text-blood disabled:opacity-20 text-xs font-gothic transition-colors"
                      >← Prev</button>
                      <span className="text-gray-400 text-[10px] font-gothic">
                        {ritualSubPage + 1} / {totalSubPages}
                      </span>
                      <button
                        disabled={ritualSubPage >= totalSubPages - 1}
                        onClick={() => setRitualSubPage(p => p + 1)}
                        className="text-gray-400 hover:text-blood disabled:opacity-20 text-xs font-gothic transition-colors"
                      >Next →</button>
                    </div>
                  )}
                </div>

                {/* Spine */}
                <div className="w-6 flex items-center justify-center" style={{ background: "linear-gradient(to right, #1a0808, #0a0303, #1a0808)" }}>
                  <span className="text-blood/20 text-[8px] tracking-widest" style={{ writingMode: "vertical-rl" }}>✦</span>
                </div>

                {/* Right page — selected ritual detail */}
                <div className="flex-1 overflow-y-auto p-6" style={{ background: "linear-gradient(160deg, #0a0404 0%, #130a0a 60%, #0e0608 100%)" }}>
                  <p className="text-center text-blood/40 text-[10px] uppercase tracking-widest font-gothic mb-4 border-b border-blood-dark/20 pb-2">
                    {discName === "Oblivion" ? "Rites of Oblivion" : "Sorcerous Works"}
                  </p>
                  {selectedRitual ? (
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-gothic text-white text-lg leading-tight">{selectedRitual.name}</h3>
                        <span className="text-blood/50 text-xs shrink-0 mt-0.5">{"●".repeat(selectedRitual.level)}{"○".repeat(5 - selectedRitual.level)}</span>
                      </div>
                      {selectedRitual.description && (
                        <p className="text-gray-100 text-sm italic leading-relaxed mb-3">{selectedRitual.description}</p>
                      )}
                      {selectedRitual.system_text && (
                        <div className="border-t border-blood-dark/20 pt-3 space-y-1">
                          {selectedRitual.system_text.split("\n").map((line, i) => (
                            line.trim() ? (
                              <p key={i} className="text-gray-100 text-xs leading-relaxed">
                                {line.includes(":") ? (
                                  <>
                                    <span className="text-blood/70 font-gothic">{line.split(":")[0]}:</span>
                                    {line.slice(line.indexOf(":") + 1)}
                                  </>
                                ) : line}
                              </p>
                            ) : null
                          ))}
                        </div>
                      )}
                      {/* Actions */}
                      {(() => {
                        const learned = learnedIds.has(selectedRitual.id);
                        const canLearn = discForBook && discForBook.level >= selectedRitual.level;
                        const alreadyHasLvl1 = selectedRitual.level === 1 && (character.rituals || []).some(cr =>
                          cr.ritual.discipline_id === selectedRitual.discipline_id && cr.ritual.level === 1
                        );
                        const xpCost = (selectedRitual.level === 1 && !alreadyHasLvl1) ? 0 : selectedRitual.level * 3;
                        const hasXp = freeEdit || availableXp >= xpCost;
                        return (
                          <div className="mt-4 pt-3 border-t border-blood-dark/20">
                            {learned ? (
                              <div className="flex items-center gap-3">
                                <span className="text-blood text-sm font-gothic">✓ Known</span>
                                {(onImprove || freeEdit) && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await api.delete(`/api/characters/${character.id}/rituals/${selectedRitual.id}`);
                                        if (onCharacterUpdate) onCharacterUpdate(res.data);
                                      } catch {}
                                    }}
                                    className="text-xs text-gray-600 hover:text-blood transition-colors"
                                  >✕ Unlearn</button>
                                )}
                              </div>
                            ) : (
                              <button
                                disabled={!canLearn || !hasXp}
                                onClick={async () => {
                                  setRitualError(null);
                                  try {
                                    const res = await api.post(`/api/characters/${character.id}/rituals/${selectedRitual.id}`);
                                    if (onCharacterUpdate) onCharacterUpdate(res.data);
                                  } catch (e) { setRitualError(e.response?.data?.detail || "Failed."); }
                                }}
                                className="bg-blood hover:bg-red-600 text-white font-gothic text-sm rounded px-4 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={!canLearn ? `Need ${discName} level ${selectedRitual.level}` : !hasXp ? `Need ${xpCost} XP` : ""}
                              >{xpCost === 0 ? "Learn for Free" : `Learn — ${xpCost} XP`}</button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs italic text-center mt-16">← Select a ritual to read its description</p>
                  )}
                </div>

                {/* Right cover edge */}
                <div className="w-5 rounded-r" style={{ background: "linear-gradient(to left, #050202, #120508, #1a0808)" }} />
              </div>

              {/* Level navigation */}
              <div className="flex items-center justify-center gap-6 mt-2">
                <button
                  disabled={ritualPage === 0}
                  onClick={() => { setRitualPage(p => p - 1); setRitualInfoId(null); setRitualSubPage(0); }}
                  className="text-gray-400 hover:text-blood disabled:opacity-20 text-sm font-gothic tracking-widest transition-colors"
                >← Prev</button>
                <div className="flex gap-1.5">
                  {existingLevels.map((lvl, idx) => (
                    <button
                      key={lvl}
                      onClick={() => { setRitualPage(idx); setRitualInfoId(null); setRitualSubPage(0); }}
                      className={`w-6 h-6 rounded text-xs font-gothic border transition-colors ${idx === ritualPage ? "bg-blood border-blood text-white" : "border-gray-600 text-gray-400 hover:border-blood-dark"}`}
                    >{lvl}</button>
                  ))}
                </div>
                <button
                  disabled={ritualPage >= existingLevels.length - 1}
                  onClick={() => { setRitualPage(p => p + 1); setRitualInfoId(null); setRitualSubPage(0); }}
                  className="text-gray-400 hover:text-blood disabled:opacity-20 text-sm font-gothic tracking-widest transition-colors"
                >Next →</button>
              </div>
              {ritualError && <p className="text-center text-red-400 text-xs mt-1">{ritualError}</p>}
            </div>
          </div>
        );
      })()}

      {/* ── Remorse Roll Modal ── */}
      {showRemorse && (
        <DiceRollerModal
          mode="remorse"
          remorsePool={remorsePool}
          onClose={() => setShowRemorse(false)}
          onRemorseResult={handleRemorseResult}
        />
      )}

    </div>
  );
}
