import { useState, useEffect } from "react";
import api from "../../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_BOXES = 15;   // same as CharacterSheet

const MONSTER_TYPES = ["vampire", "ghoul", "mortal", "beast", "spirit", "other"];

const TYPE_COLORS = {
  vampire: "text-blood border-blood-dark/60 bg-blood-dark/10",
  ghoul:   "text-orange-400 border-orange-900/60 bg-orange-900/10",
  mortal:  "text-gray-300 border-gray-700 bg-gray-800/20",
  beast:   "text-green-500 border-green-900/60 bg-green-900/10",
  spirit:  "text-purple-400 border-purple-900/60 bg-purple-900/10",
  other:   "text-gray-500 border-gray-700 bg-gray-800/10",
};

const ATTRS = [
  { key: "strength",     short: "STR" },
  { key: "dexterity",    short: "DEX" },
  { key: "stamina",      short: "STA" },
  { key: "charisma",     short: "CHA" },
  { key: "manipulation", short: "MAN" },
  { key: "composure",    short: "COM" },
  { key: "intelligence", short: "INT" },
  { key: "wits",         short: "WIT" },
  { key: "resolve",      short: "RES" },
];

const V5_SKILLS = {
  Physical: ["Athletics","Brawl","Craft","Drive","Firearms","Larceny","Melee","Stealth","Survival"],
  Social:   ["Animal Ken","Etiquette","Insight","Intimidation","Leadership","Performance","Persuasion","Streetwise","Subterfuge"],
  Mental:   ["Academics","Awareness","Finance","Investigation","Medicine","Occult","Politics","Science","Technology"],
};
const ALL_V5_SKILLS = Object.values(V5_SKILLS).flat();

const DEFAULT_FORM = {
  name: "", type: "other",
  health: 4, health_superficial: 0, health_aggravated: 0,
  willpower: 3, willpower_superficial: 0, willpower_aggravated: 0,
  current_hunger: 0,
  strength: 1, dexterity: 1, stamina: 1,
  charisma: 1, manipulation: 1, composure: 1,
  intelligence: 1, wits: 1, resolve: 1,
  attack_pool: 0, attack_damage_type: "superficial",
  weapons: [], custom_skills: [], disciplines: [],
  special_abilities: "", notes: "",
};

const BLANK_WEAPON = { name: "", damage: "", range: "", clips: "", traits: "" };

// ── Shared primitives ─────────────────────────────────────────────────────────

function DotRow({ value, max = 5, onChange }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button"
          onClick={() => onChange(i + 1 === value ? i : i + 1)}
          className={`w-4 h-4 rounded-full border transition-colors ${
            i < value ? "bg-blood-dark border-blood" : "border-gray-700 hover:border-gray-500"
          }`}
        />
      ))}
    </div>
  );
}

function Stepper({ value, min = 0, max = 20, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded border border-void-border text-gray-500 hover:text-white hover:border-blood transition-colors text-sm leading-none">−</button>
      <span className="text-gray-200 text-sm w-6 text-center font-gothic">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 rounded border border-void-border text-gray-500 hover:text-white hover:border-blood transition-colors text-sm leading-none">+</button>
    </div>
  );
}

// ── Damage track — 15 boxes, same mechanic as CharacterSheet ──────────────────
// 0 = empty · 1 = superficial / · 2 = aggravated ×
// Click cycles 0→1→2→0. Boxes beyond maxActive are grey and inactive.

function buildTrack(maxActive, sup, agg) {
  const arr = Array(maxActive).fill(0);
  for (let i = maxActive - 1; i >= 0 && i >= maxActive - agg; i--) arr[i] = 2;
  for (let i = maxActive - agg - 1; i >= 0 && i >= maxActive - agg - sup; i--) arr[i] = 1;
  return arr;
}

function DamageBox({ state, onClick }) {
  const cls =
    state === 2 ? "border-blood bg-blood-dark/50 text-blood" :
    state === 1 ? "border-yellow-600 bg-yellow-900/30 text-yellow-500" :
                  "border-gray-700 hover:border-gray-500 text-transparent";
  return (
    <button type="button" onClick={onClick}
      title={state === 0 ? "→ superficial" : state === 1 ? "→ aggravated" : "→ clear"}
      className={`w-6 h-6 border rounded-sm transition-colors flex items-center justify-center text-xs font-bold ${cls}`}
    >
      {state === 1 ? "/" : state === 2 ? "×" : "·"}
    </button>
  );
}

