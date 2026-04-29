import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import ConditionManager from "../components/gm/ConditionManager";
import CharacterSheet from "../components/character/CharacterSheet";
import { clanCardStyle } from "../utils/clanImages";

function getRollHint(text) {
  if (!text) return null;
  const dp = text.match(/dice pool[:\s]+([^\n]+)/i);
  if (dp) return "Roll: " + dp[1].trim().slice(0, 60);
  const cost = text.match(/^cost[:\s]+([^\n]+)/im);
  if (cost) return "Cost: " + cost[1].trim().slice(0, 60);
  const first = text.split(/\n/)[0];
  return first.length <= 70 ? first : first.slice(0, 67) + "…";
}

// Extract structured roll info from system_text for the expanded power view
function parsePowerInfo(text) {
  if (!text) return {};
  const diceMatch = text.match(/(?:dice pool|roll)[:\s]+(.+?)(?:\n|$)/i);
  const costMatch  = text.match(/^cost[:\s]+([^\n]+)/im);
  const durMatch   = text.match(/^duration[:\s]+([^\n]+)/im);
  return {
    dicePool: diceMatch ? diceMatch[1].trim() : null,
    cost:     costMatch ? costMatch[1].trim() : null,
    duration: durMatch  ? durMatch[1].trim()  : null,
  };
}

// ── Always-15-box damage track ────────────────────────────────────────────────
const TOTAL_BOXES = 15;

function DamageTrack({ active, superficial, aggravated }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: TOTAL_BOXES }, (_, i) => {
        if (i >= active) {
          return (
            <div key={i} className="w-6 h-6 border border-gray-900 rounded-sm bg-gray-950 opacity-20" />
          );
        }
        const fromRight = active - 1 - i;
        const state =
          fromRight < aggravated               ? 2 :
          fromRight < aggravated + superficial  ? 1 : 0;
        const cls =
          state === 2 ? "border-blood bg-blood-dark/50 text-blood" :
          state === 1 ? "border-yellow-600 bg-yellow-900/30 text-yellow-500" :
                        "border-gray-700 text-transparent";
        return (
          <div key={i} className={`w-6 h-6 border rounded-sm flex items-center justify-center text-xs font-bold ${cls}`}>
            {state === 1 ? "/" : state === 2 ? "×" : "·"}
          </div>
        );
      })}
    </div>
  );
}

function DotTracker({ value, max, variant = "blood", onSetValue }) {
  const filledCls = variant === "hunger" ? "bg-red-700 border-red-700" : "bg-blood border-blood";
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          onClick={onSetValue ? (e) => { e.stopPropagation(); onSetValue(i + 1 === value ? i : i + 1); } : undefined}
          className={`w-5 h-5 rounded-full border ${i < value ? filledCls : "border-gray-700"} ${onSetValue ? "cursor-pointer hover:opacity-70 transition-opacity" : ""}`}
        />
      ))}
    </div>
  );
}

// ── Condition badges ──────────────────────────────────────────────────────────
const COND_STYLE = {
  mild:     "border-yellow-800/60 text-yellow-500/80 bg-yellow-950/40",
  moderate: "border-orange-800/60 text-orange-400   bg-orange-950/40",
  severe:   "border-red-800/70   text-red-400        bg-red-950/50",
};

