import { useState, useEffect } from "react";
import api from "../../services/api";
import useWizardStore from "../../store/wizardStore";
import { randomAdvantages } from "../../utils/wizardRandomize";

export default function Step7Advantages({ onNext, onBack }) {
  const { data, saveStep, error } = useWizardStore();
  const [merits, setMerits] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [flaws, setFlaws] = useState([]);
  const [advantages, setAdvantages] = useState(data.step6?.advantages || []);
  const [selectedFlaws, setSelectedFlaws] = useState(data.step6?.flaws || []);

  // Search filters
  const [meritSearch, setMeritSearch] = useState("");
  const [bgSearch, setBgSearch]       = useState("");
  const [flawSearch, setFlawSearch]   = useState("");

  // Custom text state: { "merit-{id}": "text", "flaw-{id}": "text" }
  const [customTexts, setCustomTexts] = useState(() => {
    const map = {};
    (data.step6?.advantages || []).forEach((a) => {
      if (a.notes) map[`${a.type}-${a.id}`] = a.notes;
    });
    (data.step6?.flaws || []).forEach((f) => {
      if (f.notes) map[`flaw-${f.id}`] = f.notes;
    });
    return map;
  });

  useEffect(() => {
    api.get("/api/game-data/merits").then((r) => setMerits(r.data));
    api.get("/api/game-data/backgrounds").then((r) => setBackgrounds(r.data));
    api.get("/api/game-data/flaws").then((r) => setFlaws(r.data));
  }, []);

  const totalSpent = advantages.reduce((sum, a) => sum + (a.level || 1), 0);
  const totalFlawValue = selectedFlaws.reduce((sum, f) => {
    const flaw = flaws.find((fl) => fl.id === f.id);
    return sum + (flaw?.value || 0);
  }, 0);
  const isValid = totalSpent <= 7 && totalFlawValue === 2;

  // Check that all selected merits/flaws with requires_custom_text have text entered
  const customTextComplete = () => {
    for (const adv of advantages) {
      const m = merits.find((x) => x.id === adv.id && adv.type === "merit");
      if (m?.requires_custom_text && !customTexts[`merit-${adv.id}`]?.trim()) return false;
    }
    for (const f of selectedFlaws) {
      const fl = flaws.find((x) => x.id === f.id);
      if (fl?.requires_custom_text && !customTexts[`flaw-${f.id}`]?.trim()) return false;
    }
    return true;
  };

  const canProceed = isValid && customTextComplete();

  const toggleAdvantage = (id, type, cost) => {
    const existing = advantages.find((a) => a.id === id && a.type === type);
    if (existing) {
      setAdvantages(advantages.filter((a) => !(a.id === id && a.type === type)));
    } else {
      setAdvantages([...advantages, { id, type, level: cost }]);
    }
  };

  const adjustLevel = (id, type, delta, cost, maxLevel) => {
    setAdvantages((prev) => prev.map((a) => {
      if (a.id !== id || a.type !== type) return a;
      const newLevel = Math.max(cost, Math.min(maxLevel * cost, a.level + delta * cost));
      return { ...a, level: newLevel };
    }));
  };

  const toggleFlaw = (id) => {
    if (selectedFlaws.find((f) => f.id === id)) {
      setSelectedFlaws(selectedFlaws.filter((f) => f.id !== id));
    } else {
      setSelectedFlaws([...selectedFlaws, { id }]);
    }
  };

  const isAdvSelected = (id, type) => advantages.some((a) => a.id === id && a.type === type);
  const isFlawSelected = (id) => selectedFlaws.some((f) => f.id === id);

  const setCustomText = (key, value) => setCustomTexts((t) => ({ ...t, [key]: value }));

  const handleNext = async () => {
    // Attach custom text (notes) to advantages and flaws before saving
    const advWithNotes = advantages.map((a) => ({
      ...a,
      notes: customTexts[`${a.type}-${a.id}`] || null,
    }));
    const flawsWithNotes = selectedFlaws.map((f) => ({
      ...f,
      notes: customTexts[`flaw-${f.id}`] || null,
    }));
    const ok = await saveStep(6, { advantages: advWithNotes, flaws: flawsWithNotes });
    if (ok) onNext();
  };

  // Filter helpers
  const filteredMerits = merits.filter((m) =>
    m.name.toLowerCase().includes(meritSearch.toLowerCase()) ||
    (m.description || "").toLowerCase().includes(meritSearch.toLowerCase())
  );
  const filteredBgs = backgrounds.filter((b) =>
    b.name.toLowerCase().includes(bgSearch.toLowerCase()) ||
    (b.description || "").toLowerCase().includes(bgSearch.toLowerCase())
  );
  const filteredFlaws = flaws.filter((f) =>
    f.name.toLowerCase().includes(flawSearch.toLowerCase()) ||
    (f.description || "").toLowerCase().includes(flawSearch.toLowerCase())
  );

  const renderCustomTextInput = (key, label) => (
    <input
      value={customTexts[key] || ""}
      onChange={(e) => setCustomText(key, e.target.value)}
      placeholder={label}
      onClick={(e) => e.stopPropagation()}
      className="w-full mt-1.5 bg-void border border-void-border rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood"
    />
  );

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-gothic text-3xl text-blood">Advantages & Flaws</h2>
        {merits.length > 0 && (
          <button
            onClick={() => {
              const r = randomAdvantages(merits, backgrounds, flaws);
              setAdvantages(r.advantages);
              setSelectedFlaws(r.flaws);
              setCustomTexts({});
            }}
            className="text-xs border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors rounded px-3 py-1.5 font-gothic tracking-wider shrink-0"
          >
            ✦ Suggest
          </button>
        )}
      </div>
      <p className="text-gray-400 mb-2">Spend 7 points on merits and backgrounds. Take exactly 2 points of flaws.</p>
      <p className="text-gray-500 text-xs mb-4 italic">
        Some merits and flaws require you to specify details (e.g. the type of contact, or what you're addicted to). A text box will appear when needed.
      </p>

      <div className="bg-void-light border border-void-border rounded p-3 mb-6 text-xs text-gray-400 flex gap-6">
        <span>Points spent: <span className={totalSpent > 7 ? "text-blood" : "text-white"}>{totalSpent}</span> / 7</span>
        <span>Flaw value: <span className={totalFlawValue !== 2 ? "text-blood" : "text-green-400"}>{totalFlawValue}</span> / 2</span>
        {isValid && customTextComplete() && <span className="text-green-400">✓ Valid</span>}
        {isValid && !customTextComplete() && <span className="text-yellow-500">⚠ Fill in required details</span>}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Merits */}
        <div>
          <h3 className="font-gothic text-blood text-sm mb-2 uppercase tracking-wider">Merits</h3>
          <input
            value={meritSearch}
            onChange={(e) => setMeritSearch(e.target.value)}
            placeholder="Search merits…"
            className="w-full bg-void border border-void-border rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood mb-2"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredMerits.map((m) => {
              const selected = isAdvSelected(m.id, "merit");
              const adv = advantages.find((a) => a.id === m.id && a.type === "merit");
              const currentLevel = adv ? adv.level / m.cost : 0;
              const maxLevel = m.max_level || 1;
              return (
                <div key={m.id} className={`rounded border p-2 transition-all ${selected ? "border-blood bg-blood-dark/20" : "border-void-border hover:border-gray-500"}`}>
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleAdvantage(m.id, "merit", m.cost)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-200">{m.name}</span>
                      <span className="text-blood text-xs shrink-0 ml-1">
                        {selected
                          ? "●".repeat(currentLevel) + (currentLevel < maxLevel ? "○".repeat(maxLevel - currentLevel) : "")
                          : "●".repeat(m.cost)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{m.description}</p>
                    {m.category && <span className="text-xs text-gray-700 italic">{m.category}</span>}
                  </div>
                  {selected && maxLevel > 1 && (
                    <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-gray-500">Dots:</span>
                      <button
                        onClick={() => adjustLevel(m.id, "merit", -1, m.cost, maxLevel)}
                        disabled={currentLevel <= 1}
                        className="w-5 h-5 rounded border border-void-border text-gray-400 hover:border-gray-500 disabled:opacity-30 text-xs"
                      >−</button>
                      <span className="text-xs text-gray-200 w-4 text-center">{currentLevel}</span>
                      <button
                        onClick={() => adjustLevel(m.id, "merit", 1, m.cost, maxLevel)}
                        disabled={currentLevel >= maxLevel}
                        className="w-5 h-5 rounded border border-void-border text-gray-400 hover:border-gray-500 disabled:opacity-30 text-xs"
                      >+</button>
                      <span className="text-xs text-gray-600">/ {maxLevel} (costs {adv?.level || m.cost} pts)</span>
                    </div>
                  )}
                  {selected && m.requires_custom_text &&
                    renderCustomTextInput(`merit-${m.id}`, "Specify details…")
                  }
                </div>
              );
            })}
            {filteredMerits.length === 0 && (
              <p className="text-gray-600 text-xs italic">No merits match your search.</p>
            )}
          </div>
        </div>

        {/* Backgrounds */}
        <div>
          <h3 className="font-gothic text-blood text-sm mb-2 uppercase tracking-wider">Backgrounds</h3>
          <input
            value={bgSearch}
            onChange={(e) => setBgSearch(e.target.value)}
            placeholder="Search backgrounds…"
            className="w-full bg-void border border-void-border rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood mb-2"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredBgs.map((b) => {
              const selected = isAdvSelected(b.id, "background");
              const adv = advantages.find((a) => a.id === b.id && a.type === "background");
              const currentLevel = adv ? adv.level : 0;
              const maxLevel = 5; // all backgrounds go up to 5 dots
              return (
                <div key={b.id} className={`rounded border p-2 transition-all ${selected ? "border-blood bg-blood-dark/20" : "border-void-border hover:border-gray-500"}`}>
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleAdvantage(b.id, "background", 1)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-200">{b.name}</span>
                      <span className="text-blood text-xs shrink-0 ml-1">
                        {selected
                          ? "●".repeat(currentLevel) + "○".repeat(maxLevel - currentLevel)
                          : "●○○○○"}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{b.description?.slice(0, 90)}{b.description?.length > 90 ? "…" : ""}</p>
                  </div>
                  {selected && (
                    <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-gray-500">Dots:</span>
                      <button
                        onClick={() => adjustLevel(b.id, "background", -1, 1, maxLevel)}
                        disabled={currentLevel <= 1}
                        className="w-5 h-5 rounded border border-void-border text-gray-400 hover:border-gray-500 disabled:opacity-30 text-xs"
                      >−</button>
                      <span className="text-xs text-gray-200 w-4 text-center">{currentLevel}</span>
                      <button
                        onClick={() => adjustLevel(b.id, "background", 1, 1, maxLevel)}
                        disabled={currentLevel >= maxLevel}
                        className="w-5 h-5 rounded border border-void-border text-gray-400 hover:border-gray-500 disabled:opacity-30 text-xs"
                      >+</button>
                      <span className="text-xs text-gray-600">/ {maxLevel} (costs {currentLevel} pts)</span>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredBgs.length === 0 && (
              <p className="text-gray-600 text-xs italic">No backgrounds match your search.</p>
            )}
          </div>
        </div>
      </div>

      {/* Flaws */}
      <div className="mt-6">
        <h3 className="font-gothic text-blood text-sm mb-2 uppercase tracking-wider">Flaws (take exactly 2 points)</h3>
        <input
          value={flawSearch}
          onChange={(e) => setFlawSearch(e.target.value)}
          placeholder="Search flaws…"
          className="w-full bg-void border border-void-border rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood mb-2"
        />
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredFlaws.map((f) => {
            const selected = isFlawSelected(f.id);
            return (
              <div key={f.id} className={`rounded border p-2 transition-all ${selected ? "border-blood bg-blood-dark/20" : "border-void-border hover:border-gray-500"}`}>
                <div className="cursor-pointer" onClick={() => toggleFlaw(f.id)}>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-200">{f.name}</span>
                    <span className="text-blood-dark text-xs">{"●".repeat(f.value)}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{f.description?.slice(0, 70)}{f.description?.length > 70 ? "…" : ""}</p>
                  {f.category && <span className="text-xs text-gray-700 italic">{f.category}</span>}
                </div>
                {selected && f.requires_custom_text &&
                  renderCustomTextInput(`flaw-${f.id}`, "Specify details…")
                }
              </div>
            );
          })}
          {filteredFlaws.length === 0 && (
            <p className="text-gray-600 text-xs italic col-span-2">No flaws match your search.</p>
          )}
        </div>
      </div>

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleNext} disabled={!canProceed} className="vtm-btn">
          Next: Beliefs →
        </button>
      </div>
    </div>
  );
}