function TrackRow({ label, total, superficial, aggravated, onChange }) {
  const track = buildTrack(total, superficial, aggravated);

  const handleClick = (i) => {
    const next = [...track];
    next[i] = (next[i] + 1) % 3;
    onChange(next.filter((s) => s === 1).length, next.filter((s) => s === 2).length);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-gray-500 uppercase tracking-wider w-20 shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: TOTAL_BOXES }, (_, i) => {
          if (i >= total) {
            return <div key={i} className="w-6 h-6 border border-gray-900 rounded-sm bg-gray-950 opacity-20" />;
          }
          return <DamageBox key={i} state={track[i] ?? 0} onClick={() => handleClick(i)} />;
        })}
      </div>
    </div>
  );
}

function HungerRow({ value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Hunger</span>
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <button key={i} type="button"
            onClick={() => onChange(i + 1 === value ? i : i + 1)}
            className={`w-5 h-5 rounded-full border-2 transition-colors ${
              i < value ? "bg-red-700 border-red-600" : "border-gray-700 hover:border-red-900"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Weapons section ───────────────────────────────────────────────────────────

function WeaponsSection({ weapons, onChange }) {
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState(BLANK_WEAPON);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = () => {
    if (!form.name.trim()) return;
    onChange([...weapons, { ...form, name: form.name.trim() }]);
    setForm(BLANK_WEAPON); setAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="vtm-label">Weapons</p>
        {!adding && <button type="button" onClick={() => setAdding(true)}
          className="text-xs text-gray-600 hover:text-blood transition-colors">+ Add</button>}
      </div>

      {weapons.length > 0 && (
        <div className="space-y-1">
          {weapons.map((w, i) => (
            <div key={i} className="flex items-center justify-between bg-void rounded px-3 py-1.5 text-sm">
              <div className="flex gap-3 flex-wrap items-center min-w-0">
                <span className="text-gray-200 font-medium">{w.name}</span>
                {w.damage && <span className="text-xs text-gray-500">Dmg: {w.damage}</span>}
                {w.range  && <span className="text-xs text-gray-500">Rng: {w.range}</span>}
                {w.clips  && <span className="text-xs text-gray-500">Clips: {w.clips}</span>}
                {w.traits && <span className="text-xs text-gray-600 italic">{w.traits}</span>}
              </div>
              <button type="button" onClick={() => onChange(weapons.filter((_, j) => j !== i))}
                className="text-gray-700 hover:text-blood text-xs ml-2 shrink-0 transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="bg-void rounded p-3 space-y-2 border border-void-border">
          <div className="flex gap-2 flex-wrap">
            <input className="vtm-input flex-1 min-w-28 py-1 text-sm" placeholder="Name *"
              value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
            <input className="vtm-input w-28 py-1 text-sm" placeholder="Damage"
              value={form.damage} onChange={(e) => set("damage", e.target.value)} />
            <input className="vtm-input w-24 py-1 text-sm" placeholder="Range"
              value={form.range} onChange={(e) => set("range", e.target.value)} />
            <input className="vtm-input w-20 py-1 text-sm" placeholder="Clips"
              value={form.clips} onChange={(e) => set("clips", e.target.value)} />
          </div>
          <input className="vtm-input py-1 text-sm" placeholder="Traits (optional)"
            value={form.traits} onChange={(e) => set("traits", e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={!form.name.trim()}
              className="vtm-btn py-1 px-3 text-xs disabled:opacity-40">Add</button>
            <button type="button" onClick={() => { setAdding(false); setForm(BLANK_WEAPON); }}
              className="vtm-btn-secondary py-1 px-2 text-xs">Cancel</button>
          </div>
        </div>
      )}
      {weapons.length === 0 && !adding && <p className="text-gray-700 text-xs italic">No weapons.</p>}
    </div>
  );
}

// ── Skills section — full grid, same layout as character sheet ────────────────

function SkillsSection({ skills, onChange }) {
  const skillMap = Object.fromEntries(skills.map((s) => [s.name, s.value]));

  const setSkillValue = (name, value) => {
    const idx = skills.findIndex((s) => s.name === name);
    if (idx >= 0) {
      const u = [...skills]; u[idx] = { name, value }; onChange(u);
    } else {
      onChange([...skills, { name, value }]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="vtm-label">Skills</p>
      {Object.entries(V5_SKILLS).map(([category, list]) => (
        <div key={category}>
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">{category}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {list.map((name) => (
              <div key={name} className="flex items-center justify-between bg-void rounded px-2 py-1.5">
                <span className="text-xs text-gray-400 truncate mr-1">{name}</span>
                <DotRow value={skillMap[name] ?? 0} onChange={(v) => setSkillValue(name, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Disciplines section with power selection ──────────────────────────────────

function DisciplinesSection({ disciplines, onChange }) {
  const [gameDiscs,       setGameDiscs]       = useState([]);
  const [discsLoaded,     setDiscsLoaded]     = useState(false);
  const [adding,          setAdding]          = useState(false);
  const [editIdx,         setEditIdx]         = useState(null);
  const [pickedId,        setPickedId]        = useState("");
  const [pickedLevel,     setPickedLevel]     = useState(1);
  const [availPowers,     setAvailPowers]     = useState([]);
  const [loadingPowers,   setLoadingPowers]   = useState(false);
  const [selectedPowers,  setSelectedPowers]  = useState(new Set());

  // Load discipline list once
  useEffect(() => {
    if (discsLoaded) return;
    api.get("/api/game-data/disciplines")
      .then((res) => { setGameDiscs(res.data); setDiscsLoaded(true); })
      .catch(() => setDiscsLoaded(true));
  }, [discsLoaded]);

  // Reload powers whenever picked discipline or level changes
  useEffect(() => {
    if (!pickedId) { setAvailPowers([]); return; }
    setLoadingPowers(true);
    api.get(`/api/game-data/disciplines/${pickedId}/powers`)
      .then((res) => {
        setAvailPowers(res.data.filter((p) => p.level <= pickedLevel));
        setLoadingPowers(false);
      })
      .catch(() => setLoadingPowers(false));
  }, [pickedId, pickedLevel]);

  const togglePower = (p) => {
    setSelectedPowers((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
      return next;
    });
  };

  const resetForm = () => {
    setAdding(false); setEditIdx(null);
    setPickedId(""); setPickedLevel(1);
    setAvailPowers([]); setSelectedPowers(new Set());
  };

  const startEdit = (disc, idx) => {
    setEditIdx(idx);
    setPickedId(String(disc.id));
    setPickedLevel(disc.level);
    setSelectedPowers(new Set((disc.powers ?? []).map((p) => p.id)));
    setAdding(true);
  };

  const handleSave = () => {
    const disc = gameDiscs.find((d) => String(d.id) === pickedId);
    if (!disc) return;
    const powers = availPowers
      .filter((p) => selectedPowers.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, level: p.level }));
    const entry = { id: disc.id, name: disc.name, level: pickedLevel, powers };

    if (editIdx !== null) {
      const u = [...disciplines]; u[editIdx] = entry; onChange(u);
    } else {
      const existIdx = disciplines.findIndex((d) => d.id === disc.id);
      if (existIdx >= 0) { const u = [...disciplines]; u[existIdx] = entry; onChange(u); }
      else onChange([...disciplines, entry]);
    }
    resetForm();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="vtm-label">Disciplines</p>
        {!adding && <button type="button" onClick={() => { setEditIdx(null); setAdding(true); }}
          className="text-xs text-gray-600 hover:text-blood transition-colors">+ Add</button>}
      </div>

      {/* Discipline list */}
      {disciplines.length > 0 && (
        <div className="space-y-2">
          {disciplines.map((d, i) => (
            <div key={i} className="bg-void rounded px-3 py-2 border border-void-border/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blood font-gothic">{d.name}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, j) => (
                      <div key={j} className={`w-3 h-3 rounded-full border ${
                        j < d.level ? "bg-blood-dark border-blood" : "border-gray-700"
                      }`} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <button type="button" onClick={() => startEdit(d, i)}
                    className="text-xs text-gray-600 hover:text-blood transition-colors">Edit</button>
                  <button type="button" onClick={() => onChange(disciplines.filter((_, j) => j !== i))}
                    className="text-gray-700 hover:text-blood text-xs transition-colors">✕</button>
                </div>
              </div>
              {d.powers?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {d.powers.map((p) => (
                    <span key={p.id} className="text-xs bg-blood-dark/20 border border-blood-dark/30 text-gray-400 rounded px-1.5 py-0.5">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {adding && (
        <div className="bg-void rounded p-3 space-y-3 border border-void-border">
          {!discsLoaded ? (
            <p className="text-gray-600 text-xs animate-pulse">Loading…</p>
          ) : (
            <>
              <div className="flex gap-2 items-center flex-wrap">
                <select className="vtm-input flex-1 min-w-36 py-1 text-sm"
                  value={pickedId}
                  onChange={(e) => { setPickedId(e.target.value); setSelectedPowers(new Set()); }}>
                  <option value="">Select discipline…</option>
                  {gameDiscs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Level</span>
                  <DotRow value={pickedLevel} onChange={setPickedLevel} />
                </div>
              </div>

              {/* Powers checklist */}
              {pickedId && (
                <div>
                  <p className="text-xs text-gray-600 mb-1 uppercase tracking-wider">
                    Powers available (level ≤ {pickedLevel})
                  </p>
                  {loadingPowers ? (
                    <p className="text-xs text-gray-700 animate-pulse">Loading powers…</p>
                  ) : availPowers.length === 0 ? (
                    <p className="text-xs text-gray-700 italic">No powers at this level.</p>
                  ) : (
                    <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                      {availPowers.map((p) => (
                        <label key={p.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-void-light rounded px-2 py-1 transition-colors">
                          <input type="checkbox" checked={selectedPowers.has(p.id)}
                            onChange={() => togglePower(p)}
                            className="accent-red-700 shrink-0" />
                          <span className="text-xs text-gray-300">{p.name}</span>
                          <span className="text-xs text-gray-600 ml-auto shrink-0">lvl {p.level}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={!pickedId}
              className="vtm-btn py-1 px-3 text-xs disabled:opacity-40">
              {editIdx !== null ? "Update" : "Add"}
            </button>
            <button type="button" onClick={resetForm}
              className="vtm-btn-secondary py-1 px-2 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {disciplines.length === 0 && !adding && (
        <p className="text-gray-700 text-xs italic">No disciplines.</p>
      )}
    </div>
  );
}

// ── Inline monster editor (expanded card) ────────────────────────────────────

function MonsterEditor({ monster, onSave, onDelete, saving }) {
  const [form,  setForm]  = useState({ ...monster });
  const [dirty, setDirty] = useState(false);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setDirty(true); };
  const setJson = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setDirty(true); };
  const setTrack = (supKey, aggKey) => (sup, agg) => {
    setForm((f) => ({ ...f, [supKey]: sup, [aggKey]: agg }));
    setDirty(true);
  };

  const showHunger = form.type === "vampire" || form.type === "ghoul";
  const showDisc   = form.type === "vampire" || form.type === "ghoul";

  return (
    <div className="px-4 pb-4 pt-3 border-t border-void-border/40 space-y-5">

      {/* Name + type */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-32">
          <label className="vtm-label">Name</label>
          <input className="vtm-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="vtm-label">Type</label>
          <select className="vtm-input" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {MONSTER_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Health */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Max Health</span>
          <Stepper value={form.health} min={1} max={15} onChange={(v) => set("health", v)} />
        </div>
        <TrackRow label="Health" total={form.health}
          superficial={form.health_superficial} aggravated={form.health_aggravated}
          onChange={setTrack("health_superficial", "health_aggravated")} />
      </div>

      {/* Willpower */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Max Will</span>
          <Stepper value={form.willpower} min={1} max={10} onChange={(v) => set("willpower", v)} />
        </div>
        <TrackRow label="Willpower" total={form.willpower}
          superficial={form.willpower_superficial} aggravated={form.willpower_aggravated}
          onChange={setTrack("willpower_superficial", "willpower_aggravated")} />
      </div>

      {/* Hunger */}
      {showHunger && <HungerRow value={form.current_hunger} onChange={(v) => set("current_hunger", v)} />}

      {/* Attributes */}
      <div>
        <p className="vtm-label mb-2">Attributes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ATTRS.map(({ key, short }) => (
            <div key={key} className="flex items-center justify-between bg-void rounded px-2 py-1.5">
              <span className="text-xs text-gray-500 w-8">{short}</span>
              <DotRow value={form[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <SkillsSection
        skills={form.custom_skills}
        onChange={(v) => setJson("custom_skills", v)}
      />

      {/* Attack */}
      <div>
        <p className="vtm-label mb-2">Attack</p>
        <div className="flex gap-5 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Pool</span>
            <Stepper value={form.attack_pool} min={0} max={20} onChange={(v) => set("attack_pool", v)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Damage</span>
            <select className="vtm-input py-1 text-sm" value={form.attack_damage_type}
              onChange={(e) => set("attack_damage_type", e.target.value)}>
              <option value="superficial">Superficial</option>
              <option value="aggravated">Aggravated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Weapons */}
      <WeaponsSection weapons={form.weapons} onChange={(v) => setJson("weapons", v)} />

      {/* Disciplines */}
      {showDisc && (
        <DisciplinesSection disciplines={form.disciplines} onChange={(v) => setJson("disciplines", v)} />
      )}

      {/* Special abilities */}
      <div>
        <label className="vtm-label">Special Abilities</label>
        <textarea className="vtm-input resize-none" rows={3}
          value={form.special_abilities} onChange={(e) => set("special_abilities", e.target.value)}
          placeholder="Powers, unique abilities…" />
      </div>

      {/* Notes */}
      <div>
        <label className="vtm-label">Notes</label>
        <textarea className="vtm-input resize-none" rows={2}
          value={form.notes} onChange={(e) => set("notes", e.target.value)}
          placeholder="Tactics, background, weaknesses…" />
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-1 border-t border-void-border/30">
        <button type="button" onClick={() => onSave(form)} disabled={!dirty || saving}
          className="vtm-btn py-1.5 px-4 text-sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? "Saving…" : dirty ? "Save Changes" : "Saved"}
        </button>
        <button type="button" onClick={() => onDelete(monster)}
          className="py-1.5 px-3 text-xs rounded border border-red-900/40 text-red-400/60 hover:border-red-700 hover:text-red-300 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Monster card (collapsed + expanded editor) ────────────────────────────────

function MonsterCard({ monster, onSave, onDelete, saving }) {
  const [expanded, setExpanded] = useState(false);
  const typeStyle  = TYPE_COLORS[monster.type] ?? TYPE_COLORS.other;
  const showHunger = monster.type === "vampire" || monster.type === "ghoul";

  return (
    <div className="bg-void-light border border-void-border rounded-lg overflow-hidden">
      {/* Collapsed header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-void/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-gothic tracking-wider border rounded px-1.5 py-0.5 capitalize shrink-0 ${typeStyle}`}>
            {monster.type}
          </span>
          <span className="text-gray-200 font-medium truncate">{monster.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {/* Mini health track */}
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(monster.health, 10) }, (_, i) => {
              const fromRight = monster.health - 1 - i;
              const state =
                fromRight < monster.health_aggravated ? "agg" :
                fromRight < monster.health_aggravated + monster.health_superficial ? "sup" : "ok";
              return <div key={i} className={`w-3 h-3 border rounded-sm ${
                state === "agg" ? "bg-blood-dark/60 border-blood" :
                state === "sup" ? "bg-yellow-900/50 border-yellow-600" : "border-gray-700"
              }`} />;
            })}
          </div>
          {showHunger && (
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full border ${
                  i < monster.current_hunger ? "bg-red-700 border-red-600" : "border-gray-700"
                }`} />
              ))}
            </div>
          )}
          <span className="text-gray-600 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded inline editor */}
      {expanded && (
        <MonsterEditor
          monster={monster}
          onSave={onSave}
          onDelete={onDelete}
          saving={saving === monster.id}
        />
      )}
    </div>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({ groupId, onCreated, onCancel }) {
  const [form,   setForm]   = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const set     = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setJson = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setTrack = (supKey, aggKey) => (sup, agg) =>
    setForm((f) => ({ ...f, [supKey]: sup, [aggKey]: agg }));

  const showHunger = form.type === "vampire" || form.type === "ghoul";
  const showDisc   = form.type === "vampire" || form.type === "ghoul";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await api.post(`/api/monsters?group_id=${groupId}`, form);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create monster.");
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-void-light border border-blood-dark/30 rounded-lg p-5 space-y-5">
      <h3 className="font-gothic text-blood text-lg">New Monster</h3>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="vtm-label">Name</label>
          <input className="vtm-input" value={form.name} onChange={(e) => set("name", e.target.value)}
            placeholder="Street Thug, Ancient Nosferatu…" required autoFocus />
        </div>
        <div>
          <label className="vtm-label">Type</label>
          <select className="vtm-input" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {MONSTER_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Health */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Max Health</span>
          <Stepper value={form.health} min={1} max={15} onChange={(v) => set("health", v)} />
        </div>
        <TrackRow label="Health" total={form.health}
          superficial={form.health_superficial} aggravated={form.health_aggravated}
          onChange={setTrack("health_superficial", "health_aggravated")} />
      </div>

      {/* Willpower */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Max Will</span>
          <Stepper value={form.willpower} min={1} max={10} onChange={(v) => set("willpower", v)} />
        </div>
        <TrackRow label="Willpower" total={form.willpower}
          superficial={form.willpower_superficial} aggravated={form.willpower_aggravated}
          onChange={setTrack("willpower_superficial", "willpower_aggravated")} />
      </div>

      {showHunger && <HungerRow value={form.current_hunger} onChange={(v) => set("current_hunger", v)} />}

      {/* Attributes */}
      <div>
        <p className="vtm-label mb-2">Attributes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ATTRS.map(({ key, short }) => (
            <div key={key} className="flex items-center justify-between bg-void rounded px-2 py-1.5">
              <span className="text-xs text-gray-500 w-8">{short}</span>
              <DotRow value={form[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <SkillsSection skills={form.custom_skills} onChange={(v) => setJson("custom_skills", v)} />

      {/* Attack */}
      <div>
        <p className="vtm-label mb-2">Attack</p>
        <div className="flex gap-5 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Pool</span>
            <Stepper value={form.attack_pool} min={0} max={20} onChange={(v) => set("attack_pool", v)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Damage</span>
            <select className="vtm-input py-1 text-sm" value={form.attack_damage_type}
              onChange={(e) => set("attack_damage_type", e.target.value)}>
              <option value="superficial">Superficial</option>
              <option value="aggravated">Aggravated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Weapons */}
      <WeaponsSection weapons={form.weapons} onChange={(v) => setJson("weapons", v)} />

      {/* Disciplines */}
      {showDisc && (
        <DisciplinesSection disciplines={form.disciplines} onChange={(v) => setJson("disciplines", v)} />
      )}

      <div>
        <label className="vtm-label">Special Abilities</label>
        <textarea className="vtm-input resize-none" rows={3} value={form.special_abilities}
          onChange={(e) => set("special_abilities", e.target.value)}
          placeholder="Powers, unique abilities…" />
      </div>

      <div>
        <label className="vtm-label">Notes</label>
        <textarea className="vtm-input resize-none" rows={2} value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Tactics, background, weaknesses…" />
      </div>

      {error && <p className="text-blood text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="vtm-btn flex-1">
          {saving ? "Creating…" : "Create Monster"}
        </button>
        <button type="button" onClick={onCancel} className="vtm-btn-secondary px-4">Cancel</button>
      </div>
    </form>
  );
}

// ── Main MonsterPanel ─────────────────────────────────────────────────────────

export default function MonsterPanel({ groupId }) {
  const [monsters,     setMonsters]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [savingId,     setSavingId]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    api.get(`/api/monsters?group_id=${groupId}`)
      .then((res) => { setMonsters(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [groupId]);

  const handleCreated = (m) => { setMonsters((p) => [...p, m]); setShowCreate(false); };

  const handleSave = async (form) => {
    setSavingId(form.id);
    try {
      const res = await api.put(`/api/monsters/${form.id}`, form);
      setMonsters((p) => p.map((m) => m.id === form.id ? res.data : m));
    } catch { /* ignore — user can retry */ }
    finally { setSavingId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/monsters/${deleteTarget.id}`);
      setMonsters((p) => p.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  if (loading) return (
    <p className="text-gray-600 text-sm animate-pulse font-gothic tracking-widest">
      Summoning creatures of the night…
    </p>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex justify-between items-center">
        <h3 className="font-gothic text-blood-dark text-sm uppercase tracking-wider">
          Monsters & NPCs ({monsters.length})
        </h3>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="vtm-btn py-1 px-3 text-xs">
            + New Monster
          </button>
        )}
      </div>

      {showCreate && (
        <CreateForm groupId={groupId} onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {monsters.length === 0 && !showCreate ? (
        <p className="text-gray-600 text-sm italic">No monsters yet. The night is quiet… for now.</p>
      ) : (
        <div className="space-y-2">
          {monsters.map((m) => (
            <MonsterCard key={m.id} monster={m} onSave={handleSave}
              onDelete={setDeleteTarget} saving={savingId} />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-sm w-full">
            <h3 className="font-gothic text-xl text-blood mb-2">Delete Monster</h3>
            <p className="text-gray-400 text-sm mb-5">
              Permanently delete <span className="text-gray-200 font-bold">{deleteTarget.name}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="vtm-btn-secondary flex-1" disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded px-4 py-2 text-sm font-gothic tracking-wider transition-colors disabled:opacity-40">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
