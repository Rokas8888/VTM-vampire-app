import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useWizardStore from "../store/wizardStore";
import api from "../services/api";
import CharacterSheet from "../components/character/CharacterSheet";
import DiceRollerModal from "../components/shared/DiceRollerModal";
import HelpModal from "../components/shared/HelpModal";
import Spinner from "../components/shared/Spinner";
import { clanBgStyle, clanCardStyle } from "../utils/clanImages";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

const GENERATION_LABEL = {
  childer:  "13th — Childer",
  neonate:  "12th — Neonate",
  ancillae: "11th — Ancillae",
};


// ── Character Card ────────────────────────────────────────────────────────────
function CharacterCard({ char, onOpen, onDelete, isRetainer = false, ownerName = null, retainerLevel = null }) {
  return (
    <div
      className={`rounded-lg p-5 flex flex-col justify-between transition-colors ${
        isRetainer
          ? "border-2 border-blue-700/60 hover:border-blue-500/80 bg-blue-950/10"
          : "border border-void-border hover:border-blood/60"
      }`}
      style={{ minHeight: "260px", ...(isRetainer ? {} : clanCardStyle(char.clan?.name)) }}
    >
      <div>
        {isRetainer && (
          <div className="flex items-center gap-2 mb-1">
            <p className="text-blue-500 text-[10px] uppercase tracking-widest">Retainer</p>
            {retainerLevel && (
              <span className="text-blue-700 text-[10px]">{"●".repeat(retainerLevel)}</span>
            )}
          </div>
        )}
        <h3 className={`font-gothic text-xl mb-1 truncate ${isRetainer ? "text-blue-300" : "text-blood"}`}>{char.name}</h3>
        <p className="text-gray-500 text-xs mb-3">{char.concept}</p>
        {isRetainer && ownerName && (
          <p className="text-gray-600 text-xs">Owner: <span className="text-gray-400">{ownerName}</span></p>
        )}
        {!isRetainer && <>
          <p className="text-gray-400 text-sm">{char.clan?.name ?? "—"}</p>
          <p className="text-gray-600 text-xs mt-1">{GENERATION_LABEL[char.generation] ?? "—"}</p>
        </>}
      </div>
      {!isRetainer && (
        <div className="flex gap-4 my-4 text-xs text-gray-500">
          <span>Humanity <span className="text-gray-300">{char.humanity}</span></span>
          <span>BP <span className="text-gray-300">{char.blood_potency}</span></span>
          <span>XP <span className="text-gray-300">{char.total_xp - char.spent_xp}</span></span>
        </div>
      )}
      <div className="flex gap-2 mt-auto pt-3">
        <button onClick={() => onOpen(char.id)} className={`flex-1 text-sm py-1 rounded border transition-colors ${isRetainer ? "border-blue-700 text-blue-300 hover:bg-blue-900/30" : "vtm-btn"}`}>
          Open
        </button>
        <button
          onClick={() => onDelete(char)}
          className="border border-void-border hover:border-blood text-gray-600 hover:text-blood rounded px-3 text-sm transition-colors"
          title="Delete"
        >🗑</button>
      </div>
    </div>
  );
}

// ── New Character Card ────────────────────────────────────────────────────────
function NewCharacterCard({ onClick }) {
  return (
    <div
      onClick={onClick}
      className="border-2 border-dashed border-void-border hover:border-blood rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors group"
      style={{ minHeight: "260px" }}
    >
      <span className="text-4xl text-gray-700 group-hover:text-blood transition-colors mb-2">+</span>
      <span className="text-gray-600 group-hover:text-gray-400 text-sm font-gothic tracking-wider transition-colors">
        New Character
      </span>
    </div>
  );
}


