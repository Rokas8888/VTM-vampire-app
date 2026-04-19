// ── Wizard randomization helpers ─────────────────────────────────────────────
// Each function returns a valid random state object that satisfies V5 rules.

export const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// ── Step 1 — Core Concept ────────────────────────────────────────────────────

const NAMES = [
  "Sebastian Cross", "Vivienne Noir", "Damian Vex", "Isolde Crane", "Lucian Morrow",
  "Seraphina Blackwood", "Nikolai Dusk", "Callista Thorn", "Raphael Vane", "Morrigan Vale",
  "Dorian Ashcroft", "Elena Ravenswood", "Marcus Fell", "Sylvana Crowe", "Viktor Shade",
  "Celeste Mourning", "Alistair Grave", "Nadia Sable", "Caspian Darke", "Aurelia Voss",
  "Theron Blackwell", "Lyra Vesper", "Cassian Dread", "Zara Nighthollow", "Edmund Pale",
  "Rosalind Ash", "Oberon Sorrow", "Vanya Crux", "Leander Fell", "Mirella Storm",
];

const CONCEPTS = [
  "Fallen priest seeking redemption",
  "Former detective who knows too much",
  "Disgraced surgeon hiding from their past",
  "Underground musician who sold more than their soul",
  "Corrupt politician who accepted the wrong deal",
  "Art forger with a genuine eye for beauty",
  "Ex-military sniper haunted by orders followed",
  "Club owner who built an empire on secrets",
  "Scholar who researched vampires and found the truth",
  "Street preacher who found the wrong kind of truth",
  "Con artist who finally conned the wrong mark",
  "Grieving parent who made a desperate bargain",
  "Revolutionary Embraced by the cause they fought",
  "Celebrity whose fame could not save them",
  "Nurse who chose death over watching others suffer",
  "Retired judge who cannot escape their past verdicts",
  "Hacker who broke into one system too many",
  "War correspondent who witnessed something inhuman",
  "Disgraced aristocrat clinging to faded prestige",
  "Social worker Embraced while trying to help a client",
];

const AMBITIONS = [
  "Find and destroy my sire",
  "Claim a domain of my own within the city",
  "Infiltrate the inner circle of the Camarilla",
  "Uncover the truth behind my Embrace",
  "Achieve Golconda — reclaim my humanity",
  "Build a network of mortal pawns across the city",
  "Become the power behind a mortal throne",
  "Avenge the death of someone I loved",
  "Expose the Prince's corruption",
  "Master all three of my clan's disciplines",
  "Find the one who diablerized my sire",
  "Establish a haven no elder can touch",
  "Unite the Anarch gangs under one banner",
  "Ascend to a seat on the Primogen council",
  "Accumulate enough wealth to be untouchable",
  "Survive long enough to understand why I was Embraced",
  "Track down and destroy a specific ancient enemy",
  "Become the most feared name in this city's underworld",
];

const DESIRES = [
  "Feed without hurting anyone tonight",
  "Find peace before the Beast takes over",
  "Reconnect with a mortal I used to love",
  "Silence the guilt that keeps me awake",
  "Earn the trust of at least one other Kindred",
  "Survive this week without drawing attention",
  "Make amends for what I did last month",
  "Find out who is watching my haven",
  "Protect a mortal who does not know what I am",
  "Get through Elysium without embarrassing myself",
  "Track down a vessel I have grown too attached to",
  "Recover something stolen from me",
  "Have one night where I feel almost human",
  "Learn whether my sire is still alive",
  "Get out of a debt I owe to a dangerous elder",
];

export function randomConcept() {
  return {
    name:     pick(NAMES),
    concept:  pick(CONCEPTS),
    ambition: pick(AMBITIONS),
    desire:   pick(DESIRES),
  };
}

// ── Step 2 — Clan ────────────────────────────────────────────────────────────

export function randomClan(clans) {
  return pick(clans)?.id ?? null;
}

// ── Step 3 — Attributes ──────────────────────────────────────────────────────
// Rule: one at 4, three at 3, four at 2, one at 1

