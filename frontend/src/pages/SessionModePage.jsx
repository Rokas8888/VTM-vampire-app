import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import ConditionManager from "../components/gm/ConditionManager";
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
          // greyed-out unused box
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

const GEN_LABEL = { childer: "13th", neonate: "12th", ancillae: "11th" };

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ char, player, conditions, isGM, onConditionsChange }) {
  const [showConditions, setShowConditions] = useState(false);
  const [expandedDisc, setExpandedDisc]     = useState(null);

  return (
    <div
      className="border border-void-border rounded-lg p-4 flex flex-col gap-4 hover:border-blood/40 transition-colors"
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

      {/* Blood Potency + Humanity + Hunger */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16 shrink-0">Blood Pot.</span>
          <DotTracker value={char.blood_potency} max={5} variant="blood" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16 shrink-0">Humanity</span>
          <DotTracker value={char.humanity} max={10} variant="blood" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16 shrink-0">Hunger</span>
          <DotTracker value={char.current_hunger} max={5} variant="hunger" />
        </div>
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
                  {/* Discipline row — click to toggle powers */}
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

                  {/* Power list */}
                  {open && d.powers?.length > 0 && (
                    <div className="mt-2 ml-2 space-y-2">
                      {d.powers.map((pw) => {
                        const info = parsePowerInfo(pw.system_text);
                        return (
                          <div key={pw.id} className="rounded border border-void-border/40 bg-black/20 p-2">
                            {/* Name + dot level */}
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs text-gray-200 font-gothic font-medium">{pw.name}</span>
                              <span className="text-blood-dark text-[9px] tracking-tight">
                                {"●".repeat(pw.level)}{"○".repeat(5 - pw.level)}
                              </span>
                            </div>
                            {/* Description */}
                            {pw.description && (
                              <p className="text-[10px] text-gray-500 italic leading-relaxed mb-1.5">
                                {pw.description}
                              </p>
                            )}
                            {/* Prerequisite */}
                            {pw.prerequisite && (
                              <div className="text-[10px] text-red-600 mb-1.5 border-l-2 border-amber-600 pl-1.5">
                                <span className="font-medium">Requires:</span> {pw.prerequisite}
                              </div>
                            )}
                            {/* Highlighted roll stats */}
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
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

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
    cards.length === 2 ? "grid-cols-2" :
    cards.length <= 4  ? "grid-cols-2" :
                         "grid-cols-3";

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
          <button onClick={() => navigate("/gm")}
            className="text-gray-600 hover:text-gray-300 text-xs font-gothic tracking-wider transition-colors">
            ← Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-blood-dark/20 border border-blood-dark rounded p-3 mb-4 text-red-300 text-sm">{error}</div>
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
            />
          ))}
        </div>
      )}

      {group && cards.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 font-gothic text-xl">No characters in this group yet.</p>
        </div>
      )}
    </div>
  );
}
