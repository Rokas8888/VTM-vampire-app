import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../services/api";
import CharacterSheet from "../components/character/CharacterSheet";
import DiceRollerModal from "../components/shared/DiceRollerModal";
import MonsterPanel from "../components/gm/MonsterPanel";
import ConditionManager from "../components/gm/ConditionManager";
import Spinner from "../components/shared/Spinner";
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

// ── Damage track — matches player CharacterSheet DamageBox style ─────────────
function MiniTrack({ total, superficial, aggravated }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: total }, (_, i) => {
        const fromRight = total - 1 - i;
        const state =
          fromRight < aggravated               ? 2 :
          fromRight < aggravated + superficial ? 1 : 0;
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

// ── Dot tracker — matches player CharacterSheet DotTracker style ──────────────
function DotTracker({ value, max, variant = "blood" }) {
  const filledCls =
    variant === "hunger" ? "bg-red-700 border-red-700" : "bg-blood border-blood";
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`w-5 h-5 rounded-full border ${i < value ? filledCls : "border-gray-700"}`} />
      ))}
    </div>
  );
}

// ── GM character card ─────────────────────────────────────────────────────────
const GENERATION_SHORT = {
  childer: "13th",
  neonate: "12th",
  ancillae: "11th",
};

function GMCharCard({ char, onClick, onRemove }) {
  const [expandedDisc, setExpandedDisc] = useState(null); // discipline name being expanded
  const [powerPopup, setPowerPopup]     = useState(null); // power object for info popup
  const [notesOpen, setNotesOpen]       = useState(false);

  const isRetainer = !!char.is_retainer;

  return (
    <div
      className={`group relative border rounded-lg p-4 flex flex-col gap-3 transition-colors ${
        isRetainer
          ? "border-blue-700/60 hover:border-blue-500/80 bg-blue-950/10"
          : "border-void-border hover:border-blood/60"
      }`}
      style={isRetainer ? {} : clanCardStyle(char.clan_name)}
    >
      {/* Clickable overlay for opening sheet — excludes discipline area */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClick} />

      {/* Remove button — top-right, revealed on hover — only for non-retainers */}
      {onRemove && !isRetainer && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(char.user_id); }}
          title={`Remove ${char.username ?? "player"} from group`}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10 w-5 h-5 rounded-full bg-void-light border border-void-border text-gray-600 hover:border-blood hover:text-blood text-xs font-bold transition-all leading-none flex items-center justify-center"
        >✕</button>
      )}
      <div>
        {isRetainer && (
          <p className="text-blue-600 text-[10px] uppercase tracking-widest font-gothic mb-0.5">
            Retainer{char.parent_name ? ` of ${char.parent_name}` : ""}
          </p>
        )}
        <h3 className={`font-gothic text-lg leading-tight truncate ${isRetainer ? "text-blue-300" : "text-blood"}`}>
          {char.name}
        </h3>
        <p className="text-gray-400 text-xs">
          {isRetainer
            ? (char.concept ?? "Retainer")
            : `${char.clan_name ?? "—"} · ${GENERATION_SHORT[char.generation] ?? "—"} Gen`}
        </p>
      </div>

      {/* BP + Humanity as dot trackers */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16 shrink-0">Blood Pot.</span>
          <DotTracker value={char.blood_potency} max={5} variant="blood" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16 shrink-0">Humanity</span>
          <DotTracker value={char.humanity} max={10} variant="blood" />
        </div>
      </div>

      {/* Hunger */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-16 shrink-0">Hunger</span>
        <DotTracker value={char.current_hunger} max={5} variant="hunger" />
      </div>

      {/* Health + Willpower damage tracks */}
      <div className="flex flex-col gap-1.5">
        <div>
          <p className="text-xs text-gray-500 mb-1">Health</p>
          <MiniTrack total={char.health} superficial={char.health_superficial} aggravated={char.health_aggravated} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Willpower</p>
          <MiniTrack total={char.willpower} superficial={char.willpower_superficial} aggravated={char.willpower_aggravated} />
        </div>
      </div>

      {/* Disciplines + powers */}
      {char.disciplines?.length > 0 && (
        <div className="relative z-10 pt-1 border-t border-void-border/40">
          <p className="text-xs text-gray-600 font-gothic tracking-widest uppercase mb-1.5">Disciplines</p>
          <div className="space-y-1">
            {char.disciplines.map((d) => {
              const open = expandedDisc === d.name;
              return (
                <div key={d.name}>
                  {/* Discipline header row — click to expand/collapse powers */}
                  <button
                    className="w-full flex items-center justify-between gap-2 text-left hover:text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); setExpandedDisc(open ? null : d.name); }}
                  >
                    <span className="text-xs text-gray-300 flex items-center gap-1.5">
                      <span className="font-gothic">{d.name}</span>
                      <span className="text-blood-dark tracking-tight text-[10px]">
                        {"●".repeat(d.level)}{"○".repeat(5 - d.level)}
                      </span>
                    </span>
                    <span className="text-gray-700 text-[10px]">{open ? "▲" : "▼"}</span>
                  </button>

                  {/* Power list */}
                  {open && d.powers?.length > 0 && (
                    <div className="mt-1 ml-2 space-y-1">
                      {d.powers.map((pw) => (
                        <div key={pw.id} className="flex items-start gap-1.5">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-400 font-medium">{pw.name}</span>
                            {pw.system_text && (
                              <p className="text-[10px] text-gray-600 truncate mt-px">
                                {getRollHint(pw.system_text)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPowerPopup(pw); }}
                            className="shrink-0 text-gray-700 hover:text-blood text-xs leading-none mt-0.5 transition-colors"
                            title="View power details"
                          >ℹ</button>
                        </div>
                      ))}
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

      {/* Notes dropdown */}
      {char.notes && (
        <div className="relative z-10 pt-1 border-t border-void-border/40">
          <button
            onClick={(e) => { e.stopPropagation(); setNotesOpen((v) => !v); }}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors w-full"
          >
            <span className={`transition-transform duration-200 ${notesOpen ? "rotate-90" : ""}`}>▶</span>
            Notes
          </button>
          {notesOpen && (
            <p className="mt-1 text-xs text-gray-400 whitespace-pre-line leading-relaxed">{char.notes}</p>
          )}
        </div>
      )}

      {/* Power info popup */}
      {powerPopup && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPowerPopup(null)}
        >
          <div
            className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-gothic text-xl text-blood">{powerPopup.name}</h3>
              <button onClick={() => setPowerPopup(null)} className="text-gray-500 hover:text-white ml-4">✕</button>
            </div>
            <p className="text-blood-dark text-xs mb-3">
              {"●".repeat(powerPopup.level)}{"○".repeat(5 - powerPopup.level)}
            </p>
            {powerPopup.description && (
              <p className="text-gray-400 text-sm italic mb-3 leading-relaxed">{powerPopup.description}</p>
            )}
            {powerPopup.system_text && (
              <div className="border-t border-void-border pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">System</p>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{powerPopup.system_text}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Adaptive character grid ───────────────────────────────────────────────────
function CharacterGrid({ characters, onCardClick, onRemove }) {
  if (characters.length === 0) {
    return <p className="text-gray-600 text-sm italic">No characters yet. Add a player above.</p>;
  }
  const cols =
    characters.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
    characters.length <= 4 ? "grid-cols-2" :
    characters.length <= 6 ? "grid-cols-2 lg:grid-cols-3" :
                              "grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid ${cols} gap-4`}>
      {characters.map((char) => (
        <GMCharCard key={char.id} char={char} onClick={() => onCardClick(char.id)} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── Group list sidebar item ───────────────────────────────────────────────────
function GroupItem({ group, active, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 rounded cursor-pointer flex justify-between items-center group transition-colors ${
        active ? "bg-blood-dark/30 border border-blood-dark" : "hover:bg-void-light border border-transparent"
      }`}
    >
      <div className="min-w-0">
        <p className={`text-sm font-gothic truncate ${active ? "text-blood" : "text-gray-300"}`}>
          {group.name}
        </p>
        <p className="text-xs text-gray-600">{group.member_count} {group.member_count === 1 ? "player" : "players"}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(group); }}
        className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-blood text-xs transition-all ml-2 shrink-0"
        title="Delete group"
      >✕</button>
    </div>
  );
}

// ── Add Player panel (two-step: pick user → pick character) ───────────────────
function AddPlayerPanel({ selectedGroup, onAdd, addError }) {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState([]);
  const [searching, setSearching]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [staged, setStaged]             = useState(null);   // { id, username, characters[] }
  const [charId, setCharId]             = useState(null);   // selected character id
  const [adding, setAdding]             = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/api/groups/search/players?q=${encodeURIComponent(query)}`);
        setResults(res.data);
        setShowDropdown(true);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const pickPlayer = (player) => {
    setStaged(player);
    setCharId(null);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const clearStaged = () => {
    setStaged(null);
    setCharId(null);
  };

  const handleAdd = async () => {
    if (!staged) return;
    setAdding(true);
    try {
      await onAdd(staged.username, charId || null);
      setStaged(null);
      setCharId(null);
    } finally {
      setAdding(false);
    }
  };

  const alreadyInGroup = (playerId) =>
    selectedGroup?.members.some((m) => m.user_id === playerId);

  return (
    <div className="space-y-4">
      <h3 className="font-gothic text-blood-dark text-sm uppercase tracking-wider">Add Player</h3>

      {/* Step 1 — search box */}
      {!staged && (
        <div className="relative" ref={dropdownRef}>
          <input
            className="vtm-input"
            placeholder="Search by username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
          />
          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 z-20 bg-void border border-void-border rounded-b shadow-lg max-h-56 overflow-y-auto">
              {searching ? (
                <p className="text-gray-600 text-sm px-3 py-2 animate-pulse">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-gray-600 text-sm px-3 py-2 italic">No players found.</p>
              ) : results.map((p) => {
                const inGroup = alreadyInGroup(p.id);
                return (
                  <button
                    key={p.id}
                    disabled={inGroup}
                    onClick={() => !inGroup && pickPlayer(p)}
                    className={`w-full text-left flex justify-between items-center px-3 py-2 border-b border-void-border/30 last:border-0 transition-colors ${
                      inGroup
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-void-light cursor-pointer"
                    }`}
                  >
                    <div>
                      <span className="text-sm text-gray-200">{p.username}</span>
                      <span className="text-xs text-gray-600 ml-2">
                        {p.characters.length} {p.characters.length === 1 ? "character" : "characters"}
                      </span>
                    </div>
                    {inGroup
                      ? <span className="text-xs text-gray-600 italic">in group</span>
                      : <span className="text-xs text-blood-dark">Select →</span>
                    }
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — staged player + character picker */}
      {staged && (
        <div className="bg-void-light border border-void-border rounded-lg p-4 space-y-3">
          {/* Player chip */}
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-200 font-medium">{staged.username}</span>
              <span className="text-xs text-gray-600 ml-2">
                {staged.characters.length} {staged.characters.length === 1 ? "character" : "characters"}
              </span>
            </div>
            <button onClick={clearStaged} className="text-gray-600 hover:text-blood text-xs transition-colors">
              ✕ Change
            </button>
          </div>

          {/* Character picker */}
          {staged.characters.length === 0 ? (
            <p className="text-gray-600 text-xs italic">This player has no completed characters. They'll be added without a character.</p>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Select character for this group:</p>
              {staged.characters.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-colors ${
                    charId === c.id
                      ? "border-blood bg-blood-dark/20 text-gray-200"
                      : "border-void-border hover:border-gray-600 text-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="character_pick"
                    checked={charId === c.id}
                    onChange={() => setCharId(c.id)}
                    className="accent-red-700"
                  />
                  <span className="text-sm">{c.name ?? "Unnamed"}</span>
                  {c.clan_name && (
                    <span className="text-xs text-gray-600">· {c.clan_name}</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={adding || (staged.characters.length > 0 && !charId)}
            className="vtm-btn w-full py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adding ? "Adding…" : charId ? "Add Player + Character" : "Add Player"}
          </button>
          {staged.characters.length > 0 && !charId && (
            <p className="text-gray-600 text-xs text-center">Select a character above to continue.</p>
          )}
        </div>
      )}

      {addError && <p className="text-blood text-sm">{addError}</p>}
    </div>
  );
}


// ── Main GMDashboardPage ──────────────────────────────────────────────────────
export default function GMDashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [groups, setGroups]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingGroup, setLoadingGroup]   = useState(false);
  const [activeTab, setActiveTab]         = useState("characters");

  // New group form
  const [showNewGroup, setShowNewGroup]   = useState(false);
  const [newGroupName, setNewGroupName]   = useState("");
  const [newGroupDesc, setNewGroupDesc]   = useState("");
  const [newGroupError, setNewGroupError] = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Add player error (lifted from AddPlayerPanel)
  const [addPlayerError, setAddPlayerError] = useState(null);

  // Full character sheet view (read-only)
  const [viewChar, setViewChar]           = useState(null);
  const [loadingChar, setLoadingChar]     = useState(false);

  // Dice roller
  const [showDice, setShowDice] = useState(false);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteText, setDeleteText]     = useState("");
  const [deleting, setDeleting]         = useState(false);

  // ── Load groups ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/api/groups")
      .then((res) => { setGroups(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  // ── Open group ───────────────────────────────────────────────────────────
  const openGroup = (group) => {
    setSelectedGroup(null);
    setLoadingGroup(true);
    setActiveTab("characters");
    setAddPlayerError(null);
    setShowAddInChars(false);
    setSidebarOpen(false); // close mobile sidebar on selection
    api.get(`/api/groups/${group.id}`)
      .then((res) => { setSelectedGroup(res.data); setLoadingGroup(false); })
      .catch(() => setLoadingGroup(false));
  };

  // ── Create group ─────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { setNewGroupError("Name is required."); return; }
    setCreatingGroup(true); setNewGroupError(null);
    try {
      const res = await api.post("/api/groups", { name: newGroupName.trim(), description: newGroupDesc.trim() || null });
      setGroups((prev) => [{ id: res.data.id, name: res.data.name, description: res.data.description, member_count: 0 }, ...prev]);
      setSelectedGroup(res.data);
      setShowNewGroup(false);
      setNewGroupName(""); setNewGroupDesc("");
    } catch (err) {
      setNewGroupError(err.response?.data?.detail || "Failed to create group.");
    } finally { setCreatingGroup(false); }
  };

  // ── Delete group ─────────────────────────────────────────────────────────
  const handleDeleteGroup = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    try {
      await api.delete(`/api/groups/${deleteTarget.id}`);
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      if (selectedGroup?.id === deleteTarget.id) setSelectedGroup(null);
      setDeleteTarget(null); setDeleteText("");
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  // ── Add player (called from AddPlayerPanel) ───────────────────────────────
  const handleAddPlayer = async (username, characterId) => {
    if (!selectedGroup) return;
    setAddPlayerError(null);
    try {
      const res = await api.post(`/api/groups/${selectedGroup.id}/members`, {
        username,
        character_id: characterId || null,
      });
      setSelectedGroup(res.data);
      setGroups((prev) => prev.map((g) =>
        g.id === selectedGroup.id ? { ...g, member_count: res.data.members.length } : g
      ));
    } catch (err) {
      setAddPlayerError(err.response?.data?.detail || "Failed to add player.");
      throw err; // re-throw so AddPlayerPanel can reset its adding state
    }
  };

  // ── Remove player ─────────────────────────────────────────────────────────
  const handleRemovePlayer = async (userId) => {
    if (!selectedGroup) return;
    try {
      const res = await api.delete(`/api/groups/${selectedGroup.id}/members/${userId}`);
      setSelectedGroup(res.data);
      setGroups((prev) => prev.map((g) =>
        g.id === selectedGroup.id ? { ...g, member_count: res.data.members.length } : g
      ));
    } catch { /* ignore */ }
  };

  // ── Open character sheet ───────────────────────────────────────────────────
  const openCharacter = (charId) => {
    setLoadingChar(true);
    api.get(`/api/characters/${charId}`)
      .then((res) => { setViewChar(res.data); setLoadingChar(false); })
      .catch(() => setLoadingChar(false));
  };

  // ── Flatten all characters + retainers for grid ──────────────────────────
  const allChars = selectedGroup
    ? selectedGroup.members.flatMap((m) =>
        m.characters.flatMap((c) => [
          { ...c, user_id: m.user_id, username: m.username },
          ...(c.retainers ?? []).map((r) => ({
            ...r,
            is_retainer: true,
            parent_name: c.name,
            user_id: m.user_id,
            username: m.username,
            // fill in fields GMCharCard may reference with safe defaults
            disciplines: [],
            top_skills: [],
            all_skills: [],
            attributes: [],
          })),
        ])
      )
    : [];

  // ── Add-player panel toggle inside the Characters tab ─────────────────────
  const [showAddInChars, setShowAddInChars] = useState(false);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void text-gray-200 flex flex-col">

      {/* ── Top nav ── */}
      <div className="border-b border-void-border bg-void-light px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              className="md:hidden text-gray-500 hover:text-blood transition-colors mr-1"
              onClick={() => setSidebarOpen((v) => !v)}
              title="Toggle groups"
            >
              ☰
            </button>
            <h1 className="font-gothic text-xl sm:text-2xl text-blood">Vampire Scriptorium</h1>
            <span className="text-xs text-gray-600 border border-void-border rounded px-2 py-0.5 font-gothic hidden sm:inline">GM</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setShowDice(true)}
              className="px-3 py-1.5 rounded text-xs font-gothic tracking-wider border border-void-border text-gray-400 hover:border-blood hover:text-blood transition-colors"
            >
              ⚄ Dice Roller
            </button>
            <button onClick={() => navigate("/directory")} className="hover:text-blood transition-colors font-gothic tracking-wider text-xs uppercase">
              Directory
            </button>
            <span className="text-gray-600">{user?.username}</span>
            <button onClick={handleLogout} className="hover:text-blood transition-colors font-gothic tracking-wider text-xs uppercase">
              Leave the Night
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full relative">

        {/* ── Mobile sidebar backdrop ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left sidebar — group list ── */}
        <div className={`
          z-30 bg-void border-r border-void-border p-4 flex flex-col gap-3 overflow-y-auto
          fixed top-0 bottom-0 left-0 w-64 transition-transform duration-200
          md:static md:w-56 md:translate-x-0 md:shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-gothic tracking-wider uppercase">Groups</span>
            <button
              onClick={() => setShowNewGroup((v) => !v)}
              className="w-5 h-5 rounded-full border border-void-border text-gray-600 hover:border-blood hover:text-blood text-xs font-bold transition-colors"
              title="New group"
            >+</button>
          </div>

          {/* New group form */}
          {showNewGroup && (
            <div className="bg-void-light border border-void-border rounded p-3 space-y-2">
              <input
                className="vtm-input text-sm py-1"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                autoFocus
              />
              <input
                className="vtm-input text-sm py-1"
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
              />
              {newGroupError && <p className="text-blood text-xs">{newGroupError}</p>}
              <div className="flex gap-2">
                <button onClick={handleCreateGroup} disabled={creatingGroup} className="vtm-btn py-1 px-3 text-xs flex-1">
                  {creatingGroup ? "…" : "Create"}
                </button>
                <button onClick={() => setShowNewGroup(false)} className="vtm-btn-secondary py-1 px-2 text-xs">✕</button>
              </div>
            </div>
          )}

          {/* Group list */}
          {loading ? (
            <p className="text-gray-700 text-xs animate-pulse">Loading…</p>
          ) : groups.length === 0 ? (
            <p className="text-gray-700 text-xs italic">No groups yet.</p>
          ) : (
            <div className="space-y-1">
              {groups.map((g) => (
                <GroupItem
                  key={g.id}
                  group={g}
                  active={selectedGroup?.id === g.id}
                  onClick={() => openGroup(g)}
                  onDelete={(grp) => { setDeleteTarget(grp); setDeleteText(""); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingGroup ? (
            <Spinner text="Summoning the coterie…" />

          ) : !selectedGroup ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-600 font-gothic text-lg tracking-wider mb-2">The night awaits.</p>
                <p className="text-gray-700 text-sm">Select a group or create a new one.</p>
              </div>
            </div>

          ) : (
            <div>
              {/* Group header */}
              <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
                <div>
                  <h2 className="font-gothic text-3xl text-blood">{selectedGroup.name}</h2>
                  {selectedGroup.description && (
                    <p className="text-gray-500 text-sm mt-1">{selectedGroup.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-gray-600">
                    {selectedGroup.members.length} {selectedGroup.members.length === 1 ? "player" : "players"} ·{" "}
                    {allChars.length} {allChars.length === 1 ? "character" : "characters"}
                  </span>
                  <button
                    onClick={() => window.open(`/session/${selectedGroup.id}`, "_blank")}
                    className="vtm-btn-secondary text-xs py-1.5 px-3"
                  >
                    ⚔ Session Mode
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 border-b border-void-border mb-6">
                {["characters", "monsters", "players"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 text-sm font-gothic tracking-wider transition-colors capitalize ${
                      activeTab === tab
                        ? "text-blood border-b-2 border-blood"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab === "characters"
                      ? `Characters (${allChars.length})`
                      : tab === "players"
                      ? `Players (${selectedGroup.members.length})`
                      : "Monsters"}
                  </button>
                ))}
              </div>

              {/* ── Characters tab ── */}
              {activeTab === "characters" && (
                <div>
                  {/* Toolbar: character count + add button */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-600">
                      {allChars.length} {allChars.length === 1 ? "character" : "characters"} in session
                    </span>
                    <button
                      onClick={() => setShowAddInChars((v) => !v)}
                      className={`px-3 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
                        showAddInChars
                          ? "border-blood text-blood bg-blood-dark/20"
                          : "border-void-border text-gray-500 hover:border-blood hover:text-blood"
                      }`}
                    >
                      {showAddInChars ? "✕ Cancel" : "+ Add Player"}
                    </button>
                  </div>

                  {/* Inline add-player panel */}
                  {showAddInChars && (
                    <div className="mb-6 bg-void-light border border-void-border rounded-lg p-4 max-w-lg">
                      <AddPlayerPanel
                        selectedGroup={selectedGroup}
                        onAdd={async (...args) => {
                          await handleAddPlayer(...args);
                          setShowAddInChars(false);
                        }}
                        addError={addPlayerError}
                      />
                    </div>
                  )}

                  <CharacterGrid
                    characters={allChars}
                    onCardClick={openCharacter}
                    onRemove={handleRemovePlayer}
                  />
                </div>
              )}

              {/* ── Monsters tab ── */}
              {activeTab === "monsters" && (
                <MonsterPanel groupId={selectedGroup.id} />
              )}

              {/* ── Players tab ── */}
              {activeTab === "players" && (
                <div className="max-w-lg space-y-6">

                  {/* Add player (two-step component) */}
                  <AddPlayerPanel
                    selectedGroup={selectedGroup}
                    onAdd={handleAddPlayer}
                    addError={addPlayerError}
                  />

                  {/* Divider */}
                  <div className="border-t border-void-border/40" />

                  {/* Current members */}
                  <div>
                    <h3 className="font-gothic text-blood-dark text-sm uppercase tracking-wider mb-3">
                      Members
                    </h3>
                    {selectedGroup.members.length === 0 ? (
                      <p className="text-gray-600 text-sm italic">No players yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedGroup.members.map((m) => {
                          const pinnedChar = m.characters[0]; // if character_id set, only 1 char returned
                          return (
                            <div
                              key={m.user_id}
                              className="flex justify-between items-center bg-void-light border border-void-border rounded px-4 py-3"
                            >
                              <div>
                                <span className="text-gray-200 text-sm font-medium">{m.username}</span>
                                {pinnedChar ? (
                                  <span className="text-gray-500 text-xs ml-2">
                                    · {pinnedChar.name ?? "Unnamed"}
                                    {pinnedChar.clan_name && ` (${pinnedChar.clan_name})`}
                                  </span>
                                ) : (
                                  <span className="text-gray-600 text-xs ml-2">
                                    {m.characters.length} {m.characters.length === 1 ? "character" : "characters"}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemovePlayer(m.user_id)}
                                className="text-gray-700 hover:text-blood text-xs transition-colors"
                                title="Remove from group"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Read-only character sheet overlay ── */}
      {(viewChar || loadingChar) && (
        <div className="fixed inset-0 bg-black/80 z-40 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center px-6 py-3 border-b border-void-border bg-void-light shrink-0">
            <span className="font-gothic text-blood text-lg">
              {loadingChar ? "Opening the coffin…" : viewChar?.name}
            </span>
            <button
              onClick={() => setViewChar(null)}
              className="text-gray-500 hover:text-blood transition-colors font-gothic tracking-wider text-sm"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {loadingChar ? (
              <Spinner text="Opening the coffin…" />
            ) : (
              <>
                <CharacterSheet character={viewChar} />
                <div className="max-w-2xl mx-auto mt-6 border-t border-void-border pt-6">
                  <ConditionManager
                    characterId={viewChar?.id}
                    characterName={viewChar?.name}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Dice roller modal ── */}
      {showDice && <DiceRollerModal onClose={() => setShowDice(false)} hunger={0} manualHunger />}

      {/* ── Delete group confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-md w-full">
            <h3 className="font-gothic text-xl text-blood mb-2">Delete Group</h3>
            <p className="text-gray-400 text-sm mb-4">
              Permanently delete <span className="text-gray-200 font-bold">{deleteTarget.name}</span>? Players are not deleted.
            </p>
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Type DELETE to confirm</p>
            <input
              className="vtm-input mb-4"
              placeholder="DELETE"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setDeleteTarget(null); setDeleteText(""); }} className="vtm-btn-secondary flex-1" disabled={deleting}>
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteText !== "DELETE" || deleting}
                className="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded px-4 py-2 text-sm font-gothic tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