// ── Main DashboardPage ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { resetDraft } = useWizardStore();
  const navigate = useNavigate();

  // character list
  const [characters, setCharacters] = useState([]);
  const [retainerChars, setRetainerChars] = useState([]);
  const [retainerParents, setRetainerParents] = useState({}); // id → full character (for merit level lookup)
  const [retainerModal, setRetainerModal] = useState(null); // full retainer character object
  const [retainerSheetEdit, setRetainerSheetEdit] = useState(false); // controls +/- buttons
  const [retainerEditMode, setRetainerEditMode] = useState(false);
  const [retainerEditForm, setRetainerEditForm] = useState({});
  const [gameDataForRetainer, setGameDataForRetainer] = useState({ clans: [], predatorTypes: [] });
  const [loading, setLoading]       = useState(true);

  // detail view
  const [selected, setSelected]         = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // which action panel is open
  const [activePanel, setActivePanel] = useState(null); // "xp" | null
  const [xpMode, setXpMode] = useState("add"); // "add" | "remove"

  // temp dots mode
  const [tempMode, setTempMode] = useState(false);

  // edit mode
  const [editMode, setEditMode]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [editError, setEditError] = useState(null);

  // improve mode
  const [improveMode, setImproveMode]   = useState(false);
  const [improveError, setImproveError] = useState(null);

  // xp add
  const [xpAmount, setXpAmount] = useState("");
  const [xpError, setXpError]   = useState(null);

  // dice roller
  const [showDice,      setShowDice]      = useState(false);

  // help modal
  const [showHelp, setShowHelp] = useState(false);
  const [sessionHunger, setSessionHunger] = useState(0);

  // live session groups
  const [myGroups, setMyGroups] = useState([]);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteText, setDeleteText]     = useState("");
  const [deleting, setDeleting]         = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openPanel = (name) => {
    setActivePanel((prev) => (prev === name ? null : name));
    setXpError(null); setXpAmount("");
  };

  const closePanel = () => setActivePanel(null);

  const resetAllPanels = () => {
    setActivePanel(null);
    setImproveMode(false);
    setImproveError(null);
    setEditMode(false);
    setXpAmount(""); setXpError(null);
    setTempMode(false);
  };

  // ── Load character list + groups ──────────────────────────────────────────
  useEffect(() => {
    api.get("/api/characters/mine")
      .then((res) => { setCharacters(res.data); setLoading(false); })
      .catch(() => setLoading(false));
    api.get("/api/characters/my-retainers")
      .then(async (res) => {
        setRetainerChars(res.data);
        // Fetch parent characters to get Retainer merit levels
        const parentIds = [...new Set(res.data.map((r) => r.parent_character_id).filter(Boolean))];
        const parents = {};
        await Promise.all(parentIds.map(async (pid) => {
          try {
            const r = await api.get(`/api/characters/${pid}`);
            parents[pid] = r.data;
          } catch {}
        }));
        setRetainerParents(parents);
      })
      .catch(() => {});
    api.get("/api/groups/mine")
      .then((res) => setMyGroups(res.data))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    if (selected) {
      const msg =
        "Return to the daysleep?\n\n" +
        "Your session stats (health, hunger, humanity) are auto-saved every few seconds.\n\n" +
        "If you have unsaved changes or pending stains, click 'End Session' on the character sheet first.";
      if (!window.confirm(msg)) return;
    }
    logout();
    navigate("/login");
  };

  // ── Open / close character ────────────────────────────────────────────────
  const openCharacter = (id) => {
    resetAllPanels();
    setLoadingDetail(true);
    api.get(`/api/characters/${id}`)
      .then((res) => {
        setSelected(res.data);
        setSessionHunger(res.data.current_hunger ?? 0);
        setLoadingDetail(false);
      })
      .catch(() => setLoadingDetail(false));
  };

  const closeDetail = () => {
    setSelected(null);
    resetAllPanels();
  };

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const openEdit = () => {
    resetAllPanels();
    setEditForm({
      ambition:          selected.ambition          || "",
      desire:            selected.desire            || "",
      biography:         selected.biography         || "",
      haven_location:    selected.haven_location    || "",
      haven_description: selected.haven_description || "",
      notes:             selected.notes             || "",
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true); setEditError(null);
    try {
      const res = await api.put(`/api/characters/${selected.id}`, editForm);
      setSelected(res.data);
      setEditMode(false);
    } catch (err) {
      setEditError(err.response?.data?.detail || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── XP add / remove ───────────────────────────────────────────────────────
  const handleAddXp = async () => {
    const amount = parseInt(xpAmount, 10);
    if (!amount || amount <= 0) { setXpError("Enter a positive number."); return; }
    setXpError(null);
    try {
      const res = await api.post(`/api/characters/${selected.id}/xp`, { amount });
      setSelected(res.data);
      setCharacters((prev) => prev.map((c) =>
        c.id === selected.id ? { ...c, total_xp: res.data.total_xp, spent_xp: res.data.spent_xp } : c
      ));
      setXpAmount("");
      closePanel();
    } catch (err) {
      setXpError(err.response?.data?.detail || "Failed to add XP.");
    }
  };

  const handleRemoveXp = async () => {
    const amount = parseInt(xpAmount, 10);
    if (!amount || amount <= 0) { setXpError("Enter a positive number."); return; }
    setXpError(null);
    try {
      const res = await api.post(`/api/characters/${selected.id}/xp/remove`, { amount });
      setSelected(res.data);
      setCharacters((prev) => prev.map((c) =>
        c.id === selected.id ? { ...c, total_xp: res.data.total_xp, spent_xp: res.data.spent_xp } : c
      ));
      setXpAmount("");
      closePanel();
    } catch (err) {
      setXpError(err.response?.data?.detail || "Failed to remove XP.");
    }
  };

  // ── Temp dots ─────────────────────────────────────────────────────────────
  const handleSetTempDots = async (tempDots) => {
    try {
      const res = await api.put(`/api/characters/${selected.id}/temp-dots`, { temp_dots: tempDots });
      setSelected(res.data);
    } catch (err) {
      console.error("Failed to set temp dots", err);
    }
  };

  // ── Session save ──────────────────────────────────────────────────────────
  const handleSaveSession = async (sessionData) => {
    try {
      const res = await api.put(`/api/characters/${selected.id}/session`, sessionData);
      setSelected(res.data);
    } catch { /* silently ignore — CharacterSheet manages dirty state */ }
  };

  // ── Improve / Unimprove trait ─────────────────────────────────────────────
  const handleImprove = async (traitType, traitName, extra = {}) => {
    setImproveError(null);
    try {
      const res = await api.post(`/api/characters/${selected.id}/improve`, {
        trait_type: traitType,
        trait_name: traitName || undefined,
        ...extra,
        free: selected.is_retainer || false,
      });
      setSelected(res.data);
      setCharacters((prev) => prev.map((c) =>
        c.id === selected.id ? { ...c, total_xp: res.data.total_xp, spent_xp: res.data.spent_xp } : c
      ));
    } catch (err) {
      setImproveError(err.response?.data?.detail || "Failed to improve trait.");
    }
  };

  const handleUnimprove = async (traitType, traitName, extra = {}) => {
    setImproveError(null);
    try {
      const res = await api.post(`/api/characters/${selected.id}/unimprove`, {
        trait_type: traitType,
        trait_name: traitName || undefined,
        ...extra,
      });
      setSelected(res.data);
      setCharacters((prev) => prev.map((c) =>
        c.id === selected.id ? { ...c, total_xp: res.data.total_xp, spent_xp: res.data.spent_xp } : c
      ));
    } catch (err) {
      setImproveError(err.response?.data?.detail || "Failed to undo.");
    }
  };

  // ── Weapon handlers ───────────────────────────────────────────────────────
  const handleAddWeapon = async (weaponData) => {
    const res = await api.post(`/api/characters/${selected.id}/weapons`, weaponData);
    setSelected(res.data);
  };

  const handleDeleteWeapon = async (weaponId) => {
    try {
      const res = await api.delete(`/api/characters/${selected.id}/weapons/${weaponId}`);
      setSelected(res.data);
    } catch { /* silently ignore */ }
  };

  // ── Possession handlers ───────────────────────────────────────────────────
  const handleAddPossession = async (possessionData) => {
    const res = await api.post(`/api/characters/${selected.id}/possessions`, possessionData);
    setSelected(res.data);
  };

  const handleDeletePossession = async (possessionId) => {
    try {
      const res = await api.delete(`/api/characters/${selected.id}/possessions/${possessionId}`);
      setSelected(res.data);
    } catch { /* silently ignore */ }
  };

  // ── Delete character ──────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    try {
      await api.delete(`/api/characters/${deleteTarget.id}`);
      setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setRetainerChars((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      // If the deleted character was open, close detail view
      if (selected?.id === deleteTarget.id) closeDetail();
      setDeleteTarget(null);
      setDeleteText("");
    } catch { /* silently ignore */ }
    finally { setDeleting(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const availableXp = selected ? selected.total_xp - selected.spent_xp : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    <div
      className="min-h-screen text-gray-200"
      style={selected
        ? clanBgStyle(selected.clan?.name, 0.94)
        : {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.93), rgba(0,0,0,0.93)), url('/assets/players-dashboard.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "scroll",
          }
      }
    >

      {/* Static noise overlay — only shown on the character list view */}
      {!selected && (
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: NOISE_SVG, backgroundRepeat: "repeat", opacity: 0.07,
        }} />
      )}

      {/* ── Top navigation bar ── */}
      <div className="border-b border-void-border bg-void-light px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-2">
          <h1
            className="font-gothic text-lg sm:text-2xl text-blood cursor-pointer hover:text-blood-light transition-colors shrink-0"
            onClick={closeDetail}
            title="Back to characters"
          >
            Vampire Scriptorium
          </h1>
          <div className="flex flex-wrap justify-end items-center gap-2 sm:gap-4 text-sm text-gray-500">
            <button onClick={() => navigate("/directory")} className="hover:text-blood transition-colors font-gothic tracking-wider text-xs uppercase">
              Directory
            </button>
            {myGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => window.open(`/session/${g.id}`, "_blank")}
                className="hover:text-blood transition-colors font-gothic tracking-wider text-xs uppercase flex items-center gap-1"
                title={`Live session for ${g.name}`}
              >
                ⚔ {g.name}
              </button>
            ))}
            <span className="text-gray-600">{user?.username}</span>
            <button
              onClick={() => setShowHelp(true)}
              className="px-3 py-1.5 rounded text-xs font-gothic tracking-wider border border-void-border text-gray-400 hover:border-blood hover:text-blood transition-colors"
              title="Help"
            >
              ? Help
            </button>
            <button onClick={handleLogout} className="hover:text-blood transition-colors font-gothic tracking-wider text-xs uppercase">
              Leave the Night
            </button>
          </div>
        </div>
      </div>

      {/* ── Character action bar (only when a character is open) ── */}
      {selected && !editMode && (
        <div className="border-b border-void-border bg-void px-6 py-2">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-1">

            {/* Back */}
            <button
              onClick={closeDetail}
              className="text-gray-600 hover:text-blood text-xs font-gothic tracking-wider transition-colors mr-3"
            >
              ← All Characters
            </button>

            <div className="h-4 border-l border-void-border mr-3" />

            {/* XP counter — hidden for retainers */}
            {!selected.is_retainer && (
              <span className="text-xs text-gray-500 mr-1">
                XP: <span className="text-blood font-bold">{availableXp}</span>
                <span className="text-gray-700"> / {selected.total_xp}</span>
              </span>
            )}

            <div className="h-4 border-l border-void-border mx-1" />

            {/* XP + Improve — hidden for retainers */}
            {!selected.is_retainer && <>
              <button
                onClick={() => { openPanel("xp"); setXpMode("add"); }}
                className={`px-2 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
                  activePanel === "xp"
                    ? "border-blood text-blood bg-blood-dark/20"
                    : "border-void-border text-gray-500 hover:border-blood hover:text-blood"
                }`}
                title="Add or remove experience points"
              >XP</button>

              <div className="h-4 border-l border-void-border mx-1" />

              <button
                onClick={() => { setImproveMode(!improveMode); setImproveError(null); closePanel(); setTempMode(false); }}
                className={`px-2 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
                  improveMode
                    ? "border-blood text-blood bg-blood-dark/20"
                    : "border-void-border text-gray-500 hover:border-blood hover:text-blood"
                }`}
                title="Spend XP to raise attributes and skills"
              >{improveMode ? "✓ Improving…" : "Improve Stats"}</button>

              <div className="h-4 border-l border-void-border mx-1" />
            </>}

            {/* Temporary Dots */}
            <button
              onClick={() => { setTempMode(!tempMode); setImproveMode(false); closePanel(); }}
              className={`px-2 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
                tempMode
                  ? "border-blue-500 text-blue-400 bg-blue-900/20"
                  : "border-void-border text-gray-500 hover:border-blue-500 hover:text-blue-400"
              }`}
              title="Add/remove temporary dots (shown in blue)"
            >
              {tempMode ? "✓ Temp Dots" : "Temp Dots"}
            </button>

            <div className="h-4 border-l border-void-border mx-1" />

            {/* Edit Ambition & Desire */}
            <button
              onClick={openEdit}
              className="px-2 py-1 rounded text-xs font-gothic tracking-wider border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors"
            >
              Edit Ambition & Desire
            </button>

            {/* Dice Roller — far right, distinctive solid design */}
            <button
              onClick={() => setShowDice((v) => !v)}
              className={`ml-auto px-3 py-1.5 rounded text-xs font-gothic tracking-wider transition-all ${
                showDice
                  ? "bg-blood text-white shadow-lg shadow-blood/40 ring-1 ring-blood"
                  : "bg-blood/80 hover:bg-blood text-white hover:shadow-md hover:shadow-blood/30"
              }`}
              title={showDice ? "Close dice roller" : "Open dice roller"}
            >
              ⚄ Dice Roller
            </button>
          </div>

          {/* Inline error for improve mode */}
          {improveMode && improveError && (
            <div className="max-w-5xl mx-auto mt-1">
              <p className="text-blood text-xs">{improveError}</p>
            </div>
          )}
        </div>
      )}

      <div className="p-6">

        {/* ── XP panel ── */}
        {activePanel === "xp" && selected && (
          <div className="max-w-5xl mx-auto mb-4">
            <div className="bg-void-light border border-void-border rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Add / Remove tabs */}
                <div className="flex gap-1">
                  <button
                    onClick={() => { setXpMode("add"); setXpError(null); setXpAmount(""); }}
                    className={`px-3 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
                      xpMode === "add"
                        ? "border-blood text-blood bg-blood-dark/20"
                        : "border-void-border text-gray-500 hover:border-gray-500"
                    }`}
                  >+ Add XP</button>
                  <button
                    onClick={() => { setXpMode("remove"); setXpError(null); setXpAmount(""); }}
                    className={`px-3 py-1 rounded text-xs font-gothic tracking-wider border transition-colors ${
                      xpMode === "remove"
                        ? "border-blood text-blood bg-blood-dark/20"
                        : "border-void-border text-gray-500 hover:border-gray-500"
                    }`}
                  >− Remove XP</button>
                </div>
                <input
                  type="number" min="1"
                  className="vtm-input w-24 text-center"
                  placeholder="Amount"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (xpMode === "add" ? handleAddXp() : handleRemoveXp())}
                  autoFocus
                />
                <button
                  onClick={xpMode === "add" ? handleAddXp : handleRemoveXp}
                  className="vtm-btn py-1 px-4 text-sm"
                >
                  {xpMode === "add" ? "Award XP" : "Remove XP"}
                </button>
                <button onClick={closePanel} className="text-gray-600 hover:text-gray-400 text-sm">Cancel</button>
                {xpError && <span className="text-blood text-sm">{xpError}</span>}
              </div>
              {xpMode === "remove" && (
                <p className="text-gray-600 text-xs mt-2">Removes unspent XP only — cannot undo spent XP this way.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Dice Roller sidebar — fixed to right edge, follows scroll ── */}
        {showDice && (
          <DiceRollerModal
            hunger={sessionHunger}
            onClose={() => setShowDice(false)}
            sidebar={true}
          />
        )}

        {/* ── Delete confirmation modal ── */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-md w-full">
              <h3 className="font-gothic text-xl text-blood mb-2">Delete Character</h3>
              <p className="text-gray-400 text-sm mb-4">
                This will permanently delete <span className="text-gray-200 font-bold">{deleteTarget.name}</span>.
                This cannot be undone.
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
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteText(""); }}
                  className="vtm-btn-secondary flex-1"
                  disabled={deleting}
                >Cancel</button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteText !== "DELETE" || deleting}
                  className="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded px-4 py-2 text-sm font-gothic tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting…" : "Delete Forever"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        {loading ? (
          <Spinner text="Awakening from the daysleep…" />

        ) : loadingDetail ? (
          <Spinner text="Opening the coffin…" />

        ) : selected && editMode ? (
          /* ── Edit Ambition & Desire ── */
          <div className="max-w-3xl mx-auto">
            <div className="bg-void-light border border-void-border rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-gothic text-2xl text-blood">Edit Ambition & Desire</h2>
                <span className="text-gray-600 text-xs font-gothic">{selected.name}</span>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Ambition</label>
                  <input
                    className="vtm-input"
                    placeholder="What drives you above all else?"
                    value={editForm.ambition}
                    onChange={(e) => setEditForm({ ...editForm, ambition: e.target.value })}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Desire</label>
                  <input
                    className="vtm-input"
                    placeholder="What do you want right now?"
                    value={editForm.desire}
                    onChange={(e) => setEditForm({ ...editForm, desire: e.target.value })}
                  />
                </div>
                <div className="border-t border-void-border/40 pt-4">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Biography & Haven</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Biography</label>
                  <textarea
                    className="vtm-input h-32"
                    style={{ resize: "vertical" }}
                    placeholder="Your mortal life, your Embrace, what you've done since…"
                    value={editForm.biography}
                    onChange={(e) => setEditForm({ ...editForm, biography: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Haven Location</label>
                  <input
                    className="vtm-input"
                    placeholder="Where do you sleep during the day?"
                    value={editForm.haven_location}
                    onChange={(e) => setEditForm({ ...editForm, haven_location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Haven Description</label>
                  <textarea
                    className="vtm-input h-20"
                    style={{ resize: "vertical" }}
                    placeholder="Describe your haven…"
                    value={editForm.haven_description}
                    onChange={(e) => setEditForm({ ...editForm, haven_description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                  <textarea
                    className="vtm-input h-24"
                    style={{ resize: "vertical" }}
                    placeholder="Anything else worth remembering…"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
              </div>
              {editError && <p className="text-blood mt-4 text-sm">{editError}</p>}
              <div className="mt-6 flex justify-between">
                <button onClick={() => setEditMode(false)} className="vtm-btn-secondary" disabled={saving}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className="vtm-btn">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

        ) : selected ? (
          /* ── Character sheet ── */
          <CharacterSheet
            character={selected}
            onImprove={selected.is_retainer ? handleImprove : (improveMode ? handleImprove : undefined)}
            onUnimprove={selected.is_retainer ? handleUnimprove : (improveMode ? handleUnimprove : undefined)}
            freeEdit={selected.is_retainer}
            tempMode={tempMode}
            onSetTempDots={handleSetTempDots}
            onSaveSession={handleSaveSession}
            onHungerChange={setSessionHunger}
            onAddWeapon={handleAddWeapon}
            onDeleteWeapon={handleDeleteWeapon}
            onAddPossession={handleAddPossession}
            onDeletePossession={handleDeletePossession}
            onCharacterUpdate={(updated) => {
              setSelected(updated);
              setCharacters((prev) => prev.map((c) =>
                c.id === updated.id ? { ...c, total_xp: updated.total_xp, spent_xp: updated.spent_xp } : c
              ));
            }}
            onAddPredatorType={selected.is_retainer ? undefined : () => navigate("/wizard", { state: { addPredatorMode: true, characterId: selected.id } })}
            onAddSpecialty={async (skillName, specialtyName) => {
              const res = await api.post(`/api/characters/${selected.id}/specialties`, { skill_name: skillName, specialty_name: specialtyName });
              setSelected(res.data);
            }}
            onDeleteSpecialty={async (skillName, specialtyName) => {
              const res = await api.delete(`/api/characters/${selected.id}/specialties`, { params: { skill_name: skillName, specialty_name: specialtyName } });
              setSelected(res.data);
            }}
            onOpenRetainer={async (id) => {
              const [charRes, clansRes, predRes] = await Promise.all([
                api.get(`/api/characters/${id}`),
                api.get("/api/game-data/clans"),
                api.get("/api/game-data/predator-types"),
              ]);
              setRetainerModal(charRes.data);
              setRetainerEditMode(false);
              setGameDataForRetainer({ clans: clansRes.data, predatorTypes: predRes.data });
            }}
            onClaimFreePower={async (powerId) => {
              try {
                const res = await api.post(`/api/characters/${selected.id}/claim-predator-power`, { power_id: powerId });
                setSelected(res.data);
              } catch (e) {
                console.error("Failed to claim free power", e);
              }
            }}
          />

        ) : (
          /* ── Character grid ── */
          <div className="max-w-5xl mx-auto">
            {characters.length === 0 && (
              <p className="text-gray-600 font-gothic text-center mb-8 tracking-wider">
                No characters yet. Create your first vampire.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {characters.map((char) => (
                <CharacterCard
                  key={char.id}
                  char={char}
                  onOpen={openCharacter}
                  onDelete={(c) => { setDeleteTarget(c); setDeleteText(""); }}
                />
              ))}
              {retainerChars.map((r) => {
                const owner = retainerParents[r.parent_character_id];
                return (
                  <CharacterCard
                    key={`retainer-${r.id}`}
                    char={r}
                    isRetainer
                    ownerName={owner?.name ?? null}
                    retainerLevel={r.retainer_level ?? null}
                    onOpen={async (id) => {
                      const [charRes, clansRes, predRes] = await Promise.all([
                        api.get(`/api/characters/${id}`),
                        api.get("/api/game-data/clans"),
                        api.get("/api/game-data/predator-types"),
                      ]);
                      setRetainerModal(charRes.data);
                      setRetainerSheetEdit(false);
                      setRetainerEditMode(false);
                      setGameDataForRetainer({ clans: clansRes.data, predatorTypes: predRes.data });
                    }}
                    onDelete={(c) => { setDeleteTarget(c); setDeleteText(""); }}
                  />
                );
              })}
              <NewCharacterCard onClick={async () => { await resetDraft(); navigate("/wizard", { state: { isNew: true } }); }} />
            </div>
          </div>
        )}

      </div>
    </div>

    {/* ── Retainer Modal ── */}
    {retainerModal && (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setRetainerModal(null)}>
        <div className="relative w-full max-w-5xl my-8 border-2 border-blue-700 rounded-xl bg-gray-950" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-3 border-b border-blue-800/50">
            <p className="font-gothic text-blue-300 tracking-widest uppercase text-sm">Retainer — {retainerModal.name}</p>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setRetainerSheetEdit((v) => !v)}
                className={`text-xs border rounded px-2 py-1 transition-colors ${retainerSheetEdit ? "border-blood text-blood" : "border-blue-800 text-blue-400 hover:text-blue-200"}`}
              >{retainerSheetEdit ? "✓ Done Editing" : "Edit Stats"}</button>
              <button
                onClick={() => { setRetainerEditMode((v) => !v); setRetainerEditForm({ name: retainerModal.name, concept: retainerModal.concept || "", ambition: retainerModal.ambition || "", desire: retainerModal.desire || "", clan_id: retainerModal.clan?.id || "", predator_type_id: retainerModal.predator_type?.id || "", generation: retainerModal.generation || "" }); }}
                className="text-xs border border-blue-800 text-blue-400 hover:text-blue-200 rounded px-2 py-1 transition-colors"
              >{retainerEditMode ? "✕ Cancel" : "Edit Info"}</button>
              <button onClick={() => setRetainerModal(null)} className="text-gray-600 hover:text-gray-300 text-lg">✕</button>
            </div>
          </div>

          {retainerEditMode && (
            <div className="px-6 py-4 border-b border-blue-800/30 bg-blue-950/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[["Name", "name"], ["Concept", "concept"], ["Ambition", "ambition"], ["Desire", "desire"]].map(([label, key]) => (
                <div key={key}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <input value={retainerEditForm[key] || ""} onChange={(e) => setRetainerEditForm((f) => ({ ...f, [key]: e.target.value }))} className="vtm-input text-sm w-full" />
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500 mb-1">Clan</p>
                <select value={retainerEditForm.clan_id || ""} onChange={(e) => setRetainerEditForm((f) => ({ ...f, clan_id: e.target.value }))} className="vtm-input text-sm w-full">
                  <option value="">— None —</option>
                  {gameDataForRetainer.clans.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Predator Type</p>
                <select value={retainerEditForm.predator_type_id || ""} onChange={(e) => setRetainerEditForm((f) => ({ ...f, predator_type_id: e.target.value }))} className="vtm-input text-sm w-full">
                  <option value="">— None —</option>
                  {gameDataForRetainer.predatorTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Generation</p>
                <select value={retainerEditForm.generation || ""} onChange={(e) => setRetainerEditForm((f) => ({ ...f, generation: e.target.value }))} className="vtm-input text-sm w-full">
                  <option value="">— None —</option>
                  <option value="childer">Childer (13th)</option>
                  <option value="neonate">Neonate (12th)</option>
                  <option value="ancillae">Ancillae (11th)</option>
                </select>
              </div>
              <div className="col-span-full flex justify-end mt-1">
                <button
                  onClick={async () => {
                    const body = { name: retainerEditForm.name, concept: retainerEditForm.concept || null, ambition: retainerEditForm.ambition || null, desire: retainerEditForm.desire || null, clan_id: retainerEditForm.clan_id ? Number(retainerEditForm.clan_id) : null, predator_type_id: retainerEditForm.predator_type_id ? Number(retainerEditForm.predator_type_id) : null, generation: retainerEditForm.generation || null };
                    const res = await api.put(`/api/characters/${retainerModal.id}`, body);
                    setRetainerModal(res.data);
                    setRetainerEditMode(false);
                  }}
                  className="vtm-btn text-sm py-1 px-4"
                >Save</button>
              </div>
            </div>
          )}
          <div className="p-6">
            <CharacterSheet
              character={retainerModal}
              freeEdit
              onImprove={retainerSheetEdit ? async (traitType, traitName, extra = {}) => {
                const res = await api.post(`/api/characters/${retainerModal.id}/improve`, { trait_type: traitType, trait_name: traitName || undefined, ...extra, free: true });
                setRetainerModal(res.data);
              } : undefined}
              onUnimprove={retainerSheetEdit ? async (traitType, traitName, extra = {}) => {
                const res = await api.post(`/api/characters/${retainerModal.id}/unimprove`, { trait_type: traitType, trait_name: traitName || undefined, ...extra });
                setRetainerModal(res.data);
              } : undefined}
              onCharacterUpdate={(updated) => setRetainerModal(updated)}
              onClaimFreePower={async (powerId) => {
                try {
                  const res = await api.post(`/api/characters/${retainerModal.id}/claim-predator-power`, { power_id: powerId });
                  setRetainerModal(res.data);
                } catch (e) { console.error("Failed to claim power", e); }
              }}
              onAddWeapon={async (w) => { const res = await api.post(`/api/characters/${retainerModal.id}/weapons`, w); setRetainerModal(res.data); }}
              onDeleteWeapon={async (id) => { const res = await api.delete(`/api/characters/${retainerModal.id}/weapons/${id}`); setRetainerModal(res.data); }}
              onAddPossession={async (p) => { const res = await api.post(`/api/characters/${retainerModal.id}/possessions`, p); setRetainerModal(res.data); }}
              onDeletePossession={async (id) => { const res = await api.delete(`/api/characters/${retainerModal.id}/possessions/${id}`); setRetainerModal(res.data); }}
            />
          </div>
        </div>
      </div>
    )}
      {/* ── Help modal ── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}
