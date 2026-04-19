import { useState, useEffect } from "react";
import api from "../../services/api";
import useWizardStore from "../../store/wizardStore";
import { randomDisciplines } from "../../utils/wizardRandomize";

export default function Step6Disciplines({ onNext, onBack }) {
  const { data, saveStep, error } = useWizardStore();
  const clanId = data.step2?.clan_id;

  const [clanDisciplines, setClanDisciplines] = useState([]);
  const [allDisciplines, setAllDisciplines] = useState([]);   // used for Caitiff
  const [isClanless, setIsClanless] = useState(false);
  const [allPowers, setAllPowers] = useState({});             // discipline_id → powers[]
  const [selections, setSelections] = useState(
    data.step5?.disciplines || []
  );
  const [popup, setPopup] = useState(null);

  // (Predator type power is picked post-creation via character sheet — Option B)

  // Load powers helper
  const loadPowers = (disc) => {
    if (allPowers[disc.id]) return; // already loaded
    api.get(`/api/game-data/disciplines/${disc.id}/powers`).then((pr) => {
      setAllPowers((prev) => ({ ...prev, [disc.id]: pr.data.powers || [] }));
    });
  };

  // Load clan disciplines — also eagerly load all powers so Suggest can use them
  useEffect(() => {
    if (!clanId) return;
    api.get(`/api/game-data/clans/${clanId}`).then((r) => {
      const disciplines = r.data.disciplines || [];
      if (disciplines.length === 0) {
        setIsClanless(true);
        api.get("/api/game-data/disciplines").then((dr) => {
          setAllDisciplines(dr.data || []);
        });
      } else {
        setClanDisciplines(disciplines);
        // Load all clan discipline powers upfront (needed for Suggest)
        disciplines.forEach((disc) => {
          api.get(`/api/game-data/disciplines/${disc.id}/powers`).then((pr) => {
            setAllPowers((prev) => ({ ...prev, [disc.id]: pr.data.powers || [] }));
          });
        });
      }
    });
  }, [clanId]);


  const getSelection = (discId) => selections.find((s) => s.discipline_id === discId) || null;

  const setLevel = (discId, level) => {
    const existing = getSelection(discId);
    const newSel = existing
      ? { ...existing, level, power_ids: existing.power_ids.slice(0, level) }
      : { discipline_id: discId, level, power_ids: [] };
    setSelections((prev) => {
      const filtered = prev.filter((s) => s.discipline_id !== discId);
      return level === 0 ? filtered : [...filtered, newSel];
    });
  };

  const togglePower = (discId, powerId, powerLevel) => {
    setSelections((prev) => prev.map((s) => {
      if (s.discipline_id !== discId) return s;
      const othersAtLevel = s.power_ids.filter((id) => {
        const pw = (allPowers[discId] || []).find((p) => p.id === id);
        return pw && pw.level !== powerLevel;
      });
      const isSelected = s.power_ids.includes(powerId);
      if (isSelected) {
        return { ...s, power_ids: s.power_ids.filter((id) => id !== powerId) };
      } else {
        return { ...s, power_ids: [...othersAtLevel, powerId].slice(0, s.level) };
      }
    }));
  };

  // For Caitiff: toggle a discipline in/out of the selection pool
  const toggleClanlessDiscipline = (disc) => {
    const already = selections.find((s) => s.discipline_id === disc.id);
    if (already) {
      setSelections((prev) => prev.filter((s) => s.discipline_id !== disc.id));
    } else {
      if (selections.length >= 2) return;
      setSelections((prev) => [...prev, { discipline_id: disc.id, level: 0, power_ids: [] }]);
      loadPowers(disc);
    }
  };

  // Validation — clan disciplines only; predator type power is picked post-creation
  const totalDots = selections.reduce((sum, s) => sum + s.level, 0);
  const isValid = selections.length === 2 && totalDots === 3 &&
    selections.every((s) => s.level > 0 && s.power_ids.length === s.level);

  const handleNext = async () => {
    const ok = await saveStep(5, { disciplines: selections });
    if (ok) onNext();
  };

  const displayDisciplines = isClanless
    ? allDisciplines.filter((d) => selections.find((s) => s.discipline_id === d.id))
    : clanDisciplines;

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-gothic text-3xl text-blood">Disciplines</h2>
        {clanDisciplines.length >= 2 && Object.keys(allPowers).length >= clanDisciplines.length && (
          <button
            onClick={() => {
              const result = randomDisciplines(clanDisciplines, allPowers);
              if (result) setSelections(result);
            }}
            className="text-xs border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors rounded px-3 py-1.5 font-gothic tracking-wider shrink-0"
          >
            ✦ Suggest
          </button>
        )}
      </div>

      {isClanless ? (
        <p className="text-gray-400 mb-2">
          As a <span className="text-gray-200">Caitiff</span>, you are clanless and may choose
          any 2 disciplines. Pick 2 below, then assign 3 dots total.
        </p>
      ) : (
        <p className="text-gray-400 mb-2">
          Choose 2 clan disciplines and assign 3 dots total. Select one power per dot.
        </p>
      )}

      <div className="bg-void-light border border-void-border rounded p-3 mb-6 text-xs text-gray-400">
        Dots assigned: <span className={totalDots > 3 ? "text-blood" : "text-white"}>{totalDots}</span> / 3 ·
        Disciplines chosen: <span className="text-white">{selections.length}</span> / 2
        {isValid && <span className="text-green-400 ml-2">✓ Valid</span>}
      </div>

      {/* ── Caitiff discipline picker ── */}
      {isClanless && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Step 1 — Pick 2 disciplines
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {allDisciplines.map((disc) => {
              const chosen = !!selections.find((s) => s.discipline_id === disc.id);
              const disabled = !chosen && selections.length >= 2;
              return (
                <button
                  key={disc.id}
                  onClick={() => !disabled && toggleClanlessDiscipline(disc)}
                  className={`rounded border p-2 text-sm text-left transition-colors ${
                    chosen
                      ? "border-blood bg-blood-dark/20 text-gray-200"
                      : disabled
                      ? "border-void-border text-gray-700 cursor-not-allowed"
                      : "border-void-border text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {chosen && <span className="text-blood mr-1">✓</span>}
                  {disc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Clan discipline dot + power assignment ── */}
      {displayDisciplines.length > 0 && (
        <div>
          {isClanless && (
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Step 2 — Assign dots and choose powers
            </p>
          )}
          <div className="space-y-6">
            {displayDisciplines.map((disc) => {
              const sel = getSelection(disc.id);
              const powers = allPowers[disc.id] || [];

              return (
                <div key={disc.id} className="bg-void-light border border-void-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-gothic text-blood">{disc.name}</h3>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((v) => (
                        <button
                          key={v}
                          onClick={() => setLevel(disc.id, v)}
                          className={`w-6 h-6 rounded-full border text-xs transition-colors ${
                            sel && v > 0 && v <= sel.level
                              ? "bg-blood border-blood text-white"
                              : "border-void-border text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          {v === 0 ? "✕" : v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {sel && sel.level > 0 && (
                    <div className="space-y-2 mt-3">
                      {[1, 2, 3].filter((lvl) => lvl <= sel.level).map((lvl) => {
                        const levelPowers = powers.filter((p) => p.level === lvl);
                        return (
                          <div key={lvl}>
                            <p className="text-xs text-gray-500 mb-1">Level {lvl} — pick one:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {levelPowers.map((pw) => (
                                <div
                                  key={pw.id}
                                  onClick={() => togglePower(disc.id, pw.id, lvl)}
                                  className={`cursor-pointer rounded border p-2 transition-all ${
                                    sel.power_ids.includes(pw.id)
                                      ? "border-blood bg-blood-dark/20"
                                      : "border-void-border hover:border-gray-500"
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs text-gray-200">{pw.name}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setPopup(pw); }}
                                      className="text-gray-600 hover:text-blood text-xs ml-1"
                                    >ℹ</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleNext} disabled={!isValid} className="vtm-btn">
          Next: Advantages →
        </button>
      </div>

      {/* Info popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPopup(null)}>
          <div className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-gothic text-xl text-blood">{popup.name}</h3>
              <button onClick={() => setPopup(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <p className="text-gray-400 text-sm mb-3">{popup.description}</p>
            <div className="border-t border-void-border pt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">System</p>
              <p className="text-gray-300 text-sm">{popup.system_text}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
