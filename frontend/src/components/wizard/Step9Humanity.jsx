import { useState } from "react";
import useWizardStore from "../../store/wizardStore";

export default function Step9Humanity({ onNext, onBack }) {
  const { data, saveStep, error } = useWizardStore();
  const [humanity, setHumanity] = useState(data.step8?.humanity || 7);  // now step8

  const handleNext = async () => {
    const ok = await saveStep(8, { humanity });  // backend step 8
    if (ok) onNext();
  };

  const getColor = (h) => {
    if (h >= 8) return "text-green-400";
    if (h >= 5) return "text-yellow-400";
    if (h >= 3) return "text-orange-400";
    return "text-blood";
  };

  const getLabel = (h) => {
    if (h === 10) return "Saintly";
    if (h >= 8) return "Virtuous";
    if (h >= 6) return "Normal";
    if (h >= 4) return "Troubled";
    if (h >= 2) return "Monstrous";
    return "Near the Beast";
  };

  return (
    <div>
      <h2 className="font-gothic text-3xl text-blood mb-2">Humanity</h2>
      <p className="text-gray-400 mb-6">
        Humanity measures how close you remain to your mortal self. High Humanity means you still feel, still care.
        Low Humanity means the Beast is winning.
      </p>

      <div className="bg-void-light border border-void-border rounded-lg p-8 text-center mb-6">
        <div className={`font-gothic text-7xl mb-2 ${getColor(humanity)}`}>{humanity}</div>
        <div className={`font-gothic text-lg ${getColor(humanity)}`}>{getLabel(humanity)}</div>

        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
            <button
              key={v}
              onClick={() => setHumanity(v)}
              className={`w-8 h-8 rounded-full border font-gothic text-sm transition-all ${
                v <= humanity
                  ? "bg-blood border-blood text-white"
                  : "border-void-border text-gray-600 hover:border-gray-400"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-void-light border border-void-border rounded-lg p-4 text-sm text-gray-400">
        <p className="mb-2"><span className="text-blood font-gothic">Base:</span> Most vampires start at Humanity 7.</p>
        <p className="mb-2"><span className="text-blood font-gothic">Predator Type:</span> Some predator types modify this — check your predator type's description.</p>
        <p><span className="text-blood font-gothic">Note:</span> Humanity can only go down in play — choose carefully, but honestly.</p>
      </div>

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleNext} className="vtm-btn">
          Next: Generation & Review →
        </button>
      </div>
    </div>
  );
}