function CondBadges({ conditions }) {
  if (!conditions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {conditions.map((c) => (
        <span
          key={c.id}
          title={c.notes ?? c.severity}
          className={`text-xs px-1.5 py-px rounded border font-gothic ${COND_STYLE[c.severity] ?? COND_STYLE.moderate}`}
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}

// ── Last roll widget ─────────────────────────────────────────────────────────
function outcomeColor(outcome) {
  if (!outcome) return "text-gray-500";
  if (outcome === "Bestial Failure")   return "text-red-400";
  if (outcome === "Failure")           return "text-gray-500";
  if (outcome === "Messy Critical")    return "text-orange-400";
  if (outcome === "Critical Success!") return "text-yellow-400";
  return "text-green-400";
}

function LastRollWidget({ roll }) {
  if (!roll) return (
    <div className="border border-void-border/40 rounded p-2 text-center">
      <p className="text-[10px] text-gray-700 font-gothic uppercase tracking-widest">No rolls yet</p>
    </div>
  );

  const timeStr = new Date(roll.created_at).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="border border-void-border/50 rounded p-2 bg-black/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-gray-600 uppercase tracking-widest font-gothic">Last Roll</span>
        <span className="text-[9px] text-gray-700">{timeStr}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Dice pool summary */}
        <span className="text-xs text-gray-400">
          {roll.pool_size}d
          {roll.hunger_dice > 0 && <span className="text-red-500">+{roll.hunger_dice}h</span>}
        </span>
        <span className="text-gray-700">→</span>
        {/* Successes */}
        <span className="text-sm font-gothic text-gray-200">
          {roll.total_successes}
          <span className="text-[10px] text-gray-500 ml-0.5">hits</span>
        </span>
        {/* Outcome */}
        <span className={`text-xs font-gothic font-medium ml-auto ${outcomeColor(roll.outcome)}`}>
          {roll.outcome}
        </span>
      </div>
      {roll.label && (
        <p className="text-[9px] text-gray-600 mt-0.5 italic">{roll.label}</p>
      )}
    </div>
  );
}

// ── Retainer row in session dropdown ─────────────────────────────────────────
function RetainerRow({ retainer, onOpen }) {
  return (
    <button
      onClick={() => onOpen(retainer.id)}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-blue-800/40 bg-blue-950/10 hover:border-blue-500/60 hover:bg-blue-900/20 transition-colors text-left"
    >
      <div className="min-w-0">
        <p className="text-xs font-gothic text-blue-300 truncate">{retainer.name}</p>
        {retainer.concept && (
          <p className="text-[10px] text-gray-500 italic truncate">{retainer.concept}</p>
        )}
      </div>
      <span className="text-[10px] text-blue-700 shrink-0">View →</span>
    </button>
  );
}

const GEN_LABEL = { childer: "13th", neonate: "12th", ancillae: "11th" };

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ char, player, conditions, isGM, onConditionsChange, lastRoll, onOpenRetainer, onFullEdit, fullEditMode, onGmAdjust, onSessionAdjust }) {
  const [showConditions, setShowConditions] = useState(false);
  const [expandedDisc, setExpandedDisc]     = useState(null);
  const [showRetainers, setShowRetainers]   = useState(false);

  return (
    <div
      onClick={fullEditMode && onFullEdit ? () => onFullEdit(char.id) : undefined}
      className={`border rounded-lg p-4 flex flex-col gap-4 transition-colors ${
        fullEditMode
          ? "border-blood/60 cursor-pointer hover:border-blood hover:bg-blood-dark/10"
          : "border-void-border hover:border-blood/40"
      }`}
      style={clanCardStyle(char.clan_name)}
    >

      {/* Name + player + conditions */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-gothic text-blood text-xl leading-tight">{char.name}</h2>
          <span className="text-gray-600 text-xs mt-0.5 shrink-0">{player}</span>
        </div>
        <p className="text-gray-500 text-xs mb-1">
          {char.clan_name ?? "—"} · {GEN_LABEL[char.generation] ?? "—"} Gen
          {char.concept ? <span className="text-gray-600"> · {char.concept}</span> : null}
        </p>
        {conditions?.length > 0 && <CondBadges conditions={conditions} />}

        {/* GM condition toggle */}
        {isGM && (
          <button
            onClick={() => setShowConditions((v) => !v)}
            className="mt-1 text-xs text-gray-700 hover:text-blood transition-colors font-gothic"
          >
            {showConditions ? "▲ Hide Conditions" : "▼ Manage Conditions"}
          </button>
        )}
        {isGM && showConditions && (
          <div className="mt-2 border-t border-void-border/40 pt-2">
            <ConditionManager
              characterId={char.id}
              characterName={char.name}
              onChangeCallback={onConditionsChange}
            />
          </div>
        )}
      </div>

      {/* Last Roll — always visible when GM */}
      {isGM && (
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-gothic mb-1">⚄ Dice</p>
          <LastRollWidget roll={lastRoll} />
        </div>
      )}

      {/* Blood Potency + Humanity + Hunger */}
      <div className="flex flex-col gap-1.5">
        {[
          { key: "blood_potency", label: "Blood Pot.", max: 5,  variant: "blood",   session: false },
          { key: "humanity",      label: "Humanity",   max: 10, variant: "blood",   session: false },
          { key: "current_hunger",label: "Hunger",     max: 5,  variant: "hunger",  session: true  },
        ].map(({ key, label, max, variant, session }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
            <DotTracker
              value={char[key] ?? 0}
              max={max}
              variant={variant}
              onSetValue={fullEditMode && isGM
                ? (val) => session
                  ? onSessionAdjust?.(char.id, key, val)
                  : onGmAdjust?.(char.id, key, val)
                : undefined}
            />
          </div>
        ))}
      </div>

      {/* Health + Willpower — always 15 boxes, greyed out unused */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-600">Health</p>
              {fullEditMode && isGM ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onGmAdjust?.(char.id, "health", Math.max(1, char.health - 1))} className="w-5 h-5 rounded border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors text-xs leading-none">−</button>
                  <span className="text-xs text-gray-400 w-4 text-center">{char.health}</span>
                  <button onClick={() => onGmAdjust?.(char.id, "health", Math.min(15, char.health + 1))} className="w-5 h-5 rounded border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors text-xs leading-none">+</button>
                </div>
              ) : (
                <span className="text-gray-700 text-xs">({char.health} active)</span>
              )}
            </div>
            <p className="text-gray-800 text-xs">
              <span className="text-yellow-600">/ sup</span>
              <span className="mx-1">·</span>
              <span className="text-blood">× agg</span>
            </p>
          </div>
          <DamageTrack active={char.health} superficial={char.health_superficial} aggravated={char.health_aggravated} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-600">Willpower</p>
              {fullEditMode && isGM ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onGmAdjust?.(char.id, "willpower", Math.max(1, char.willpower - 1))} className="w-5 h-5 rounded border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors text-xs leading-none">−</button>
                  <span className="text-xs text-gray-400 w-4 text-center">{char.willpower}</span>
                  <button onClick={() => onGmAdjust?.(char.id, "willpower", Math.min(10, char.willpower + 1))} className="w-5 h-5 rounded border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors text-xs leading-none">+</button>
                </div>
              ) : (
                <span className="text-gray-700 text-xs">({char.willpower} active)</span>
              )}
            </div>
          </div>
          <DamageTrack active={char.willpower} superficial={char.willpower_superficial} aggravated={char.willpower_aggravated} />
        </div>
      </div>

      {/* Disciplines + powers */}
      {char.disciplines?.length > 0 && (
        <div className="border-t border-void-border/40 pt-3">
          <p className="text-xs text-gray-600 font-gothic tracking-widest uppercase mb-2">Disciplines</p>
          <div className="space-y-1.5">
            {char.disciplines.map((d) => {
              const open = expandedDisc === d.name;
              return (
                <div key={d.name}>
                  <button
                    className="w-full flex items-center justify-between gap-2 text-left hover:text-white transition-colors"
                    onClick={() => setExpandedDisc(open ? null : d.name)}
                  >
                    <span className="text-xs text-gray-300 flex items-center gap-1.5">
                      <span className="font-gothic">{d.name}</span>
                      <span className="text-blood-dark text-[10px] tracking-tight">
                        {"●".repeat(d.level)}{"○".repeat(5 - d.level)}
                      </span>
                    </span>
                    <span className="text-gray-600 text-[10px]">{open ? "▲" : "▼"}</span>
                  </button>

                  {open && d.powers?.length > 0 && (
                    <div className="mt-2 ml-2 space-y-2">
                      {d.powers.map((pw) => {
                        const info = parsePowerInfo(pw.system_text);
                        return (
                          <div key={pw.id} className="rounded border border-void-border/40 bg-black/20 p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs text-gray-200 font-gothic font-medium">{pw.name}</span>
                              <span className="text-blood-dark text-[9px] tracking-tight">
                                {"●".repeat(pw.level)}{"○".repeat(5 - pw.level)}
                              </span>
                            </div>
                            {pw.description && (
                              <p className="text-[10px] text-gray-500 italic leading-relaxed mb-1.5">
                                {pw.description}
                              </p>
                            )}
                            {pw.prerequisite && (
                              <div className="text-[10px] text-red-600 mb-1.5 border-l-2 border-amber-600 pl-1.5">
                                <span className="font-medium">Requires:</span> {pw.prerequisite}
                              </div>
                            )}
                            <div className="flex flex-col gap-0.5">
                              {info.dicePool && (
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[9px] text-red-600 uppercase tracking-wider shrink-0">Roll</span>
                                  <span className="text-[10px] text-blood font-medium">{info.dicePool}</span>
                                </div>
                              )}
                              {info.cost && (
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[9px] text-gray-600 uppercase tracking-wider shrink-0">Cost</span>
                                  <span className="text-[10px] text-amber-500/80">{info.cost}</span>
                                </div>
                              )}
                              {info.duration && (
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[9px] text-gray-600 uppercase tracking-wider shrink-0">Duration</span>
                                  <span className="text-[10px] text-gray-400">{info.duration}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {open && (!d.powers || d.powers.length === 0) && (
                    <p className="ml-2 mt-1 text-[10px] text-gray-700 italic">No powers recorded.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Retainers dropdown */}
      {char.retainers?.length > 0 && (
        <div className="border-t border-void-border/40 pt-3">
          <button
            onClick={() => setShowRetainers((v) => !v)}
            className="w-full flex items-center justify-between text-left mb-2"
          >
            <p className="text-xs text-blue-400/80 font-gothic tracking-widest uppercase">
              Retainers ({char.retainers.length})
            </p>
            <span className="text-gray-600 text-[10px]">{showRetainers ? "▲" : "▼"}</span>
          </button>
          {showRetainers && (
            <div className="space-y-1.5">
              {char.retainers.map((r) => (
                <RetainerRow key={r.id} retainer={r} onOpen={onOpenRetainer} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SessionModePage() {
  const { groupId } = useParams();
  const navigate    = useNavigate();
  const [group,     setGroup]        = useState(null);
  const [error,     setError]        = useState(null);
  const [lastSync,  setLastSync]     = useState(null);
  const [conditionsMap, setConditionsMap] = useState({});
  const [isGM, setIsGM] = useState(false);

  // lastRollMap: username → most recent RollOut for that player
  const [lastRollMap, setLastRollMap] = useState({});

  // Full edit save indicator
  const [hasChanges, setHasChanges] = useState(false);
  const [gmStatSaving, setGmStatSaving] = useState(false);

  const flashSaved = () => setHasChanges(true);

  // retainer modal
  const [retainerModal, setRetainerModal]     = useState(null); // full character object
  const [loadingRetainer, setLoadingRetainer] = useState(false);

  // full-edit overlay (GM only)
  const [editChar, setEditChar]         = useState(null);
  const [loadingEdit, setLoadingEdit]   = useState(false);
  const [fullEditMode, setFullEditMode] = useState(false);

  const adjustGmStat = useCallback(async (key, value) => {
    if (!editChar) return;
    setGmStatSaving(true);
    try {
      const res = await api.put(`/api/characters/${editChar.id}/gm-adjust`, { [key]: value });
      setEditChar(res.data);
      flashSaved();
    } catch (_) {}
    finally { setGmStatSaving(false); }
  }, [editChar]);

  // Inline card stat adjustments (no overlay needed)
  const handleCardGmAdjust = useCallback(async (charId, key, value) => {
    try {
      await api.put(`/api/characters/${charId}/gm-adjust`, { [key]: value });
      refresh();
    } catch (_) {}
  }, [refresh]);

  const handleCardSessionAdjust = useCallback(async (charId, key, value) => {
    try {
      await api.put(`/api/characters/${charId}/session`, { [key]: value });
      refresh();
    } catch (_) {}
  }, [refresh]);

  const openFullEdit = useCallback(async (charId) => {
    setLoadingEdit(true);
    setEditChar(null);
    setHasChanges(false);
    editCharRef.current = charId;
    try {
      const res = await api.get(`/api/characters/${charId}`);
      setEditChar(res.data);
    } catch (_) {}
    finally { setLoadingEdit(false); }
  }, []);

  const closeFullEdit = () => {
    setEditChar(null);
    setHasChanges(false);
    editCharRef.current = null;
    refresh();
  };

  const openRetainer = useCallback(async (id) => {
    setLoadingRetainer(true);
    setRetainerModal(null);
    try {
      const res = await api.get(`/api/characters/${id}`);
      setRetainerModal(res.data);
    } catch (_) { /* silent */ }
    finally { setLoadingRetainer(false); }
  }, []);

  // Check if current user is a GM
  useEffect(() => {
    api.get("/api/auth/me").then((res) => {
      setIsGM(res.data.role === "gm" || res.data.role === "admin");
    }).catch(() => {});
  }, []);


  const fetchConditions = useCallback(async (charIds) => {
    const results = await Promise.allSettled(
      charIds.map((id) => api.get(`/api/conditions/character/${id}`))
    );
    setConditionsMap((prev) => {
      const map = { ...prev };
      charIds.forEach((id, idx) => {
        map[id] = results[idx].status === "fulfilled" ? results[idx].value.data : [];
      });
      return map;
    });
  }, []);

  // Fetch latest roll per player username for this group
  const fetchRolls = useCallback(async () => {
    try {
      const res = await api.get(`/api/dice/history/group/${groupId}?limit=100`);
      // Build map: username → most recent roll (rolls are already ordered newest first)
      const map = {};
      for (const roll of res.data) {
        if (!map[roll.username]) {
          map[roll.username] = roll;
        }
      }
      setLastRollMap(map);
    } catch (_) {
      // GM may not own the group if it's a player view — silent fail
    }
  }, [groupId]);

  const editCharRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get(`/api/groups/${groupId}`);
      setGroup(res.data);
      setLastSync(new Date());
      setError(null);
      const ids = res.data.members.flatMap((m) => m.characters.map((c) => c.id));
      if (ids.length) fetchConditions(ids);
      // If Full Edit overlay is open, also refresh that character
      if (editCharRef.current) {
        const charRes = await api.get(`/api/characters/${editCharRef.current}`);
        setEditChar(charRes.data);
      }
    } catch (e) {
      setError(e.response?.data?.detail ?? "Failed to load group.");
    }
  }, [groupId, fetchConditions]);

  useEffect(() => {
    refresh();
    fetchRolls();
    const interval = setInterval(() => {
      refresh();
      fetchRolls();
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh, fetchRolls]);

  // Re-fetch conditions for one character after GM makes a change
  const refreshConditionsFor = useCallback((charId) => {
    api.get(`/api/conditions/character/${charId}`).then((res) => {
      setConditionsMap((prev) => ({ ...prev, [charId]: res.data }));
    }).catch(() => {});
  }, []);


  const cards = group
    ? group.members.flatMap((m) => m.characters.map((c) => ({ char: c, player: m.username })))
    : [];

  const cols =
    cards.length === 1 ? "grid-cols-1 max-w-2xl mx-auto" :
    cards.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
    cards.length <= 4  ? "grid-cols-1 sm:grid-cols-2" :
                         "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="min-h-screen bg-void text-gray-100 p-4 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-gothic text-2xl text-blood">
            {group ? group.name : "Loading…"}
          </h1>
          {group && <span className="text-gray-600 text-sm">{cards.length} characters</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-700 animate-pulse inline-block" />
            {lastSync
              ? `Synced ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "Connecting…"}
          </span>
          {isGM && (
            <button
              onClick={() => setFullEditMode((v) => !v)}
              className={`text-xs font-gothic tracking-wider border rounded px-3 py-1 transition-colors ${
                fullEditMode
                  ? "border-blood text-blood bg-blood-dark/20"
                  : "border-void-border text-gray-500 hover:border-blood hover:text-blood"
              }`}
            >
              {fullEditMode ? "✓ Full Edit" : "Full Edit"}
            </button>
          )}
          <button onClick={() => navigate("/gm")}
            className="text-gray-600 hover:text-gray-300 text-xs font-gothic tracking-wider transition-colors">
            ← Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-blood-dark/20 border border-blood-dark rounded p-3 mb-4 text-red-300 text-sm">{error}</div>
      )}

      {fullEditMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-blood-dark/20 border border-blood-dark/60 rounded mb-4 gap-3">
          <span className="text-sm font-gothic text-blood">
            ⚑ Full Edit — click any character card to edit
          </span>
          <button
            onClick={() => setFullEditMode(false)}
            className="text-xs font-gothic text-blood-dark hover:text-blood border border-blood-dark hover:border-blood rounded px-2 py-0.5 transition-colors shrink-0"
          >
            Exit
          </button>
        </div>
      )}

      {!group && !error && (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-gothic text-blood text-2xl animate-pulse">Summoning the coterie…</p>
        </div>
      )}

      {cards.length > 0 && (
        <div className={`grid ${cols} gap-4 items-start`}>
          {cards.map(({ char, player }) => (
            <SessionCard
              key={char.id}
              char={char}
              player={player}
              conditions={conditionsMap[char.id] ?? []}
              isGM={isGM}
              onConditionsChange={() => refreshConditionsFor(char.id)}
              lastRoll={lastRollMap[player] ?? null}
              onOpenRetainer={openRetainer}
              fullEditMode={fullEditMode}
              onFullEdit={isGM ? openFullEdit : undefined}
              onGmAdjust={isGM ? handleCardGmAdjust : undefined}
              onSessionAdjust={isGM ? handleCardSessionAdjust : undefined}
            />
          ))}
        </div>
      )}

      {group && cards.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 font-gothic text-xl">No characters in this group yet.</p>
        </div>
      )}

      {/* ── Full-edit overlay (GM) ── */}
      {(editChar || loadingEdit) && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-void-border bg-void-light shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-gothic text-blood text-lg">
                {loadingEdit ? "Opening…" : editChar?.name}
              </span>
              {!loadingEdit && (
                <span className="text-xs font-gothic tracking-widest text-blood border border-blood-dark rounded px-2 py-0.5 uppercase">
                  Full Edit
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={closeFullEdit}
                className="text-sm font-gothic tracking-wider bg-green-900/40 hover:bg-green-800/60 border border-green-700 text-green-400 rounded px-4 py-1.5 transition-colors"
              >
                ✓ Save & Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-void">
            {loadingEdit ? (
              <p className="font-gothic text-blood animate-pulse text-center mt-20">Opening the coffin…</p>
            ) : editChar ? (
              <>
              {/* GM Quick Stats — permanent stat overrides */}
              <div className="mb-6 border border-blood-dark/60 rounded-lg p-4 bg-blood-dark/10">
                <p className="text-xs text-blood font-gothic tracking-widest uppercase mb-3">GM Quick Stats</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "HP Max",      key: "health",        min: 1,  max: 15, value: editChar.health },
                    { label: "WP Max",      key: "willpower",     min: 1,  max: 10, value: editChar.willpower },
                    { label: "Blood Pot.",  key: "blood_potency", min: 0,  max: 5,  value: editChar.blood_potency },
                    { label: "Humanity",    key: "humanity",      min: 0,  max: 10, value: editChar.humanity },
                  ].map(({ label, key, min, max, value }) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500 font-gothic">{label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustGmStat(key, Math.max(min, value - 1))}
                          disabled={value <= min || gmStatSaving}
                          className="w-7 h-7 rounded border border-void-border text-gray-400 hover:border-blood hover:text-blood disabled:opacity-30 transition-colors text-base leading-none"
                        >−</button>
                        <span className="text-gray-200 font-gothic text-lg w-6 text-center">{value}</span>
                        <button
                          onClick={() => adjustGmStat(key, Math.min(max, value + 1))}
                          disabled={value >= max || gmStatSaving}
                          className="w-7 h-7 rounded border border-void-border text-gray-400 hover:border-blood hover:text-blood disabled:opacity-30 transition-colors text-base leading-none"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <CharacterSheet
                character={editChar}
                freeEdit
                onImprove={async (traitType, traitName, extra = {}) => {
                  const res = await api.post(`/api/characters/${editChar.id}/improve`, { trait_type: traitType, trait_name: traitName || undefined, ...extra, free: true });
                  setEditChar(res.data); flashSaved();
                }}
                onUnimprove={async (traitType, traitName, extra = {}) => {
                  const res = await api.post(`/api/characters/${editChar.id}/unimprove`, { trait_type: traitType, trait_name: traitName || undefined, ...extra });
                  setEditChar(res.data); flashSaved();
                }}
                onCharacterUpdate={(updated) => { setEditChar(updated); flashSaved(); }}
                onAddWeapon={async (w) => { const res = await api.post(`/api/characters/${editChar.id}/weapons`, w); setEditChar(res.data); flashSaved(); }}
                onDeleteWeapon={async (id) => { const res = await api.delete(`/api/characters/${editChar.id}/weapons/${id}`); setEditChar(res.data); flashSaved(); }}
                onAddPossession={async (p) => { const res = await api.post(`/api/characters/${editChar.id}/possessions`, p); setEditChar(res.data); flashSaved(); }}
                onDeletePossession={async (id) => { const res = await api.delete(`/api/characters/${editChar.id}/possessions/${id}`); setEditChar(res.data); flashSaved(); }}
                onAddSpecialty={async (skillName, specialtyName) => { const res = await api.post(`/api/characters/${editChar.id}/specialties`, { skill_name: skillName, specialty_name: specialtyName }); setEditChar(res.data); flashSaved(); }}
                onDeleteSpecialty={async (skillName, specialtyName) => { const res = await api.delete(`/api/characters/${editChar.id}/specialties`, { params: { skill_name: skillName, specialty_name: specialtyName } }); setEditChar(res.data); flashSaved(); }}
                onClaimFreePower={async (powerId) => { try { const res = await api.post(`/api/characters/${editChar.id}/claim-predator-power`, { power_id: powerId }); setEditChar(res.data); flashSaved(); } catch {} }}
              />
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Retainer full-stat modal ── */}
      {(retainerModal || loadingRetainer) && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex flex-col overflow-hidden"
          onClick={() => { if (!loadingRetainer) setRetainerModal(null); }}
        >
          <div
            className="relative flex flex-col w-full h-full max-w-5xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-blue-800/50 bg-gray-950 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-blue-500 text-[10px] uppercase tracking-widest font-gothic">Retainer</span>
                <span className="font-gothic text-blue-300 text-lg">
                  {loadingRetainer ? "Loading…" : retainerModal?.name}
                </span>
              </div>
              <button
                onClick={() => setRetainerModal(null)}
                className="text-gray-600 hover:text-gray-300 transition-colors font-gothic tracking-wider text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-950">
              {loadingRetainer ? (
                <div className="flex items-center justify-center h-64">
                  <p className="font-gothic text-blue-400 text-xl animate-pulse">Summoning retainer…</p>
                </div>
              ) : retainerModal ? (
                <CharacterSheet character={retainerModal} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
