import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import useWizardStore from "../../store/wizardStore";
import { randomGeneration } from "../../utils/wizardRandomize";

const GENERATIONS = [
  { value: "childer", label: "Childer", gen: "13th", bp: 0, desc: "Newly Embraced, still learning the ways of the night. Your blood is the weakest, but you are fresh and full of potential." },
  { value: "neonate", label: "Neonate", gen: "12th", bp: 1, desc: "You've survived your first years. The elders test you, the Camarilla watches you, but you've earned your place." },
  { value: "ancillae", label: "Ancillae", gen: "11th", bp: 2, desc: "Decades of unlife have hardened you. You have influence, resources, and enemies. The elders treat you as a peer." },
];

export default function Step10Generation({ onBack }) {
  const { data, saveStep, error, setError } = useWizardStore();
  const navigate = useNavigate();

  const [generation, setGeneration] = useState(data.step10?.generation || "neonate");
  const [biography, setBiography] = useState(data.step10?.biography || "");
  const [notes, setNotes] = useState(data.step10?.notes || "");
  const [haven, setHaven] = useState(data.step10?.haven_location || "");
  const [loading, setLoading] = useState(false);

  const selected = GENERATIONS.find((g) => g.value === generation);

  const handleComplete = async () => {
    const ok = await saveStep(10, { generation, biography, notes, haven_location: haven });
    if (!ok) return;

    setLoading(true);
    try {
      await api.post("/api/characters/wizard/complete");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create character");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-gothic text-3xl text-blood">Generation & Review</h2>
        <button
          onClick={() => {
            const r = randomGeneration();
            setGeneration(r.generation);
            if (!biography) setBiography(r.biography);
          }}
          className="text-xs border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors rounded px-3 py-1.5 font-gothic tracking-wider shrink-0"
        >
          ✦ Suggest
        </button>
      </div>
      <p className="text-gray-400 mb-6">How long have you walked the night? Your generation determines your Blood Potency.</p>

      {/* Generation selection */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {GENERATIONS.map((g) => (
          <div
            key={g.value}
            onClick={() => setGeneration(g.value)}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              generation === g.value
                ? "border-blood bg-blood-dark/20"
                : "border-void-border bg-void-light hover:border-gray-500"
            }`}
          >
            <h3 className="font-gothic text-blood mb-1">{g.label}</h3>
            <p className="text-gray-400 text-xs">{g.gen} Generation</p>
            <p className="text-gray-500 text-xs">Blood Potency {g.bp}</p>
          </div>
        ))}
      </div>

      {selected && (
        <div className="bg-void-light border border-void-border rounded p-3 mb-6 text-sm text-gray-400">
          {selected.desc}
        </div>
      )}

      {/* Optional fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Haven Location (optional)</label>
          <input className="vtm-input" placeholder="Where do you sleep during the day?" value={haven} onChange={(e) => setHaven(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Biography (optional)</label>
          <textarea
            className="vtm-input h-24 resize-none"
            placeholder="Your mortal life, your Embrace, what you've done since..."
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Notes (optional)</label>
          <textarea
            className="vtm-input h-16 resize-none"
            placeholder="Anything else worth remembering..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleComplete} disabled={loading} className="vtm-btn">
          {loading ? "Creating..." : "Rise from the Darkness →"}
        </button>
      </div>
    </div>
  );
}
