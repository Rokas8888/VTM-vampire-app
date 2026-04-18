import { useState } from "react";
import useWizardStore from "../../store/wizardStore";

export default function Step8Beliefs({ onNext, onBack }) {
  const { data, saveStep, error } = useWizardStore();
  const [convictions, setConvictions] = useState(data.step7?.convictions || [{ conviction: "", touchstone: "" }]);  // now step7
  const [tenets, setTenets] = useState(data.step7?.tenets || [""]);

  const updateConviction = (i, field, value) => {
    const updated = [...convictions];
    updated[i] = { ...updated[i], [field]: value };
    setConvictions(updated);
  };

  const addConviction = () => {
    if (convictions.length < 3) setConvictions([...convictions, { conviction: "", touchstone: "" }]);
  };

  const removeConviction = (i) => setConvictions(convictions.filter((_, idx) => idx !== i));

  const updateTenet = (i, value) => {
    const updated = [...tenets];
    updated[i] = value;
    setTenets(updated);
  };

  const isValid = convictions.every((c) => c.conviction.trim() && c.touchstone.trim());

  const handleNext = async () => {
    const filteredTenets = tenets.filter((t) => t.trim());
    const ok = await saveStep(7, { convictions, tenets: filteredTenets });  // backend step 7
    if (ok) onNext();
  };

  return (
    <div>
      <h2 className="font-gothic text-3xl text-blood mb-2">Beliefs</h2>
      <p className="text-gray-400 mb-6">What keeps you human? Convictions are the moral lines you won't cross. Touchstones are the people who anchor you.</p>

      {/* Convictions */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-gothic text-blood text-sm uppercase tracking-wider">Convictions & Touchstones</h3>
          {convictions.length < 3 && (
            <button onClick={addConviction} className="text-blood text-xs hover:text-blood-light">+ Add</button>
          )}
        </div>
        <p className="text-gray-500 text-xs mb-4">Each conviction is paired with a touchstone — a mortal who represents that belief to you.</p>

        {convictions.map((c, i) => (
          <div key={i} className="bg-void-light border border-void-border rounded-lg p-4 mb-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400 text-xs font-gothic uppercase">Conviction {i + 1}</span>
              {convictions.length > 1 && (
                <button onClick={() => removeConviction(i)} className="text-gray-600 hover:text-blood text-xs">Remove</button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Conviction — a moral line you won't cross</label>
                <input
                  className="vtm-input"
                  placeholder="e.g. I will never harm an innocent child"
                  value={c.conviction}
                  onChange={(e) => updateConviction(i, "conviction", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Touchstone — a person who embodies this</label>
                <input
                  className="vtm-input"
                  placeholder="e.g. My sister Maria, a teacher"
                  value={c.touchstone}
                  onChange={(e) => updateConviction(i, "touchstone", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tenets */}
      <div>
        <h3 className="font-gothic text-blood text-sm uppercase tracking-wider mb-3">Chronicle Tenets</h3>
        <p className="text-gray-500 text-xs mb-4">The rules your group has agreed to follow. Usually set by the Storyteller — add them here if you know them.</p>
        {tenets.map((t, i) => (
          <input
            key={i}
            className="vtm-input mb-2"
            placeholder={`Tenet ${i + 1} (optional)`}
            value={t}
            onChange={(e) => updateTenet(i, e.target.value)}
          />
        ))}
        <button onClick={() => setTenets([...tenets, ""])} className="text-blood text-xs hover:text-blood-light">+ Add tenet</button>
      </div>

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleNext} disabled={!isValid} className="vtm-btn">
          Next: Humanity →
        </button>
      </div>
    </div>
  );
}
