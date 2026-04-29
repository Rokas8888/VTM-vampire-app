# GM Manage Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GM "Manage ▾" dropdown to Session Mode that lets the GM directly adjust Humanity and Blood Potency per character card, plus fix CharacterSheet mobile layout issues found in QA.

**Architecture:** Two independent tracks. Track A adds management mode state + UI to `SessionModePage.jsx` only — no backend changes needed (existing `PUT /api/characters/{id}` accepts partial updates). Track B fixes six mobile layout issues in `CharacterSheet.jsx`'s `StatColumn` component and its parent containers.

**Tech Stack:** React 18, TailwindCSS, Axios (`api` instance from `services/api.js`)

---

## Track A — GM Manage Dropdown (SessionModePage.jsx)

### Task 1: Add manage state + "Manage ▾" dropdown button

**Files:**
- Modify: `frontend/src/pages/SessionModePage.jsx` — header area (lines 465–488)

- [ ] **Step 1: Add state variables**

Find the existing state declarations in `SessionModePage` (around line 400) and add these four:

```jsx
const [manageMode, setManageMode]               = useState(null); // "humanity" | "blood_potency" | null
const [activeCard, setActiveCard]               = useState(null); // charId | null
const [statOverrides, setStatOverrides]         = useState({});   // { [charId]: { humanity?: number, blood_potency?: number } }
const [showManageDropdown, setShowManageDropdown] = useState(false);
```

- [ ] **Step 2: Add Manage button to header**

In the header's right-side `<div className="flex items-center gap-4">` (line 476), add the Manage button **before** the "← Dashboard" button:

```jsx
{/* Manage dropdown — GM only */}
{isGM && (
  <div className="relative">
    <button
      onClick={() => setShowManageDropdown((v) => !v)}
      className="text-xs font-gothic tracking-wider text-gray-500 hover:text-blood border border-void-border hover:border-blood rounded px-3 py-1 transition-colors"
    >
      Manage ▾
    </button>
    {showManageDropdown && (
      <div className="absolute right-0 top-full mt-1 bg-void border border-void-border rounded shadow-lg z-20 min-w-[150px]">
        {[
          { key: "humanity",      label: "Humanity" },
          { key: "blood_potency", label: "Blood Potency" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setManageMode(key);
              setActiveCard(null);
              setShowManageDropdown(false);
            }}
            className="w-full text-left px-3 py-2 text-xs font-gothic text-gray-400 hover:text-blood hover:bg-void-light transition-colors first:rounded-t last:rounded-b"
          >
            {label}
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Close dropdown on outside click using a ref**

Add a `useRef` import (it's already imported with `useEffect`, `useState`, `useCallback` — check the import line at the top of the file and add `useRef` if missing).

Add the ref and effect:

```jsx
const manageRef = useRef(null);

useEffect(() => {
  if (!showManageDropdown) return;
  const close = (e) => {
    if (manageRef.current && !manageRef.current.contains(e.target)) {
      setShowManageDropdown(false);
    }
  };
  document.addEventListener("mousedown", close);
  return () => document.removeEventListener("mousedown", close);
}, [showManageDropdown]);
```

Also add `ref={manageRef}` to the wrapping `<div className="relative">` of the Manage button:

```jsx
<div className="relative" ref={manageRef}>
```

- [ ] **Step 4: Build and verify**

```bash
cd frontend && npm run build
```
Expected: `✓ built` with no errors. Dropdown button appears in header for GM role.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SessionModePage.jsx
git commit -m "feat: add GM Manage dropdown button to session mode"
```

---

### Task 2: Add mode banner + card dimming

**Files:**
- Modify: `frontend/src/pages/SessionModePage.jsx` — below header, card grid

- [ ] **Step 1: Add mode banner below the header**

After the error block (after line 492 `{error && ...}`), add the mode banner:

```jsx
{/* Management mode banner */}
{manageMode && (
  <div className="flex items-center justify-between px-4 py-2 bg-blood-dark/20 border border-blood-dark/60 rounded mb-4 gap-3">
    <span className="text-sm font-gothic text-blood">
      ⚑ {manageMode === "humanity" ? "Humanity" : "Blood Potency"} Mode — tap a character card to adjust
    </span>
    <button
      onClick={() => { setManageMode(null); setActiveCard(null); }}
      className="text-xs font-gothic text-blood-dark hover:text-blood border border-blood-dark hover:border-blood rounded px-2 py-0.5 transition-colors shrink-0"
    >
      Exit
    </button>
  </div>
)}
```

- [ ] **Step 2: Pass manage props to SessionCard**

Find the `SessionCard` usage in the card grid (around line 502). Add the new props:

