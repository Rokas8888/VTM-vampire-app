import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../services/api";
import CharacterSheet from "../components/character/CharacterSheet";
import Spinner from "../components/shared/Spinner";

const GENERATION_LABEL = {
  childer:  "13th Generation",
  neonate:  "12th Generation",
  ancillae: "11th Generation",
};

// ── Directory character card ───────────────────────────────────────────────────
function DirectoryCard({ char, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-void-light border border-void-border rounded-lg p-5 cursor-pointer hover:border-blood transition-colors flex flex-col gap-3"
    >
      <div>
        <h3 className="font-gothic text-blood text-lg leading-tight truncate">{char.name ?? "Unnamed"}</h3>
        <p className="text-gray-500 text-xs mt-0.5">{char.clan?.name ?? "—"}</p>
      </div>
      <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
        <span>Gen <span className="text-gray-300">{char.generation ? GENERATION_LABEL[char.generation] : "—"}</span></span>
        <span>Humanity <span className="text-gray-300">{char.humanity}</span></span>
        <span>BP <span className="text-gray-300">{char.blood_potency}</span></span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlayerDirectoryPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [chars,   setChars]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Filters — all client-side since dataset is small
  const [search,     setSearch]     = useState("");
  const [clanFilter, setClanFilter] = useState("");
  const [genFilter,  setGenFilter]  = useState("");

  // Read-only sheet modal
  const [viewChar,     setViewChar]     = useState(null);
  const [loadingChar,  setLoadingChar]  = useState(false);

  useEffect(() => {
    api.get("/api/characters/directory")
      .then((res) => { setChars(res.data); setLoading(false); })
      .catch(() => { setError("Failed to load directory."); setLoading(false); });
  }, []);

  const openChar = (id) => {
    setLoadingChar(true);
    api.get(`/api/characters/${id}`)
      .then((res) => { setViewChar(res.data); setLoadingChar(false); })
      .catch(() => setLoadingChar(false));
  };

  // Build clan list for dropdown from current results
  const clans = [...new Set(chars.map((c) => c.clan?.name).filter(Boolean))].sort();

  // Apply filters
  const filtered = chars.filter((c) => {
    const matchSearch = !search     || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchClan   = !clanFilter || c.clan?.name === clanFilter;
    const matchGen    = !genFilter  || c.generation === genFilter;
    return matchSearch && matchClan && matchGen;
  });

  const backPath = user?.role === "gm" || user?.role === "admin" ? "/gm" : "/dashboard";

  return (
    <div className="min-h-screen bg-void text-gray-200">

      {/* Header */}
      <header className="border-b border-void-border bg-void-light px-6 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(backPath)}
              className="text-gray-600 hover:text-blood text-xs font-gothic tracking-wider transition-colors"
            >
              ← Back
            </button>
            <div className="h-4 border-l border-void-border" />
            <h1 className="font-gothic text-blood text-xl tracking-widest">Kindred Directory</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600 text-xs">{user?.username}</span>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="hover:text-blood transition-colors font-gothic tracking-wider text-xs uppercase"
            >
              Leave the Night
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-void border border-void-border rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blood transition-colors w-52"
          />
          <select
            value={clanFilter}
            onChange={(e) => setClanFilter(e.target.value)}
            className="w-44 text-sm py-2"
          >
            <option value="">All Clans</option>
            {clans.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={genFilter}
            onChange={(e) => setGenFilter(e.target.value)}
            className="w-44 text-sm py-2"
          >
            <option value="">All Generations</option>
            <option value="childer">13th — Childer</option>
            <option value="neonate">12th — Neonate</option>
            <option value="ancillae">11th — Ancillae</option>
          </select>
          {(search || clanFilter || genFilter) && (
            <button
              onClick={() => { setSearch(""); setClanFilter(""); setGenFilter(""); }}
              className="text-xs text-gray-600 hover:text-blood transition-colors font-gothic tracking-wider"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-gray-700 text-xs mb-4 font-gothic tracking-wider">
            {filtered.length} {filtered.length === 1 ? "kindred" : "kindred"} found
          </p>
        )}

        {/* Error */}
        {error && <p className="text-blood text-sm mb-4">{error}</p>}

        {/* Grid */}
        {loading ? (
          <Spinner text="Consulting the Masquerade records…" />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="font-gothic text-gray-600 text-lg tracking-wider mb-2">
              {chars.length === 0 ? "No kindred have risen yet." : "No kindred match your search."}
            </p>
            <p className="text-gray-700 text-sm">
              {chars.length === 0
                ? "Characters will appear here once players complete the creation wizard."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((c) => (
              <DirectoryCard key={c.id} char={c} onClick={() => openChar(c.id)} />
            ))}
          </div>
        )}
      </main>

      {/* Read-only character sheet modal */}
      {(viewChar || loadingChar) && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col overflow-hidden">
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
            {loadingChar
              ? <Spinner text="Opening the coffin…" />
              : <CharacterSheet character={viewChar} />
            }
          </div>
        </div>
      )}
    </div>
  );
}