const ALL_ATTRS = [
  "Strength","Dexterity","Stamina",
  "Charisma","Manipulation","Composure",
  "Intelligence","Wits","Resolve",
];

export function randomAttributes() {
  const shuffled = shuffle(ALL_ATTRS);
  const values   = [4, 3, 3, 3, 2, 2, 2, 2, 1];
  const attrs    = {};
  shuffled.forEach((attr, i) => { attrs[attr] = values[i]; });
  return attrs;
}

// ── Step 4 — Skills ──────────────────────────────────────────────────────────

const DISTRIBUTIONS = {
  jack:       { tiers: [{ value: 3, need: 1 }, { value: 2, need: 8 }, { value: 1, need: 10 }], maxLevel: 3 },
  balanced:   { tiers: [{ value: 3, need: 3 }, { value: 2, need: 5 }, { value: 1, need: 7 }],  maxLevel: 3 },
  specialist: { tiers: [{ value: 4, need: 1 }, { value: 3, need: 3 }, { value: 2, need: 3 }, { value: 1, need: 3 }], maxLevel: 4 },
};

const ALL_SKILLS = [
  "Athletics","Brawl","Craft","Drive","Firearms","Larceny","Melee","Stealth","Survival",
  "Animal_Ken","Etiquette","Insight","Intimidation","Leadership","Performance","Persuasion","Streetwise","Subterfuge",
  "Academics","Awareness","Finance","Investigation","Medicine","Occult","Politics","Science","Technology",
];

const AUTO_SPECIALTY_SKILLS = ["Academics", "Craft", "Performance", "Science"];

const SPECIALTY_SUGGESTIONS = {
  Athletics: ["Acrobatics","Climbing","Endurance","Parkour","Swimming"],
  Brawl: ["Grappling","Kindred","Bar Fights","Unarmed Mortals"],
  Craft: ["Carpentry","Painting","Sculpting","Weaponsmithing"],
  Drive: ["Motorcycles","Street Racing","Evasion","Stunts"],
  Firearms: ["Handguns","Rifles","Sniper","Quick-Draw"],
  Larceny: ["Lockpicking","Pickpocket","Safecracking","Forgery"],
  Melee: ["Knives","Swords","Improvised Weapons","Stakes"],
  Stealth: ["Silent Movement","Shadowing","Disguise","Urban"],
  Survival: ["Hunting","Tracking","Urban Exploration","Woodlands"],
  Animal_Ken: ["Dogs","Cats","Rats","Wolves"],
  Etiquette: ["Camarilla","Corporate","Elysium","One-Percenter"],
  Insight: ["Detect Lies","Emotions","Motives","Interrogation"],
  Intimidation: ["Coercion","Staredowns","Veiled Threats","Interrogation"],
  Leadership: ["Command","Inspiration","Oratory","War Pack"],
  Performance: ["Singing","Guitar","Drama","Public Speaking"],
  Persuasion: ["Negotiation","Fast Talk","Rhetoric","Bargaining"],
  Streetwise: ["Black Market","Gangs","Bribery","Arms Dealing"],
  Subterfuge: ["Bluff","Seduction","Impeccable Lies","Feign Mortality"],
  Academics: ["History","Research","Philosophy","Theology"],
  Awareness: ["Ambushes","Instincts","Hearing","Sight"],
  Finance: ["Corporate Finance","Money Laundering","Banking","Stock Market"],
  Investigation: ["Forensics","Deduction","Murder","Missing Persons"],
  Medicine: ["First Aid","Phlebotomy","Surgery","Haematology"],
  Occult: ["Kindred Lore","Blood Magic","Ghosts","Rituals"],
  Politics: ["Camarilla","City Government","Diplomacy","Anarchs"],
  Science: ["Biology","Chemistry","Engineering","Physics"],
  Technology: ["Computer Hacking","Programming","Security Systems","Electronics"],
};

