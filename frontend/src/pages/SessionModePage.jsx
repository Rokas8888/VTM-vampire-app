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

function DotTracker({ value, max, variant = "blood" }) {
  const filledCls = variant === "hunger" ? "bg-red-700 border-red-700" : "bg-blood border-blood";
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`w-5 h-5 rounded-full border ${i < value ? filledCls : "border-gray-700"}`} />
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
function SessionCard({ char, player, conditions, isGM, onConditionsChange, lastRoll, onOpenRetainer,
  manageMode, isActive, onActivate, statOverrides, onStatChange }) {
  const [showConditions, setShowConditions] = useState(false);
  const [expandedDisc, setExpandedDisc]     = useState(null);
  const [showRetainers, setShowRetainers]   = useState(false);

  return (
    <div
      onClick={manageMode && !isActive ? onActivate : undefined}
      className={`border rounded-lg p-4 flex flex-col gap-4 transition-colors ${
        manageMode && !isActive
          ? "opacity-50 border-void-border cursor-pointer hover:opacity-70"
          : isActive
          ? "border-blood opacity-100"
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
          { key: "blood_potency", label: "Blood Pot.", max: 5,  variant: "blood"  },
          { key: "humanity",      label: "Humanity",   max: 10, variant: "blood"  },
          { key: "current_hunger",label: "Hunger",     max: 5,  variant: "hunger" },
        ].map(({ key, label, max, variant }) => {
          const isManagedStat = manageMode === key;
          const displayVal    = statOverrides[key] ?? char[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
              <DotTracker value={displayVal} max={max} variant={variant} />
              {isActive && isManagedStat && (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatChange(key, -1); }}
                    disabled={displayVal <= 0}
                    className="w-5 h-5 rounded border border-void-border text-gray-500 hover:text-blood hover:border-blood disabled:opacity-30 text-xs leading-none transition-colors"
                  >−</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatChange(key, +1); }}
                    disabled={displayVal >= max}
                    className="w-5 h-5 rounded border border-void-border text-gray-500 hover:text-blood hover:border-blood disabled:opacity-30 text-xs leading-none transition-colors"
                  >+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Health + Willpower — always 15 boxes, greyed out unused */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-600">Health <span className="text-gray-700">({char.health} active)</span></p>
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
            <p className="text-xs text-gray-600">Willpower <span className="text-gray-700">({char.willpower} active)</span></p>
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

  // GM manage mode
  const [manageMode, setManageMode]               = useState(null); // "humanity" | "blood_potency" | null
  const [activeCard, setActiveCard]               = useState(null); // charId | null
  const [statOverrides, setStatOverrides]         = useState({});   // { [charId]: { humanity?: number, blood_potency?: number } }
  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const manageRef = useRef(null);

  // retainer modal
  const [retainerModal, setRetainerModal]     = useState(null); // full character object
  const [loadingRetainer, setLoadingRetainer] = useState(false);

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

  // Close manage dropdown on outside click
  useEffect(() => {
    if (!showManageDropdown) return;
    const close = (e) => {
      if (manageRef.current && !manageRef.current.contains(e.target)) {
        setShowManageDropdown(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showManageDropdown]);

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

  const refresh = useCallback(async () => {
    try {
      const res = await api.get(`/api/groups/${groupId}`);
      setGroup(res.data);
      setLastSync(new Date());
      setError(null);
      const ids = res.data.members.flatMap((m) => m.characters.map((c) => c.id));
      if (ids.length) fetchConditions(ids);
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

  const handleStatChange = async (charId, stat, delta) => {
    const card    = cards.find((c) => c.char.id === charId);
    const current = statOverrides[charId]?.[stat] ?? card?.char[stat] ?? 0;
    const max     = stat === "humanity" ? 10 : 5;
    const newVal  = Math.max(0, Math.min(max, current + delta));

    setStatOverrides((prev) => ({
      ...prev,
      [charId]: { ...prev[charId], [stat]: newVal },
    }));

    try {
      await api.put(`/api/characters/${charId}/gm-adjust`, { [stat]: newVal });
    } catch {
      setStatOverrides((prev) => ({
        ...prev,
        [charId]: { ...prev[charId], [stat]: current },
      }));
    }
  };

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
          {/* Manage dropdown — GM only */}
          {isGM && (
            <div className="relative" ref={manageRef}>
              <button
                onClick={() => setShowManageDropdown((v) => !v)}
                className="text-xs font-gothic tracking-wider text-gray-500 hover:text-blood border border-void-border hover:border-blood rounded px-3 py-1 transition-colors"
              >
                Manage ▾
              </button>
              {showManageDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-void border border-void-border rounded shadow-lg z-20 min-w-[150px]">
                  {[
                    { key: "humanity",      label: "Humanity" },
                    { key: "blood_potency", label: "Blood Potency" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setManageMode(key);
                        setActiveCard(null);
                        setShowManageDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-gothic text-gray-400 hover:text-blood hover:bg-void-light transition-colors first:rounded-t last:rounded-b"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

      {/* Management mode banner */}
      {manageMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-blood-dark/20 border border-blood-dark/60 rounded mb-4 gap-3">
          <span className="text-sm font-gothic text-blood">
            ⚑ {manageMode === "humanity" ? "Humanity" : "Blood Potency"} Mode — tap a character card to adjust
          </span>
          <button
            onClick={() => { setManageMode(null); setActiveCard(null); }}
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
              manageMode={manageMode}
              isActive={activeCard === char.id}
              onActivate={() => setActiveCard(char.id)}
              statOverrides={statOverrides[char.id] ?? {}}
              onStatChange={(stat, delta) => handleStatChange(char.id, stat, delta)}
            />
          ))}
        </div>
      )}

      {group && cards.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 font-gothic text-xl">No characters in this group yet.</p>
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
