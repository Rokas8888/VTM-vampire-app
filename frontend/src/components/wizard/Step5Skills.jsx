import { useState, useMemo } from "react";
import useWizardStore from "../../store/wizardStore";
import { randomSkills } from "../../utils/wizardRandomize";

// ── Constants ────────────────────────────────────────────────────────────────

const SKILLS = {
  Physical: ["Athletics", "Brawl", "Craft", "Drive", "Firearms", "Larceny", "Melee", "Stealth", "Survival"],
  Social:   ["Animal_Ken", "Etiquette", "Insight", "Intimidation", "Leadership", "Performance", "Persuasion", "Streetwise", "Subterfuge"],
  Mental:   ["Academics", "Awareness", "Finance", "Investigation", "Medicine", "Occult", "Politics", "Science", "Technology"],
};

const ALL_SKILLS = Object.values(SKILLS).flat();

// These four skills grant a free specialty automatically if you have any dots
const AUTO_SPECIALTY_SKILLS = ["Academics", "Craft", "Performance", "Science"];

// Suggested specialties per skill — sourced from V5 core rulebook (TAISYKLES)
const SPECIALTY_SUGGESTIONS = {
  Athletics:    ["Acrobatics", "Archery", "Climbing", "Endurance", "Jumping", "Parkour", "Swimming", "Throwing"],
  Brawl:        ["Animals", "Armed Mortals", "Bar Fights", "Grappling", "Kindred", "Sporting Combat", "Unarmed Mortals", "Werewolves"],
  Craft:        ["Carpentry", "Carving", "Design", "Painting", "Sculpting", "Sewing", "Weaponsmithing"],
  Drive:        ["All-Terrain Vehicles", "Evasion", "Motorcycles", "Street Racing", "Stunts", "Tailing", "Trucks", "Vintage Models"],
  Firearms:     ["Crossbows", "Gunsmithing", "Handguns", "Handloading Ammunition", "Quick-Draw", "Rifles", "Sniper", "Trick Shooting"],
  Larceny:      ["Alarms", "Forgery", "Grand Theft Auto", "Housebreaking", "Lockpicking", "Pickpocket", "Safecracking", "Security Analysis"],
  Melee:        ["Axes", "Chains", "Clubs", "Disarming Blows", "Fencing", "Garrotes", "Improvised Weapons", "Knives", "Stakes", "Swords"],
  Stealth:      ["Ambushes", "Crowds", "Disguise", "Hiding", "Shadowing", "Silent Movement", "Urban", "Wilderness"],
  Survival:     ["Desert", "Hunting", "Jungle", "Shelters", "Tracking", "Traps", "Urban Exploration", "Woodlands"],
  Animal_Ken:   ["Attack Training", "Cats", "Dogs", "Falconry", "Horses", "Pacification", "Rats", "Snakes", "Wolves"],
  Etiquette:    ["Anarch", "Camarilla", "Celebrities", "Corporate", "Elysium", "Feudal", "One-Percenter", "Secret Society"],
  Insight:      ["Ambitions", "Desires", "Detect Lies", "Emotions", "Empathy", "Interrogation", "Motives", "Phobias"],
  Intimidation: ["Extortion", "Insults", "Interrogation", "Physical Coercion", "Staredowns", "Veiled Threats"],
  Leadership:   ["Command", "Inspiration", "Oratory", "Praxis", "Team Dynamics", "War Pack"],
  Performance:  ["Comedy", "Dance", "Drama", "Drums", "Guitar", "Keyboards", "Poetry", "Public Speaking", "Rap", "Singing", "Violin", "Wind Instruments"],
  Persuasion:   ["Bargaining", "Fast Talk", "Interrogation", "Legal Argument", "Negotiation", "Rhetoric"],
  Streetwise:   ["Arms Dealing", "Black Market", "Bribery", "Drugs", "Fence Stolen Goods", "Gangs", "Graffiti", "Urban Survival"],
  Subterfuge:   ["Bluff", "Feign Mortality", "Impeccable Lies", "Innocence", "Seduction", "The Long Con"],
  Academics:    ["Architecture", "History", "Journalism", "Literature", "Philosophy", "Research", "Teaching", "Theology"],
  Awareness:    ["Ambushes", "Camouflage", "Concealed Objects", "Hearing", "Instincts", "Sight", "Smell", "Traps", "Wilderness"],
  Finance:      ["Banking", "Black Markets", "Corporate Finance", "Fine Art", "Forensic Accounting", "Money Laundering", "Stock Market"],
  Investigation:["Criminology", "Deduction", "Forensics", "Missing Persons", "Murder", "Paranormal Mysteries", "Traffic Analysis"],
  Medicine:     ["First Aid", "Haematology", "Pathology", "Pharmacy", "Phlebotomy", "Surgery", "Trauma Care", "Veterinary"],
  Occult:       ["Blood Magic", "Cults", "Ghosts", "Kindred Lore", "Lore of the Clans", "Rituals", "Vampiric Lineages", "Witchcraft"],
  Politics:     ["Anarchs", "Camarilla", "City Government", "Clan Politics", "Diplomacy", "Media", "National Politics"],
  Science:      ["Astronomy", "Biology", "Chemistry", "Demolitions", "Engineering", "Genetics", "Mathematics", "Physics"],
  Technology:   ["Computer Hacking", "Electronics", "Photography", "Programming", "Security Systems", "Social Media", "Surveillance"],
};