export function randomSkills() {
  const distKey = pick(Object.keys(DISTRIBUTIONS));
  const dist    = DISTRIBUTIONS[distKey];

  // Build a flat pool of dot values and shuffle skills to receive them
  const pool    = dist.tiers.flatMap(({ value, need }) => Array(need).fill(value));
  const targets = shuffle(ALL_SKILLS).slice(0, pool.length);
  const skills  = ALL_SKILLS.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  targets.forEach((skill, i) => { skills[skill] = pool[i]; });

  const skillsWithDots = new Set(Object.entries(skills).filter(([, v]) => v > 0).map(([k]) => k));
  const specialties    = [];

  // Auto-specialties for Academics/Craft/Performance/Science
  AUTO_SPECIALTY_SKILLS.forEach((skill) => {
    if (skillsWithDots.has(skill)) {
      specialties.push({
        skill_name:     skill,
        specialty_name: pick(SPECIALTY_SUGGESTIONS[skill] || ["General"]),
      });
    }
  });

  // Free specialty — prefer a skill NOT in auto list
  const nonAutoWithDots = [...skillsWithDots].filter((s) => !AUTO_SPECIALTY_SKILLS.includes(s));
  const freeSkill = nonAutoWithDots.length > 0 ? pick(nonAutoWithDots)
    : skillsWithDots.size > 0 ? pick([...skillsWithDots]) : "";
  const freeName  = freeSkill ? pick(SPECIALTY_SUGGESTIONS[freeSkill] || ["General"]) : "";

  if (freeSkill && freeName) {
    const alreadyThere = specialties.find((s) => s.skill_name === freeSkill);
    if (!alreadyThere) specialties.push({ skill_name: freeSkill, specialty_name: freeName });
  }

  return { distribution: distKey, skills, specialties, freeSkill, freeName };
}

// ── Step 5 — Disciplines ─────────────────────────────────────────────────────
// clanDisciplines: array of { id, name }
// allPowers: { [discId]: [{ id, name, level }] }
// Returns selections[] compatible with Step6Disciplines state

export function randomDisciplines(clanDisciplines, allPowers) {
  if (clanDisciplines.length === 0) return null;

  // Pick up to 2 disciplines
  const chosen = shuffle(clanDisciplines).slice(0, Math.min(2, clanDisciplines.length));
  if (chosen.length < 2) return null; // not enough disciplines loaded

  // Assign dots: 2+1 or 1+2
  const [d0dots, d1dots] = pick([[2, 1], [1, 2]]);
  const dotMap = [d0dots, d1dots];

  return chosen.map((disc, i) => {
    const level  = dotMap[i];
    const powers = allPowers[disc.id] || [];
    const powerIds = [];
    for (let lvl = 1; lvl <= level; lvl++) {
      const available = powers.filter((p) => p.level === lvl && !powerIds.includes(p.id));
      if (available.length > 0) powerIds.push(pick(available).id);
    }
    return { discipline_id: disc.id, level, power_ids: powerIds };
  });
}

// ── Step 6 — Advantages ──────────────────────────────────────────────────────
// Returns { advantages: [...], flaws: [...] }

export function randomAdvantages(merits, backgrounds, flaws) {
  // Only pick items that don't require free-text specification
  const pool = [
    ...merits.filter((m) => !m.requires_custom_text).map((m) => ({ ...m, itemType: "merit" })),
    ...backgrounds.map((b) => ({ ...b, itemType: "background" })),
  ];

  // Fill up to 7 points, always buying at level 1 for simplicity
  let budget = 7;
  const chosen = [];
  for (const item of shuffle(pool)) {
    if (budget <= 0) break;
    const cost = item.cost ?? 1;
    if (cost <= budget) {
      chosen.push({ id: item.id, type: item.itemType, level: 1 });
      budget -= cost;
    }
  }

  // Flaws: exactly 2 points
  const safeFlaws     = flaws.filter((f) => !f.requires_custom_text);
  const twoPointFlaws = safeFlaws.filter((f) => f.value === 2);
  const onePointFlaws = safeFlaws.filter((f) => f.value === 1);

  let chosenFlaws = [];
  if (twoPointFlaws.length > 0 && (onePointFlaws.length < 2 || Math.random() > 0.4)) {
    chosenFlaws = [{ id: pick(twoPointFlaws).id }];
  } else if (onePointFlaws.length >= 2) {
    const two = shuffle(onePointFlaws).slice(0, 2);
    chosenFlaws = two.map((f) => ({ id: f.id }));
  } else if (twoPointFlaws.length > 0) {
    chosenFlaws = [{ id: pick(twoPointFlaws).id }];
  }

  return { advantages: chosen, flaws: chosenFlaws };
}

