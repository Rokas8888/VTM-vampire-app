import { useState, useEffect } from "react";
import api from "../../services/api";
import useWizardStore from "../../store/wizardStore";
import { randomClan } from "../../utils/wizardRandomize";

export default function Step2Clan({ onNext, onBack }) {
  const { data, saveStep, error } = useWizardStore();
  const [clans, setClans] = useState([]);
  const [selected, setSelected] = useState(data.step2?.clan_id || null);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    api.get("/api/game-data/clans").then((r) => setClans(r.data));
  }, []);

  const handleNext = async () => {
    const ok = await saveStep(2, { clan_id: selected });
    if (ok) onNext();
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-gothic text-3xl text-blood">Choose Your Clan</h2>
        {clans.length > 0 && (
          <button
            onClick={() => setSelected(randomClan(clans))}
            className="text-xs border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors rounded px-3 py-1.5 font-gothic tracking-wider shrink-0"
          >
            ✦ Suggest
          </button>
        )}
      </div>
      <p className="text-gray-400 mb-6">Your clan defines your disciplines, bane, and place in Kindred society. Click a clan to learn more.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {clans.map((clan) => (
          <div
            key={clan.id}
            onClick={() => setSelected(clan.id)}
            className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
              selected === clan.id
                ? "border-blood bg-blood-dark/20"
                : "border-void-border bg-void-light hover:border-gray-500"
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-gothic text-sm text-gray-200">{clan.name}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setPopup(clan); }}
                className="text-gray-600 hover:text-blood text-xs ml-2"
              >
                ℹ
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-1">
              {clan.disciplines?.map((d) => d.name).join(", ") || "No clan disciplines"}
            </p>
          </div>
        ))}
      </div>

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleNext} disabled={!selected} className="vtm-btn">
          Next: Attributes →
        </button>
      </div>

      {/* Info Popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPopup(null)}>
          <div className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-gothic text-2xl text-blood">{popup.name}</h3>
              <button onClick={() => setPopup(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <p className="text-gray-300 text-sm mb-4">{popup.description}</p>
            {popup.disciplines?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Clan Disciplines</p>
                <p className="text-blood text-sm">{popup.disciplines.map((d) => d.name).join(", ")}</p>
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bane</p>
              <p className="text-gray-300 text-sm">{popup.bane}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Compulsion</p>
              <p className="text-gray-300 text-sm">{popup.compulsion}</p>
            </div>
            <button onClick={() => { setSelected(popup.id); setPopup(null); }} className="vtm-btn w-full mt-6">
              Choose {popup.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
