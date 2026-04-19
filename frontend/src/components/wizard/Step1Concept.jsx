import { useState } from "react";
import useWizardStore from "../../store/wizardStore";
import { randomConcept } from "../../utils/wizardRandomize";

export default function Step1Concept({ onNext }) {
  const { data, saveStep, error } = useWizardStore();
  const saved = data.step1 || {};

  const [form, setForm] = useState({
    name: saved.name || "",
    concept: saved.concept || "",
    ambition: saved.ambition || "",
    desire: saved.desire || "",
  });

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleNext = async () => {
    const ok = await saveStep(1, form);
    if (ok) onNext();
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-gothic text-3xl text-blood">Core Concept</h2>
        <button
          onClick={() => setForm(randomConcept())}
          className="text-xs border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors rounded px-3 py-1.5 font-gothic tracking-wider shrink-0"
        >
          ✦ Suggest
        </button>
      </div>
      <p className="text-gray-400 mb-8">Who were you before the Embrace? Who are you now?</p>

      <div className="space-y-6">
        <Field label="Name" hint="Your vampire's name">
          <input
            className="vtm-input"
            value={form.name}
            onChange={update("name")}
            placeholder="e.g. Sebastian Cross"
          />
        </Field>

        <Field label="Concept" hint="One sentence that captures who you are">
          <input
            className="vtm-input"
            value={form.concept}
            onChange={update("concept")}
            placeholder="e.g. Fallen priest seeking redemption"
          />
        </Field>

        <Field label="Ambition" hint="Your long-term goal — what drives you forward">
          <input
            className="vtm-input"
            value={form.ambition}
            onChange={update("ambition")}
            placeholder="e.g. Find and destroy my sire"
          />
        </Field>

        <Field label="Desire" hint="Your short-term need — what you want right now">
          <input
            className="vtm-input"
            value={form.desire}
            onChange={update("desire")}
            placeholder="e.g. Find peace before the Beast takes over"
          />
        </Field>
      </div>

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleNext}
          disabled={!form.name || !form.concept || !form.ambition || !form.desire}
          className="vtm-btn"
        >
          Next: Choose Clan →
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block font-gothic text-sm text-gray-300 mb-1 tracking-wider uppercase">{label}</label>
      {hint && <p className="text-gray-600 text-xs mb-2">{hint}</p>}
      {children}
    </div>
  );
}