// ── Step 7 — Beliefs ─────────────────────────────────────────────────────────

const CONVICTION_PAIRS = [
  { conviction: "I will never harm a child",                touchstone: "My niece Sofia — bright and curious, she has no idea what I am" },
  { conviction: "I will not betray those who trust me",     touchstone: "Detective Reyes — my old partner, still on the force" },
  { conviction: "I will protect the innocent when I can",   touchstone: "Father Benedikt — a priest who never stopped believing in me" },
  { conviction: "I will not kill for sport or pleasure",    touchstone: "My sister Amara — she thinks I just moved away" },
  { conviction: "I will always keep my word once given",    touchstone: "Professor Lange — my stubborn, principled old mentor" },
  { conviction: "I will not abandon someone in danger",     touchstone: "Maya — the nurse who saved my life before the Embrace" },
  { conviction: "I will not feed on those who cannot flee", touchstone: "Tomás — a homeless man I protected once, years ago" },
  { conviction: "I will never let go of what I love most",  touchstone: "My mother — she still lights a candle for me every Sunday" },
  { conviction: "I will not break a vow made to the dead",  touchstone: "Kira — my best friend before she was killed" },
  { conviction: "I will remember that mortals have names",  touchstone: "Jonah — a barista who treats everyone with the same kindness" },
];

export function randomBeliefs() {
  const numConvictions = pick([1, 1, 2]); // bias toward fewer
  const pairs = shuffle(CONVICTION_PAIRS).slice(0, numConvictions);
  return {
    convictions: pairs.map(({ conviction, touchstone }) => ({ conviction, touchstone })),
    tenets: [],
  };
}

// ── Step 8 — Humanity ────────────────────────────────────────────────────────
// V5 default is 7 — no real randomization needed here

export function randomHumanity() {
  return 7;
}

// ── Step 9 — Predator Type ───────────────────────────────────────────────────

export function randomPredatorType(types) {
  const pt      = pick(types);
  const choices = pt.choices_json ? JSON.parse(pt.choices_json) : null;

  let chosenDiscipline    = null;
  let chosenSpecialtySkill = null;
  let chosenSpecialtyName  = null;
  let chosenFlaw           = null;

  if (choices) {
    if (choices.discipline?.length > 1) {
      chosenDiscipline = pick(choices.discipline).name;
    }
    if (choices.specialty?.length > 1) {
      const s = pick(choices.specialty);
      chosenSpecialtySkill = s.skill;
      chosenSpecialtyName  = s.name;
    }
    if (choices.flaw?.length > 1) {
      chosenFlaw = pick(choices.flaw).name;
    }
  }

  return { selected: pt.id, chosenDiscipline, chosenSpecialtySkill, chosenSpecialtyName, chosenFlaw };
}

// ── Step 10 — Generation ─────────────────────────────────────────────────────

const BIOGRAPHIES = [
  "I remember the last night I was truly alive. The city smelled like rain and cigarettes. I thought I understood what darkness was. I did not.",
  "My sire told me the Embrace was a gift. Three years later, I am still deciding whether I believe them.",
  "I have burned every photograph of myself from before. There is no point carrying the face of someone who no longer exists.",
  "I spent my first month convinced it was a nightmare. By the second month, I had stopped hoping to wake up.",
  "The world looks different through these eyes. Sharper. Hungrier. I am learning to make peace with what I have become.",
  "Some nights I go back to the street where I died. I do not know what I am looking for. Maybe I am just saying goodbye.",
];

export function randomGeneration() {
  return {
    generation: pick(["childer", "neonate", "ancillae"]),
    biography:  pick(BIOGRAPHIES),
  };
}