const DISTRIBUTIONS = {
  jack: {
    label: "Jack of All Trades",
    desc: "Wide breadth. One skill at 3, eight at 2, ten at 1.",
    maxLevel: 3,
    tiers: [{ value: 3, need: 1 }, { value: 2, need: 8 }, { value: 1, need: 10 }],
  },
  balanced: {
    label: "Balanced",
    desc: "Even spread. Three skills at 3, five at 2, seven at 1.",
    maxLevel: 3,
    tiers: [{ value: 3, need: 3 }, { value: 2, need: 5 }, { value: 1, need: 7 }],
  },
  specialist: {
    label: "Specialist",
    desc: "Deep focus. One skill at 4, three at 3, three at 2, three at 1.",
    maxLevel: 4,
    tiers: [{ value: 4, need: 1 }, { value: 3, need: 3 }, { value: 2, need: 3 }, { value: 1, need: 3 }],
  },
};

const emptySkills = ALL_SKILLS.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});

// ── SpecialtyInput ────────────────────────────────────────────────────────────
// Text input that shows rulebook suggestions for the given skill as a datalist.
// The player can pick a suggestion or type anything custom.

function SpecialtyInput({ skillName, value, onChange, placeholder, disabled, className }) {
  const listId = skillName ? `suggestions-${skillName}` : null;
  const suggestions = (skillName && SPECIALTY_SUGGESTIONS[skillName]) || [];
  return (
    <div className="relative flex-1">
      <input
        list={listId || undefined}
        className={className || "vtm-input"}
        placeholder={placeholder || "Specialty name…"}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      {listId && suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Step5Skills({ onNext, onBack }) {
  const { data, saveStep, error } = useWizardStore();

  const saved = data.step4 || {};

  // ── All state at the top (React rules of hooks) ──────────────────────────
  const [distribution, setDistribution] = useState(saved.distribution || "");
  const [skills, setSkills]             = useState(saved.skills || emptySkills);
  const [specialties, setSpecialties]   = useState(saved.specialties || []);

  // Free extra specialty fields — must be declared here, before any use
  const savedFree = (saved.specialties || []).find((s) => !AUTO_SPECIALTY_SKILLS.includes(s.skill_name));
  const [freeSkill, setFreeSkill] = useState(savedFree?.skill_name || "");
  const [freeName, setFreeName]   = useState(savedFree?.specialty_name || "");

  // ── Derived values (no hooks below this line) ────────────────────────────

  const dist = DISTRIBUTIONS[distribution];

  // Count how many skills sit at each dot level
  const valueCounts = useMemo(() => {
    const counts = {};
    Object.values(skills).forEach((v) => {
      if (v > 0) counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }, [skills]);

  // Set of skill names that have at least 1 dot
  const skillsWithDots = useMemo(
    () => new Set(Object.entries(skills).filter(([_k, v]) => v > 0).map(([k]) => k)),
    [skills]
  );

  // Auto-specialty skills the player has dots in → must provide a specialty for each
  const requiredAutoSpecialties = AUTO_SPECIALTY_SKILLS.filter((s) => skillsWithDots.has(s));

  // Distribution is valid when every tier count matches exactly and no out-of-range values
  const distributionValid = dist
    ? dist.tiers.every(({ value, need }) => (valueCounts[value] || 0) === need) &&
      Object.values(skills).every((v) => v === 0 || dist.tiers.some((t) => t.value === v))
    : false;

  // Every required auto-specialty skill must have a non-empty specialty name provided
  const autoSpecialtiesDone = requiredAutoSpecialties.every((skill) => {
    const sp = specialties.find((s) => s.skill_name === skill);
    return sp && sp.specialty_name.trim();
  });

  // The free extra specialty needs both a skill and a name
  const freeSpecialtyDone = !!freeSkill && !!freeName.trim();

  const isValid = !!distribution && distributionValid && autoSpecialtiesDone && freeSpecialtyDone;

  // ── Skill interaction ────────────────────────────────────────────────────

  const setSkill = (name, value) => {
    if (!dist) return;
    const clamped = Math.max(0, Math.min(dist.maxLevel, value));
    setSkills((prev) => ({ ...prev, [name]: clamped }));
    // Remove any specialties for this skill if dots are cleared
    if (clamped === 0) {
      setSpecialties((prev) => prev.filter((sp) => sp.skill_name !== name));
      if (freeSkill === name) { setFreeSkill(""); setFreeName(""); }
    }
  };

  // ── Auto-specialty interaction ───────────────────────────────────────────

  const setAutoSpecialtyName = (skillName, value) => {
    setSpecialties((prev) => {
      const exists = prev.find((s) => s.skill_name === skillName);
      if (exists) {
        return prev.map((s) => s.skill_name === skillName ? { ...s, specialty_name: value } : s);
      }
      return [...prev, { skill_name: skillName, specialty_name: value }];
    });
  };

  const getAutoSpecialtyName = (skillName) =>
    specialties.find((s) => s.skill_name === skillName)?.specialty_name || "";

  // ── Free specialty interaction ───────────────────────────────────────────

  const updateFreeSpecialty = (skill, name) => {
    setFreeSkill(skill);
    setFreeName(name);
    // Keep auto-specialties, replace the free one
    setSpecialties((prev) => {
      const autoOnly = prev.filter((s) => AUTO_SPECIALTY_SKILLS.includes(s.skill_name));
      if (skill && name.trim()) {
        return [...autoOnly, { skill_name: skill, specialty_name: name }];
      }
      return autoOnly;
    });
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleNext = async () => {
    const ok = await saveStep(4, { distribution, skills, specialties });
    if (ok) onNext();
  };

  const displayName = (s) => s.replace("_", " ");

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-gothic text-3xl text-blood">Skills</h2>
        <button
          onClick={() => {
            const r = randomSkills();
            setDistribution(r.distribution);
            setSkills(r.skills);
            setSpecialties(r.specialties);
            setFreeSkill(r.freeSkill);
            setFreeName(r.freeName);
          }}
          className="text-xs border border-void-border text-gray-500 hover:border-blood hover:text-blood transition-colors rounded px-3 py-1.5 font-gothic tracking-wider shrink-0"
        >
          ✦ Suggest
        </button>
      </div>
      <p className="text-gray-400 mb-6">Choose a distribution style, then fill in your skill dots.</p>

      {/* Distribution picker */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Object.entries(DISTRIBUTIONS).map(([key, d]) => (
          <div
            key={key}
            onClick={() => {
              setDistribution(key);
              setSkills(emptySkills);
              setSpecialties([]);
              setFreeSkill("");
              setFreeName("");
            }}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              distribution === key
                ? "border-blood bg-blood-dark/20"
                : "border-void-border bg-void-light hover:border-gray-500"
            }`}
          >
            <h3 className="font-gothic text-sm text-gray-200 mb-1">{d.label}</h3>
            <p className="text-gray-600 text-xs">{d.desc}</p>
          </div>
        ))}
      </div>

      {/* Per-tier progress counters */}
      {dist && (
        <div className="bg-void-light border border-void-border rounded p-3 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Dots remaining</p>
          <div className="flex flex-wrap gap-4">
            {dist.tiers.map(({ value, need }) => {
              const have      = valueCounts[value] || 0;
              const remaining = need - have;
              const done      = remaining === 0;
              return (
                <span key={value} className={`text-sm font-gothic ${done ? "text-green-400" : "text-blood"}`}>
                  {done ? `✓ ${need}×${value}` : `${remaining} more at ${value}`}
                </span>
              );
            })}
            {distributionValid && <span className="text-green-400 text-sm font-gothic ml-2">✓ Complete!</span>}
          </div>
        </div>
      )}

      {/* Skill grid — only visible after picking a distribution */}
      {dist && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          {Object.entries(SKILLS).map(([category, skillList]) => (
            <div key={category}>
              <h3 className="font-gothic text-blood text-sm mb-3 uppercase tracking-wider">{category}</h3>
              <div className="space-y-3">
                {skillList.map((skill) => {
                  const val = skills[skill];
                  return (
                    <div key={skill}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm">{displayName(skill)}</span>
                        <span className={`font-gothic text-sm ${val > 0 ? "text-blood" : "text-gray-700"}`}>
                          {val}
                        </span>
                      </div>
                      {/* Dots 1..maxLevel — click filled dot to reduce, click empty to fill */}
                      <div className="flex gap-1">
                        {Array.from({ length: dist.maxLevel }, (_, i) => i + 1).map((v) => (
                          <button
                            key={v}
                            onClick={() => setSkill(skill, val === v ? v - 1 : v)}
                            title={val === v ? "Click to remove" : `Set to ${v}`}
                            className={`w-5 h-5 rounded-full border transition-colors ${
                              v <= val
                                ? "bg-blood border-blood"
                                : "bg-transparent border-void-border hover:border-gray-500"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Specialties section */}
      {dist && (
        <div className="bg-void-light border border-void-border rounded-lg p-5">
          <h3 className="font-gothic text-blood text-sm uppercase tracking-wider mb-1">Specialties</h3>
          <p className="text-gray-500 text-xs mb-4">
            Academics, Craft, Performance, and Science get a free specialty if you have dots in them.
            You also get one additional free specialty in any skill with dots.
          </p>

          {/* Auto-specialties for Academics/Craft/Performance/Science — always visible */}
          <div className="mb-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Auto-specialties (required when you have dots)</p>
            {AUTO_SPECIALTY_SKILLS.map((skill) => {
              const hasDots  = skillsWithDots.has(skill);
              const val      = getAutoSpecialtyName(skill);
              const required = hasDots;
              return (
                <div key={skill} className={`flex items-center gap-3 ${!hasDots ? "opacity-40" : ""}`}>
                  <span className="text-gray-300 text-sm w-28 shrink-0">{displayName(skill)}</span>
                  <SpecialtyInput
                    skillName={hasDots ? skill : null}
                    value={val}
                    disabled={!hasDots}
                    placeholder={`e.g. ${skill === "Academics" ? "History" : skill === "Craft" ? "Carpentry" : skill === "Performance" ? "Singing" : "Chemistry"}`}
                    onChange={(v) => setAutoSpecialtyName(skill, v)}
                  />
                  <span className={`text-sm w-4 text-center ${!required ? "text-gray-700" : val.trim() ? "text-green-400" : "text-blood"}`}>
                    {!required ? "—" : val.trim() ? "✓" : "!"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Free extra specialty */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Free specialty (any skill with dots)</p>
            <div className="flex gap-3">
              <select
                value={freeSkill}
                onChange={(e) => updateFreeSpecialty(e.target.value, freeName)}
                className="vtm-input flex-1"
              >
                <option value="">Select skill...</option>
                {ALL_SKILLS.filter((s) => skillsWithDots.has(s)).map((s) => (
                  <option key={s} value={s}>{displayName(s)}</option>
                ))}
              </select>
              <SpecialtyInput
                skillName={freeSkill || null}
                value={freeName}
                placeholder={freeSkill ? `e.g. ${(SPECIALTY_SUGGESTIONS[freeSkill] || ["…"])[0]}` : "Pick a skill first…"}
                disabled={!freeSkill}
                onChange={(v) => updateFreeSpecialty(freeSkill, v)}
              />
              <span className={freeSkill && freeName.trim() ? "text-green-400 text-sm self-center" : "text-blood text-sm self-center"}>
                {freeSkill && freeName.trim() ? "✓" : "!"}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-blood mt-4 text-sm">{error}</p>}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="vtm-btn-secondary">← Back</button>
        <button onClick={handleNext} disabled={!isValid} className="vtm-btn">
          Next: Disciplines →
        </button>
      </div>
    </div>
  );
}