```jsx
<SessionCard
  key={char.id}
  char={char}
  player={player}
  conditions={conditionsMap[char.id] ?? []}
  isGM={isGM}
  onConditionsChange={() => refreshConditionsFor(char.id)}
  lastRoll={lastRollMap[player] ?? null}
  onOpenRetainer={openRetainer}
  manageMode={manageMode}
  isActive={activeCard === char.id}
  onActivate={() => setActiveCard(char.id)}
  statOverrides={statOverrides[char.id] ?? {}}
  onStatChange={(stat, delta) => handleStatChange(char.id, stat, delta)}
/>
```

- [ ] **Step 3: Add handleStatChange function**

Add this function in `SessionModePage`, near the other handlers:

```jsx
const handleStatChange = async (charId, stat, delta) => {
  const card    = cards.find((c) => c.char.id === charId);
  const current = statOverrides[charId]?.[stat] ?? card?.char[stat] ?? 0;
  const max     = stat === "humanity" ? 10 : 5;
  const newVal  = Math.max(0, Math.min(max, current + delta));

  // Optimistic update
  setStatOverrides((prev) => ({
    ...prev,
    [charId]: { ...prev[charId], [stat]: newVal },
  }));

  try {
    await api.put(`/api/characters/${charId}`, { [stat]: newVal });
  } catch {
    // Revert on failure
    setStatOverrides((prev) => ({
      ...prev,
      [charId]: { ...prev[charId], [stat]: current },
    }));
  }
};
```

- [ ] **Step 4: Build and verify**

```bash
cd frontend && npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SessionModePage.jsx
git commit -m "feat: add management mode banner and stat override logic"
```

---

### Task 3: Wire SessionCard for management mode

**Files:**
- Modify: `frontend/src/pages/SessionModePage.jsx` — `SessionCard` component (lines 168–)

- [ ] **Step 1: Update SessionCard props signature**

Find the `SessionCard` function definition (line 168):

```jsx
// Before
function SessionCard({ char, player, conditions, isGM, onConditionsChange, lastRoll, onOpenRetainer }) {

// After
function SessionCard({ char, player, conditions, isGM, onConditionsChange, lastRoll, onOpenRetainer,
  manageMode, isActive, onActivate, statOverrides, onStatChange }) {
```

- [ ] **Step 2: Apply dimming + border highlight to the card wrapper**

Find the outer card `<div>` (line 174–176):

```jsx
// Before
<div
  className="border border-void-border rounded-lg p-4 flex flex-col gap-4 hover:border-blood/40 transition-colors"
  style={clanCardStyle(char.clan_name)}
>

// After
<div
  onClick={manageMode && !isActive ? onActivate : undefined}
  className={`border rounded-lg p-4 flex flex-col gap-4 transition-colors ${
    manageMode && !isActive
      ? "opacity-50 border-void-border cursor-pointer hover:opacity-70"
      : isActive
      ? "border-blood opacity-100"
      : "border-void-border hover:border-blood/40"
  }`}
  style={clanCardStyle(char.clan_name)}
>
```

- [ ] **Step 3: Add +/− controls to the stat rows**

Find the Blood Potency / Humanity / Hunger stat section (lines 219–233):

```jsx
// Replace the entire stat section with this:
<div className="flex flex-col gap-1.5">
  {[
    { key: "blood_potency", label: "Blood Pot.", max: 5,  variant: "blood"   },
    { key: "humanity",      label: "Humanity",   max: 10, variant: "blood"   },
    { key: "current_hunger",label: "Hunger",     max: 5,  variant: "hunger"  },
  ].map(({ key, label, max, variant }) => {
    const isManagedStat = manageMode === key;
    const displayVal    = statOverrides[key] ?? char[key] ?? 0;
    return (
      <div key={key} className="flex items-center gap-2">
        <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
        <DotTracker value={displayVal} max={max} variant={variant} />
        {isActive && isManagedStat && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={(e) => { e.stopPropagation(); onStatChange(key, -1); }}
              disabled={displayVal <= 0}
              className="w-5 h-5 rounded border border-void-border text-gray-500 hover:text-blood hover:border-blood disabled:opacity-30 text-xs leading-none transition-colors"
            >−</button>
            <button
              onClick={(e) => { e.stopPropagation(); onStatChange(key, +1); }}
              disabled={displayVal >= max}
              className="w-5 h-5 rounded border border-void-border text-gray-500 hover:text-blood hover:border-blood disabled:opacity-30 text-xs leading-none transition-colors"
            >+</button>
          </div>
        )}
      </div>
    );
  })}
</div>
```

- [ ] **Step 4: Build and verify**

```bash
cd frontend && npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SessionModePage.jsx
git commit -m "feat: GM manage mode — per-card dimming and inline +/− stat controls"
```

---

## Track B — CharacterSheet Mobile Fixes

### Task 4: Fix attributes/skills gap and StatColumn min-width

**Files:**
- Modify: `frontend/src/components/character/CharacterSheet.jsx` — lines 589, 1340, 1353

- [ ] **Step 1: Fix StatColumn min-width**

