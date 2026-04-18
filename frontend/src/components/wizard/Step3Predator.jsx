import { useState, useEffect } from "react";
import api from "../../services/api";
import useWizardStore from "../../store/wizardStore";

export default function Step3Predator({ onNext, onBack }) {
  const { data, saveStep, error } = useWizardStore();
  const [types, setTypes]   = useState([]);
  const [selected, setSelected] = useState(data.step9?.predator_type_id || null);
  const [popup, setPopup]   = useState(null);

  // Player's choices when the predator type has alternatives
  const [chosenDiscipline, setChosenDiscipline] = useState(data.step9?.chosen_discipline || null);
  const [chosenSpecialtySkill, setChosenSpecialtySkill] = useState(data.step9?.chosen_specialty_skill || null);
  const [chosenSpecialtyName, setChosenSpecialtyName] = useState(data.step9?.chosen_specialty_name || null);

  useEffect(() => {
    api.get("/api/game-data/predator-types").then((r) => setTypes(r.data));
  }, []);

  // Parsed choices for the selected predator type
  const selectedType = types.find((t) => t.id === selected);
  const choices = selectedType?.choices_json ? JSON.parse(selectedType.choices_json) : null;

  // Reset choices when predator type changes
  const handleSelect = (id) => {
    setSelected(id);
    setChosenDiscipline(null);
    setChosenSpecialtySkill(null);
    setChosenSpecialtyName(null);
  };

  // Validate that choices are made when required
  const choicesComplete = () => {
    if (!choices) return true;
    if (choices.discipline && choices.discipline.length > 1 && !chosenDiscipline) return false;
    if (choices.specialty && choices.specialty.length > 1 && !chosenSpecialtyName) return false;
    return true;
  };

  const handleNext = async () => {
    const stepData = {
      predator_type_id: selected,
      chosen_discipline: chosenDiscipline,
      chosen_specialty_skill: chosenSpecialtySkill,
      chosen_specialty_name: chosenSpecialtyName,
    };
    const ok = await saveStep(9, stepData);
    if (ok) onNext();
  };

  const handleSkip = async () => {
    const ok = await saveStep(9, { predator_type_id: null });
    if (ok) onNext();
  };

  return (
    <div>
      <h2 className="font-gothic text-3xl text-blood mb-2">Predator Type</h2>
      <p className="text-gray-400 mb-2">How do you hunt? Your predator type shapes how you feed — and what it costs you.</p>
      <p className="text-gray-600 text-sm mb-6 italic">
        This step is optional. Some chronicles skip predator types. If unsure, ask your Storyteller.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {types.map((pt) => (
          <div
            key={pt.id}
            onClick={() => handleSelect(pt.id)}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              selected === pt.id
                ? "border-blood bg-blood-dark/20"
                : "border-void-border bg-void-light hover:border-gray-500"
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-gothic text-sm text-gray-200">{pt.name}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setPopup(pt); }}
                className="text-gray-600 hover:text-blood text-xs ml-2"
              >
                ℹ
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-1">
              {pt.discipline?.name}{pt.discipline_level ? ` +${pt.discipline_level}` : ""}
              {pt.specialty_skill ? ` · ${pt.specialty_skill}: ${pt.specialty_name}` : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Choice UI for predator types with alternatives */}
      {selected && choices && (
        <div className="bg-void-light border border-blood-dark/40 rounded-lg p-4 mb-6 space-y-4">
          <p className="text-blood text-xs font-gothic uppercase tracking-wider">Choose your benefits</p>

          {choices.discipline && choices.discipline.length > 1 && (
            <div>
              <p className="text-gray-400 text-xs mb-2">Discipline (choose one):</p>
              <div className="flex gap-3">
                {choices.discipline.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => setChosenDiscipline(d.name)}
                    className={`flex-1 border rounded px-3 py-2 text-xs transition-all ${
                      chosenDiscipline === d.name
                        ? "border-blood bg-blood-dark/20 text-gray-200"
                        : "border-void-border text-gray-500 hover:border-gray-500"
                    }`}
                  >
                    <span className="font-gothic">{d.name}</span>
                    {d.description && <span className="block text-gray-600 mt-0.5">{d.description}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {choices.specialty && choices.specialty.length > 1 && (
            <div>
              <p className="text-gray-400 text-xs mb-2">Specialty (choose one):</p>
              <div className="flex gap-3">
                {choices.specialty.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => { setChosenSpecialtySkill(s.skill); setChosenSpecialtyName(s.name); }}
                    className={`flex-1 border rounded px-3 py-2 text-xs transition-all ${
                      chosenSpecialtyName === s.name
                        ? "border-blood bg-blood-dark/20 text-gray-200"
                        : "border-void-border text-gray-500 hover:border-gray-500"
                    }`}
                  >
                    <span className="font-gothic">{s.skill}</span>: {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selected && (
        <button
          onClick={() => handleSelect(null)}
          className="text-gray-600 hover:text-gray-400 text-xs mb-4 block"
        >
          ✕ Clear selection
        </button>
      )}

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between items-center">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <div className="flex gap-3">
          <button onClick={handleSkip} className="vtm-btn-secondary">
            Skip →
          </button>
          <button
            onClick={handleNext}
            disabled={!selected || !choicesComplete()}
            className="vtm-btn"
          >
            Next: Generation →
          </button>
        </div>
      </div>

      {/* Info popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPopup(null)}>
          <div className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-gothic text-2xl text-blood">{popup.name}</h3>
              <button onClick={() => setPopup(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <p className="text-gray-300 text-sm mb-4">{popup.description}</p>

            {/* Show choices if available, otherwise show fixed benefits */}
            {popup.choices_json ? (() => {
              const c = JSON.parse(popup.choices_json);
              return (
                <>
                  {c.discipline && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Discipline Bonus (choose one)</p>
                      <p className="text-blood text-sm">+1 {c.discipline.map((d) => d.name).join(" or ")}</p>
                    </div>
                  )}
                  {c.specialty && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Free Specialty (choose one)</p>
                      <p className="text-gray-300 text-sm">{c.specialty.map((s) => `${s.skill}: ${s.name}`).join(" or ")}</p>
                    </div>
                  )}
                </>
              );
            })() : (
              <>
                {popup.discipline && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Discipline Bonus</p>
                    <p className="text-blood text-sm">+{popup.discipline_level} {popup.discipline.name}</p>
                  </div>
                )}
                {popup.specialty_skill && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Free Specialty</p>
                    <p className="text-gray-300 text-sm">{popup.specialty_skill}: {popup.specialty_name}</p>
                  </div>
                )}
              </>
            )}

            {popup.advantages && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Advantages Gained</p>
                <p className="text-gray-300 text-sm">{popup.advantages}</p>
              </div>
            )}
            {popup.flaws && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Flaws Gained</p>
                <p className="text-gray-300 text-sm">{popup.flaws}</p>
              </div>
            )}
            {popup.humanity_modifier !== 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Humanity</p>
                <p className={popup.humanity_modifier > 0 ? "text-green-400 text-sm" : "text-blood text-sm"}>
                  {popup.humanity_modifier > 0 ? "+" : ""}{popup.humanity_modifier}
                </p>
              </div>
            )}
            <button onClick={() => { handleSelect(popup.id); setPopup(null); }} className="vtm-btn w-full mt-6">
              Choose {popup.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
