import { useState, useEffect } from "react";
import api from "../../services/api";
import { useToast } from "../../store/toastStore";

const PRESET_CONDITIONS = [
  "Impaired", "Blinded", "Deafened", "Frightened", "Staked",
  "Entranced", "Dominated", "Burning", "Torpor", "Unconscious",
];

const SEVERITY_OPTIONS = ["mild", "moderate", "severe"];

const SEVERITY_BADGE = {
  mild:     "text-yellow-500/80",
  moderate: "text-orange-400",
  severe:   "text-red-400",
};

export default function ConditionManager({ characterId, characterName, onChangeCallback }) {
  const toast = useToast();
  const [conditions, setConditions] = useState([]);
  const [showAdd,    setShowAdd]    = useState(false);
  const [name,       setName]       = useState("");
  const [severity,   setSeverity]   = useState("moderate");
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/api/conditions/character/${characterId}`);
      setConditions(res.data);
    } catch (_) { /* silent */ }
  };

  useEffect(() => { load(); }, [characterId]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/conditions", {
        character_id: characterId,
        name: name.trim(),
        severity,
        notes: notes.trim() || null,
      });
      toast.success(`Condition "${name.trim()}" applied to ${characterName}.`);
      setName(""); setNotes(""); setSeverity("moderate"); setShowAdd(false);
      load();
      if (onChangeCallback) onChangeCallback();
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Failed to add condition.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (id, condName) => {
    try {
      await api.delete(`/api/conditions/${id}`);
      toast.info(`"${condName}" cleared.`);
      load();
      if (onChangeCallback) onChangeCallback();
    } catch (e) {
      toast.error("Failed to clear condition.");
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-gothic text-sm text-gray-400 tracking-wider">Conditions</h4>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="text-xs text-blood hover:text-red-400 transition-colors font-gothic"
        >
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-black/30 border border-void-border rounded-lg p-3 mb-3 space-y-2">
          {/* Preset chips */}
          <div className="flex flex-wrap gap-1">
            {PRESET_CONDITIONS.map((p) => (
              <button
                key={p}
                onClick={() => setName(p)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  name === p
                    ? "border-blood bg-blood/20 text-blood"
                    : "border-void-border text-gray-500 hover:border-gray-500 hover:text-gray-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom name */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Custom condition name…"
            className="w-full bg-void border border-void-border rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood"
          />

          {/* Severity */}
          <div className="flex gap-2">
            {SEVERITY_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`flex-1 text-xs py-1 rounded border capitalize transition-colors ${
                  severity === s
                    ? "border-blood bg-blood/20 text-blood"
                    : "border-void-border text-gray-500 hover:border-gray-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Notes */}
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            className="w-full bg-void border border-void-border rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood"
          />

          <button
            onClick={handleAdd}
            disabled={!name.trim() || saving}
            className="vtm-btn w-full text-sm py-1.5"
          >
            {saving ? "Applying…" : "Apply Condition"}
          </button>
        </div>
      )}

      {/* Active conditions list */}
      {conditions.length === 0 ? (
        <p className="text-gray-700 text-xs italic">No active conditions.</p>
      ) : (
        <div className="space-y-1">
          {conditions.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-black/20 border border-void-border/50 rounded px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className={`font-gothic text-sm ${SEVERITY_BADGE[c.severity]}`}>{c.name}</span>
                <span className="text-gray-700 text-xs capitalize">{c.severity}</span>
                {c.notes && <span className="text-gray-600 text-xs italic truncate max-w-[120px]">{c.notes}</span>}
              </div>
              <button
                onClick={() => handleClear(c.id, c.name)}
                className="text-gray-600 hover:text-gray-300 text-xs transition-colors ml-2"
                title="Clear condition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