Line 589 — change `min-w-[160px]` to be responsive:

```jsx
// Before
<div className="flex-1 min-w-[160px]">

// After
<div className="flex-1 min-w-[120px] sm:min-w-[160px]">
```

- [ ] **Step 2: Fix attributes container gap**

Line 1340:

```jsx
// Before
<div className="flex flex-wrap gap-6">

// After
<div className="flex flex-wrap gap-3 sm:gap-6">
```

- [ ] **Step 3: Fix skills container gap**

Line 1353:

```jsx
// Before
<div className="flex flex-wrap gap-6">

// After
<div className="flex flex-wrap gap-3 sm:gap-6">
```

- [ ] **Step 4: Build and verify**

```bash
cd frontend && npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/character/CharacterSheet.jsx
git commit -m "fix: reduce attribute/skill column gap on mobile, responsive min-width"
```

---

### Task 5: Collapsible specialties on mobile + input width fix

**Files:**
- Modify: `frontend/src/components/character/CharacterSheet.jsx` — `StatColumn` component (lines 581–720)

- [ ] **Step 1: Add per-skill specialty open state to StatColumn**

In `StatColumn` (line 581), add state to track which skill's specialties are expanded on mobile:

```jsx
// Add inside StatColumn, after the existing useState declarations (lines 585–586):
const [openSpecs, setOpenSpecs] = useState({});
const toggleSpecs = (skillName) => setOpenSpecs((prev) => ({ ...prev, [skillName]: !prev[skillName] }));
```

- [ ] **Step 2: Replace the specialty section (lines 659–716) with collapsible version**

Replace the entire specialty block:

```jsx
{/* Specialties — collapsible on mobile, always open on sm+ */}
{traitType === "skill" && (specs.length > 0 || (canEditSpecialties && val > 0)) && (
  <div className="ml-0 mt-0.5">
    {/* Mobile toggle — only show when there are existing specialties */}
    {specs.length > 0 && (
      <button
        onClick={() => toggleSpecs(name)}
        className="sm:hidden text-xs text-gray-700 hover:text-blood transition-colors font-gothic"
      >
        {openSpecs[name] ? "▲ Hide" : `▼ ${specs.length} spec${specs.length > 1 ? "s" : ""}`}
      </button>
    )}

    {/* Specialty list — always visible on sm+, toggle-gated on mobile */}
    <div className={`${specs.length > 0 && !openSpecs[name] ? "hidden sm:block" : "block"}`}>
      {specs.map((sp) => (
        <span key={sp} className="inline-flex items-center gap-1 text-blood-dark text-xs mr-2">
          <span className="italic">{sp}</span>
          {canEditSpecialties && onDeleteSpecialty && (
            <button
              onClick={() => onDeleteSpecialty(name, sp)}
              title="Remove specialty"
              className="text-gray-700 hover:text-blood leading-none transition-colors"
            >✕</button>
          )}
        </span>
      ))}

      {/* Add specialty */}
      {canEditSpecialties && onAddSpecialty && val > 0 && (
        isAddingHere ? (
          <div className="flex items-center gap-1 mt-1">
            <input
              autoFocus
              className="bg-void border border-void-border rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-blood w-full sm:w-28"
              placeholder="Specialty…"
              value={newSpecialtyText}
              onChange={(e) => setNewSpecialtyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSpecialtyText.trim()) {
                  onAddSpecialty(name, newSpecialtyText.trim());
                  setNewSpecialtyText("");
                  setAddingSpecialtyFor(null);
                }
                if (e.key === "Escape") { setAddingSpecialtyFor(null); setNewSpecialtyText(""); }
              }}
            />
            <button
              onClick={() => {
                if (newSpecialtyText.trim()) {
                  onAddSpecialty(name, newSpecialtyText.trim());
                  setNewSpecialtyText("");
                  setAddingSpecialtyFor(null);
                }
              }}
              className="text-blood text-xs hover:text-red-400 shrink-0"
            >✓</button>
            <button
              onClick={() => { setAddingSpecialtyFor(null); setNewSpecialtyText(""); }}
              className="text-gray-600 text-xs hover:text-gray-400 shrink-0"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => { setAddingSpecialtyFor(name); setNewSpecialtyText(""); }}
            className="text-gray-700 hover:text-blood text-xs transition-colors"
            title="Add specialty"
          >+ spec</button>
        )
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Build and verify**

```bash
cd frontend && npm run build
```
Expected: `✓ built` with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/character/CharacterSheet.jsx
git commit -m "fix: collapsible specialties on mobile, responsive input width"
```

---

## Deploy

After all tasks complete, push to GitHub and deploy to Pi (frontend-only change):

```bash
# On PC: push to GitHub via GitHub Desktop or:
git push

# On Pi (SSH in):
cd /home/rockas/VTM-vampire-app
git pull
docker compose up --build -d frontend
```
