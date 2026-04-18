import { useState } from "react";
import useWizardStore from "../../store/wizardStore";

const ATTRIBUTES = {
  Physical: ["Strength", "Dexterity", "Stamina"],
  Social:   ["Charisma", "Manipulation", "Composure"],
  Mental:   ["Intelligence", "Wits", "Resolve"],
};

const ATTR_DESCRIPTIONS = {
  Strength:     "Raw physical power",
  Dexterity:    "Speed and coordination",
  Stamina:      "Endurance and toughness",
  Charisma:     "Personal magnetism",
  Manipulation: "Getting what you want",
  Composure:    "Staying calm under pressure",
  Intelligence: "Reasoning and memory",
  Wits:         "Quickness of thought",
  Resolve:      "Determination and focus",
};

// All attributes start at 1 (minimum)
const defaultAttrs = {
  Strength: 1, Dexterity: 1, Stamina: 1,
  Charisma: 1, Manipulation: 1, Composure: 1,
  Intelligence: 1, Wits: 1, Resolve: 1,
};

export default function Step4Attributes({ onNext, onBack }) {
  // Now saves to backend step 3
  const { data, saveStep, error } = useWizardStore();
  const [attrs, setAttrs] = useState(data.step3?.attributes || defaultAttrs);

  const setAttr = (name, value) => setAttrs({ ...attrs, [name]: Math.min(5, Math.max(1, value)) });

  // Required distribution: one at 4, three at 3, four at 2, one at 1
  const counts = Object.values(attrs).reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  const isValid = counts[4] === 1 && counts[3] === 3 && counts[2] === 4 && counts[1] === 1;

  // Show remaining for each required tier
  const tiers = [
    { value: 4, need: 1 },
    { value: 3, need: 3 },
    { value: 2, need: 4 },
    { value: 1, need: 1 },
  ];

  const handleNext = async () => {
    const ok = await saveStep(3, { attributes: attrs });
    if (ok) onNext();
  };

  return (
    <div>
      <h2 className="font-gothic text-3xl text-blood mb-2">Attributes</h2>
      <p className="text-gray-400 mb-4">
        Set your 9 attributes. Each attribute starts at 1 (the minimum).
      </p>

      {/* Distribution progress */}
      <div className="bg-void-light border border-void-border rounded p-3 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Required distribution</p>
        <div className="flex flex-wrap gap-4">
          {tiers.map(({ value, need }) => {
            const have = counts[value] || 0;
            const done = have === need;
            return (
              <span key={value} className={`text-sm font-gothic ${done ? "text-green-400" : "text-blood"}`}>
                {done ? "✓" : `${need - have} more`} at {value}
                {done ? "" : ""}
              </span>
            );
          })}
          {isValid && <span className="text-green-400 text-sm font-gothic ml-2">✓ Complete!</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {Object.entries(ATTRIBUTES).map(([category, attrList]) => (
          <div key={category}>
            <h3 className="font-gothic text-blood text-sm mb-3 uppercase tracking-wider">{category}</h3>
            <div className="space-y-4">
              {attrList.map((attr) => (
                <div key={attr}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 text-sm">{attr}</span>
                    <span className="text-blood font-gothic text-sm">{attrs[attr]}</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-2">{ATTR_DESCRIPTIONS[attr]}</p>
                  {/* Dot buttons 1–5 */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setAttr(attr, v)}
                        className={`w-5 h-5 rounded-full border transition-colors ${
                          v <= attrs[attr]
                            ? "bg-blood border-blood"
                            : "bg-transparent border-void-border hover:border-gray-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleNext} disabled={!isValid} className="vtm-btn">
          Next: Skills →
        </button>
      </div>
    </div>
  );
}
