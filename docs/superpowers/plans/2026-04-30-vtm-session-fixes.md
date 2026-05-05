# VTM Session Fixes & Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 2 bugs and implement 8 features across the VTM-GG app covering session mode UX, GM controls, monster improvements, player navigation cleanup, and a new GM mail system.

**Architecture:** All frontend changes target existing JSX files — no new components are created unless noted. Backend changes follow existing patterns (SQLAlchemy model → Alembic migration → FastAPI router). Tailwind classes are reused from existing components throughout.

**Tech Stack:** React 18 / Vite / TailwindCSS (frontend) · FastAPI / SQLAlchemy / Alembic / PostgreSQL (backend) · Docker Compose (runtime)

---

## Files Modified / Created

| File | Action | Tasks |
|------|--------|-------|
| `frontend/src/components/character/CharacterSheet.jsx` | Modify | B2, F6 |
| `frontend/src/pages/DashboardPage.jsx` | Modify | B1, F8, F10 |
| `frontend/src/pages/SessionModePage.jsx` | Modify | F1, F2 |
| `frontend/src/pages/GMDashboardPage.jsx` | Modify | F3 |
| `frontend/src/components/gm/MonsterPanel.jsx` | Modify | F7, F9 |
| `backend/app/models/character.py` | Modify | F1 |
| `backend/app/models/monster.py` | Modify | F9 |
| `backend/app/models/message.py` | **Create** | F10 |
| `backend/app/routers/portraits.py` | Modify | F9 |
| `backend/app/routers/messages.py` | **Create** | F10 |
| `backend/app/main.py` | Modify | F10 |
| `backend/alembic/versions/025_humanity_stains.py` | **Create** | F1 |
| `backend/alembic/versions/026_monster_portrait.py` | **Create** | F9 |
| `backend/alembic/versions/027_messages_table.py` | **Create** | F10 |

---

## Task 1 — B2: Fix Discipline Temp Dot Visual Bug

**Problem:** In `DisciplineCard`, when `tempDots > 0`, the temp blue dot appears *after* the DotRating 5-dot row instead of *within* it at the correct position. The fix renders all 5 positions in one unified row.

**File:** `frontend/src/components/character/CharacterSheet.jsx` lines 366–373

- [ ] **Step 1: Replace the three-element dot render with a unified 5-slot row**

Find this block (lines 366–373):
```jsx
          <DotRating value={cd.level + (tempDots < 0 ? tempDots : 0)} max={5} size="text-sm" />
          {tempDots > 0 && (
            <span className="text-blue-400 text-sm tracking-widest">{"●".repeat(tempDots)}</span>
          )}
          {tempDots < 0 && (
            <span className="text-red-500 text-sm tracking-widest">{"●".repeat(-tempDots)}</span>
          )}
```

Replace with:
```jsx
          <div className="flex gap-0.5 items-center">
            {Array.from({ length: 5 }, (_, i) => {
              const pos  = i + 1;
              const base = cd.level + (tempDots < 0 ? tempDots : 0);
              if (pos <= base)
                return <span key={i} className="text-blood text-sm leading-none">●</span>;
              if (tempDots > 0 && pos <= cd.level + tempDots)
                return <span key={i} className="text-blue-400 text-sm leading-none">●</span>;
              if (tempDots < 0 && pos <= cd.level)
                return <span key={i} className="text-red-500 text-sm leading-none">●</span>;
              return <span key={i} className="text-gray-700 text-sm leading-none">○</span>;
            })}
          </div>
```

- [ ] **Step 2: Verify visually**

Open the player dashboard, navigate to a character with Dominate at level 2. In temp mode (+), click the blue + button. Confirm the blue dot appears at position 3 inside the 5-dot row, not appended after it.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/character/CharacterSheet.jsx
git commit -m "fix: discipline temp dot renders inline within 5-slot row"
```

---

## Task 2 — F6: Simplify Weapon Damage Suggestions

**Problem:** Damage suggestions include complex labels like `"Strength+1 (Aggravated)"`. User wants only flat numeric bonuses.

**File:** `frontend/src/components/character/CharacterSheet.jsx` lines 14–18

- [ ] **Step 1: Replace WEAPON_DAMAGE_SUGGESTIONS**

Find (lines 14–18):
```js
const WEAPON_DAMAGE_SUGGESTIONS = [
  "Strength+1 (Aggravated)","Strength+2 (Aggravated)","Strength (Aggravated)",
  "Strength+1 (Superficial)","2 (Aggravated)","3 (Aggravated)",
  "4 (Aggravated)","5 (Aggravated)",
];
```

Replace with:
```js
const WEAPON_DAMAGE_SUGGESTIONS = ["+1", "+2", "+3", "+4", "+5"];
```

- [ ] **Step 2: Verify**

Open a character sheet → Weapons section → Add weapon → type in Damage field. Confirm datalist suggestions show only `+1 +2 +3 +4 +5`.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/character/CharacterSheet.jsx
git commit -m "fix: weapon damage suggestions simplified to flat bonus values"
```

---

## Task 3 — F8: Player Footer — Remove Group/Session Links

**Problem:** Player dashboard nav shows GM group session links. Players should only see: Directory, Help, Leave the Night.

**File:** `frontend/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Remove myGroups state, fetch, and nav render**

Find and delete the state declaration (line ~140):
```js
  const [myGroups, setMyGroups] = useState([]);
```

Find and delete the fetch call (line ~203, inside a useEffect):
```js
      .then((res) => setMyGroups(res.data))
```
(This is the `.then` that fetches `/api/groups/my` or similar — remove the entire chain.)

Find and delete the nav map (lines ~438–447):
```jsx
            {myGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => window.open(`/session/${g.id}`, "_blank")}
                className="hover:text-blood transition-colors font-gothic tracking-wider text-xs uppercase flex items-center gap-1"
                title={`Live session for ${g.name}`}
              >
                ⚔ {g.name}
              </button>
            ))}
```

- [ ] **Step 2: Verify**

Log in as a player. Confirm nav bar shows only: `Directory | username | ? Help | Leave the Night`. No group/session buttons.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/pages/DashboardPage.jsx
git commit -m "feat: player nav restricted to Directory, Help, Leave the Night"
```

---

## Task 4 — B1: Player Character Auto-Refresh

**Problem:** When GM changes a stat (e.g., humanity) from the GM dashboard, the player must manually reload to see it. Add a 30-second poll to keep the player's character sheet in sync.

**File:** `frontend/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Add polling useEffect after existing character-load effects**

Find the block of `useEffect` hooks in DashboardPage (around line 150–230). Add this new effect after them:

```jsx
  // Auto-refresh selected character every 30s so GM changes appear without reload
  useEffect(() => {
    if (!selected?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/characters/${selected.id}`);
        setSelected(res.data);
      } catch (_) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [selected?.id]);
```

- [ ] **Step 2: Verify**

Open player sheet. From another browser tab logged in as GM, change humanity. Wait 30 seconds. Confirm the player sheet updates without a page reload.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/pages/DashboardPage.jsx
git commit -m "feat: player character sheet auto-refreshes every 30s for GM changes"
```

---

## Task 5 — F2: Per-Card Edit Mode in Session Mode

**Problem:** Currently there is one global "Full Edit" toggle that affects all session cards. The new flow: each card has its own red "Edit" button. Clicking enters edit mode for that card only. A "Save" button appears on that card and exits edit mode on success.

**File:** `frontend/src/pages/SessionModePage.jsx`

- [ ] **Step 1: Add local cardEditMode state to SessionCard and replace fullEditMode prop**

In `SessionCard` function signature (line 183), `fullEditMode` is a prop. We replace it with local state. Change:
```jsx
function SessionCard({ char, player, conditions, isGM, onConditionsChange, lastRoll, onOpenRetainer, fullEditMode, onSaveCard }) {
```
To:
```jsx
function SessionCard({ char, player, conditions, isGM, onConditionsChange, lastRoll, onOpenRetainer, onSaveCard }) {
```

Add local state after the existing `useState` declarations (around line 188):
```jsx
  const [cardEditMode, setCardEditMode] = useState(false);
```

Then replace every occurrence of `fullEditMode` inside `SessionCard` with `cardEditMode`. There are occurrences at lines: 249, 308, 324–329, 344–345. Do a find-replace scoped to the `SessionCard` function body only.

- [ ] **Step 2: Add the red Edit / ✕ Cancel button to the card header**

Find the character name header block (around line 257–265):
```jsx
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-gothic text-blood text-xl leading-tight">{char.name}</h2>
          <span className="text-gray-600 text-xs mt-0.5 shrink-0">{player}</span>
        </div>
```

Replace with:
```jsx
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-gothic text-blood text-xl leading-tight">{char.name}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-gray-600 text-xs mt-0.5">{player}</span>
            {isGM && !cardEditMode && (
              <button
                onClick={() => setCardEditMode(true)}
                className="text-xs font-gothic px-2 py-0.5 rounded border border-blood bg-blood-dark/20 text-blood hover:bg-blood/30 transition-colors"
              >
                Edit
              </button>
            )}
            {isGM && cardEditMode && (
              <button
                onClick={() => setCardEditMode(false)}
                className="text-xs font-gothic px-2 py-0.5 rounded border border-gray-600 text-gray-500 hover:border-blood hover:text-blood transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
```

- [ ] **Step 3: Exit card edit mode after successful save**

In `handleSave` (lines 225–235), add `setCardEditMode(false)` inside the `try` block after `onSaveCard`:
```jsx
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveCard(char.id, {
        ...ls,
        health_superficial:    healthTrack.filter(s => s === 1).length,
        health_aggravated:     healthTrack.filter(s => s === 2).length,
        willpower_superficial: wpTrack.filter(s => s === 1).length,
        willpower_aggravated:  wpTrack.filter(s => s === 2).length,
      });
      setCardEditMode(false);
    } finally { setSaving(false); }
  };
```

- [ ] **Step 4: Remove global fullEditMode from SessionModePage**

In `SessionModePage` (page component, around line 480):
- Delete: `const [fullEditMode, setFullEditMode] = useState(false);`
- Delete the "Full Edit" header button (lines ~601–611)
- Delete the red "Full Edit active" banner (lines ~623–635)
- Remove `fullEditMode={fullEditMode}` from the `SessionCard` render (line ~654)

- [ ] **Step 5: Verify**

Open session mode as GM. Confirm each card has an "Edit" button next to the player name. Click it — controls appear on that card only, other cards unaffected. Click Save — card exits edit mode. Click ✕ — edit cancelled.

- [ ] **Step 6: Commit**
```bash
git add frontend/src/pages/SessionModePage.jsx
git commit -m "feat: per-card edit mode in session mode replaces global full-edit toggle"
```

---

## Task 6 — F1: GM Can See and Add Blood Stains in Session Mode

**Problem:** Blood stains are not stored in the DB and not visible in session mode. Fix: persist `humanity_stains` on the character, show stains in session cards, allow GM to add/clear them in card edit mode.

### Step 6A — Backend: Add humanity_stains column

**File:** `backend/app/models/character.py`

- [ ] **Step 1: Add column to Character model**

Find the humanity line in the Character model and add `humanity_stains` after it:
```python
    humanity         = Column(Integer, default=7,  nullable=False)
    humanity_stains  = Column(Integer, default=0,  nullable=False)
```

- [ ] **Step 2: Create migration 025**

Create `backend/alembic/versions/025_humanity_stains.py`:
```python
"""add humanity_stains to characters

Revision ID: 025
Revises: 024
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('characters', sa.Column('humanity_stains', sa.Integer(), nullable=False, server_default='0'))

def downgrade():
    op.drop_column('characters', 'humanity_stains')
```

- [ ] **Step 3: Verify the gm-adjust endpoint includes humanity_stains**

Open `backend/app/routers/characters.py`. Find the `gm-adjust` endpoint. Confirm it reads `humanity_stains` from the request body and writes it to the character. If not present, add:
```python
if "humanity_stains" in data:
    char.humanity_stains = max(0, int(data["humanity_stains"]))
```
Also confirm the character schema/response includes `humanity_stains` so the frontend receives it.

- [ ] **Step 4: Run migration locally**
```bash
docker compose exec backend alembic upgrade head
```
Expected: `Running upgrade 024 -> 025, add humanity_stains to characters`

### Step 6B — Frontend: Show stains in session cards

**File:** `frontend/src/pages/SessionModePage.jsx`

- [ ] **Step 5: Add SessionHumanityTracker component**

Add this component near the top of the file (after `DotTracker`, around line 85):
```jsx
function SessionHumanityTracker({ value, stains, editMode, onChangeHumanity, onChangeStains }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => {
        const pos     = i + 1;
        const isFull  = pos <= value;
        const isStain = pos > value && pos <= value + stains;
        return (
          <button
            key={i}
            onClick={() => {
              if (!editMode) return;
              if (isFull) onChangeHumanity(value - 1);
              else if (!isStain) onChangeStains(stains + 1);
            }}
            className={`rounded-full border transition-all ${
              isFull  ? "w-5 h-5 bg-blood border-blood" :
              isStain ? "w-3 h-3 bg-blood-dark/50 border-blood-dark mx-1" :
                        `w-5 h-5 border-gray-700${editMode ? " hover:border-gray-500 cursor-pointer" : " cursor-default"}`
            }`}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Add stains to SessionCard local state**

In `SessionCard`, the `ls` state (line 189) tracks stat values. Add `humanity_stains`:
```jsx
  const [ls, setLs] = useState({
    blood_potency:   char.blood_potency,
    humanity:        char.humanity,
    humanity_stains: char.humanity_stains ?? 0,
    current_hunger:  char.current_hunger ?? 0,
    health:          char.health,
    willpower:       char.willpower,
  });
```

Update the `useEffect` re-sync (line 202–208) to include `humanity_stains`:
```jsx
  useEffect(() => {
    setLs({
      blood_potency:   char.blood_potency,
      humanity:        char.humanity,
      humanity_stains: char.humanity_stains ?? 0,
      current_hunger:  char.current_hunger ?? 0,
      health:          char.health,
      willpower:       char.willpower,
    });
    setHealthTrack(buildCardTrack(char.health, char.health_superficial, char.health_aggravated));
    setWpTrack(buildCardTrack(char.willpower, char.willpower_superficial, char.willpower_aggravated));
  }, [char.blood_potency, char.humanity, char.humanity_stains, char.current_hunger,
      char.health, char.willpower, char.health_superficial, char.health_aggravated,
      char.willpower_superficial, char.willpower_aggravated]);
```

- [ ] **Step 7: Replace humanity DotTracker with SessionHumanityTracker**

In the stat rows map (lines 297–312), the humanity row uses `DotTracker`. Remove humanity from the mapped array and render it separately:

Replace the whole `{[...].map(...)}` block for Blood Potency / Humanity / Hunger with:
```jsx
      <div className="flex flex-col gap-1.5">
        {/* Blood Potency */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16 shrink-0">Blood Pot.</span>
          <DotTracker
            value={ls.blood_potency ?? 0}
            max={5}
            variant="blood"
            onSetValue={cardEditMode && isGM ? (val) => set("blood_potency", val) : undefined}
          />
        </div>
        {/* Humanity with stains */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16 shrink-0">Humanity</span>
          <SessionHumanityTracker
            value={ls.humanity ?? 0}
            stains={ls.humanity_stains ?? 0}
            editMode={cardEditMode && isGM}
            onChangeHumanity={(val) => set("humanity", val)}
            onChangeStains={(val) => set("humanity_stains", val)}
          />
        </div>
        {/* Hunger */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16 shrink-0">Hunger</span>
          <DotTracker
            value={ls.current_hunger ?? 0}
            max={5}
            variant="hunger"
            onSetValue={cardEditMode && isGM ? (val) => set("current_hunger", val) : undefined}
          />
        </div>
      </div>
```

- [ ] **Step 8: Include humanity_stains in save payload**

In `handleSave`, the spread `...ls` already includes `humanity_stains`. Confirm the `onSaveCard` → `handleSaveCard` → `api.put('/api/characters/${charId}/gm-adjust', stats)` call sends it. If the backend endpoint needs updating (Step 6A Step 3), verify it accepts and saves `humanity_stains`.

- [ ] **Step 9: Verify**

Open session mode. Confirm humanity row shows all 10 positions with stains rendered as small dim dots. Enter card edit mode — clicking empty humanity dots adds stains (small dots). Clicking filled red dots removes permanent humanity. Save — stains persist after refresh.

- [ ] **Step 10: Commit**
```bash
git add backend/app/models/character.py backend/alembic/versions/025_humanity_stains.py backend/app/routers/characters.py frontend/src/pages/SessionModePage.jsx
git commit -m "feat: GM can see and add humanity blood stains in session mode"
```

---

## Task 7 — F3: GM Manage Mode — View-Only Attrs/Skills/Disciplines, Conditions to Top

**Problem:** In GM manage mode (GM Dashboard → character overlay → Manage), the +/- buttons on attributes, skills, and disciplines should be hidden (view-only). Also, the ConditionManager should render at the top of the manage view, not below the full character sheet.

**File:** `frontend/src/pages/GMDashboardPage.jsx`

- [ ] **Step 1: Remove onImprove and onUnimprove from CharacterSheet in manage mode**

Find the `CharacterSheet` call inside the manage overlay (around line 1044–1057). Change:
```jsx
                  onImprove={manageMode ? gmImprove : undefined}
                  onUnimprove={manageMode ? gmUnimprove : undefined}
```
To:
```jsx
                  onImprove={undefined}
                  onUnimprove={undefined}
```

This removes all +/- upgrade buttons from attrs, skills, and disciplines while keeping `freeEdit={manageMode}` active (weapons/possessions/specialties still editable).

- [ ] **Step 2: Move ConditionManager above CharacterSheet**

Find the manage overlay content block (around lines 1039–1065). Currently structure is:
```
<div flex-1 overflow>
  {loadingChar ? Spinner : (
    <>
      <CharacterSheet ... />
      <div mt-6 border-t>
        <ConditionManager ... />
      </div>
    </>
  )}
</div>
```

When `manageMode` is true, render ConditionManager first:
```jsx
          <div className="flex-1 overflow-y-auto p-6">
            {loadingChar ? (
              <Spinner text="Opening the coffin…" />
            ) : (
              <>
                {manageMode && (
                  <div className="max-w-2xl mx-auto mb-6 border border-void-border/40 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-gothic tracking-widest uppercase mb-3">Conditions</p>
                    <ConditionManager
                      characterId={viewChar?.id}
                      characterName={viewChar?.name}
                    />
                  </div>
                )}
                <CharacterSheet
                  character={viewChar}
                  freeEdit={manageMode}
                  onImprove={undefined}
                  onUnimprove={undefined}
                  onCharacterUpdate={(updated) => { setViewChar(updated); setGmHasChanges(true); }}
                  onAddWeapon={manageMode ? async (w) => { const res = await api.post(`/api/characters/${viewChar.id}/weapons`, w); setViewChar(res.data); setGmHasChanges(true); } : undefined}
                  onDeleteWeapon={manageMode ? async (id) => { const res = await api.delete(`/api/characters/${viewChar.id}/weapons/${id}`); setViewChar(res.data); setGmHasChanges(true); } : undefined}
                  onAddPossession={manageMode ? async (p) => { const res = await api.post(`/api/characters/${viewChar.id}/possessions`, p); setViewChar(res.data); setGmHasChanges(true); } : undefined}
                  onDeletePossession={manageMode ? async (id) => { const res = await api.delete(`/api/characters/${viewChar.id}/possessions/${id}`); setViewChar(res.data); setGmHasChanges(true); } : undefined}
                  onAddSpecialty={manageMode ? async (skillName, specialtyName) => { const res = await api.post(`/api/characters/${viewChar.id}/specialties`, { skill_name: skillName, specialty_name: specialtyName }); setViewChar(res.data); setGmHasChanges(true); } : undefined}
                  onDeleteSpecialty={manageMode ? async (skillName, specialtyName) => { const res = await api.delete(`/api/characters/${viewChar.id}/specialties`, { params: { skill_name: skillName, specialty_name: specialtyName } }); setViewChar(res.data); setGmHasChanges(true); } : undefined}
                  onClaimFreePower={async (powerId) => { try { const res = await api.post(`/api/characters/${viewChar.id}/claim-predator-power`, { power_id: powerId }); setViewChar(res.data); setGmHasChanges(true); } catch {} }}
                />
                {!manageMode && (
                  <div className="max-w-2xl mx-auto mt-6 border-t border-void-border pt-6">
                    <ConditionManager
                      characterId={viewChar?.id}
                      characterName={viewChar?.name}
                    />
                  </div>
                )}
              </>
            )}
          </div>
```

- [ ] **Step 3: Verify**

Open GM dashboard → click a character → Manage. Confirm: ConditionManager appears at the top. Scroll down to Attributes — no +/- buttons visible. Weapons section still has Add/Delete buttons. Toggle Manage off → +/- buttons return on Attributes.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/GMDashboardPage.jsx
git commit -m "feat: GM manage mode strips attr/skill/disc edit, conditions move to top"
```

---

## Task 8 — F7: Monster — Replace Attack Section with Weapons Only

**Problem:** MonsterPanel has a separate "Attack" section (attack_pool + attack_damage_type) in addition to Weapons. Remove Attack entirely. Weapons section stays and is the only way to add combat capabilities.

**File:** `frontend/src/components/gm/MonsterPanel.jsx`

- [ ] **Step 1: Remove attack fields from DEFAULT_FORM (line 38–49)**

Find:
```js
  attack_pool: 0, attack_damage_type: "superficial",
```
Delete those two lines from `DEFAULT_FORM`.

- [ ] **Step 2: Remove Attack section from MonsterEditor**

Find in `MonsterEditor` (lines ~513–530):
```jsx
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
```
Delete this entire block.

- [ ] **Step 3: Remove Attack section from CreateForm**

Find the identical block in `CreateForm` (lines ~717–733) and delete it.

- [ ] **Step 4: Verify**

Open GM dashboard → Monsters → New Monster. Confirm the form has no "Attack" section. The Weapons section (+ Add button) is still present. Edit an existing monster — same: no attack pool, weapons still work.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/gm/MonsterPanel.jsx
git commit -m "feat: monster panel replaces Attack section with Weapons only"
```

---

## Task 9 — F9: GM Can Upload Portrait for Monsters

**Problem:** Monsters have no portrait. GMs should be able to upload an image the same way players do for characters.

### Step 9A — Backend

**Files:** `backend/app/models/monster.py`, `backend/app/routers/portraits.py`, `backend/alembic/versions/026_monster_portrait.py`

- [ ] **Step 1: Add portrait_url to Monster model**

In `backend/app/models/monster.py`, add after the `notes` column:
```python
    portrait_url      = Column(String, nullable=True)
```

- [ ] **Step 2: Create migration 026**

Create `backend/alembic/versions/026_monster_portrait.py`:
```python
"""add portrait_url to monsters

Revision ID: 026
Revises: 025
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = '026'
down_revision = '025'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('monsters', sa.Column('portrait_url', sa.String(), nullable=True))

def downgrade():
    op.drop_column('monsters', 'portrait_url')
```

- [ ] **Step 3: Add monster portrait upload endpoint to portraits.py**

Add import for Monster model at the top of `backend/app/routers/portraits.py`:
```python
from app.models.monster import Monster
```

Add this endpoint after the existing character endpoints:
```python
@router.post("/monster/{monster_id}", response_model=PortraitOut)
async def upload_monster_portrait(
    monster_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("gm", "admin"):
        raise HTTPException(status_code=403, detail="GM access required.")
    monster = db.query(Monster).filter(Monster.id == monster_id).first()
    if not monster:
        raise HTTPException(status_code=404, detail="Monster not found.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Allowed formats: jpg, png, webp, gif.")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB).")

    if monster.portrait_url:
        old_path = os.path.join(UPLOAD_DIR, os.path.basename(monster.portrait_url))
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"monster_{monster_id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as f:
        f.write(data)

    monster.portrait_url = f"/uploads/portraits/{filename}"
    db.commit()
    return PortraitOut(portrait_url=monster.portrait_url)
```

- [ ] **Step 4: Run migration**
```bash
docker compose exec backend alembic upgrade head
```
Expected: `Running upgrade 025 -> 026`

### Step 9B — Frontend

**File:** `frontend/src/components/gm/MonsterPanel.jsx`

- [ ] **Step 5: Add portrait upload UI to MonsterEditor**

In `MonsterEditor`, add a portrait section before the Name+Type row (at the top of the form body, after the opening `<div className="px-4 ..."`):

```jsx
      {/* Portrait */}
      <div className="flex items-center gap-4">
        {form.portrait_url ? (
          <img
            src={form.portrait_url}
            alt={form.name}
            className="w-16 h-16 rounded-lg object-cover border border-void-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-void-border bg-void flex items-center justify-center text-gray-700 text-2xl">
            🧛
          </div>
        )}
        <label className="cursor-pointer">
          <span className="text-xs text-gray-600 hover:text-blood transition-colors font-gothic tracking-wider">
            {form.portrait_url ? "Change portrait" : "Upload portrait"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              try {
                const res = await api.post(`/api/portraits/monster/${form.id}`, fd, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                set("portrait_url", res.data.portrait_url);
              } catch { /* silent — user sees no change */ }
            }}
          />
        </label>
      </div>
```

- [ ] **Step 6: Show portrait in MonsterCard collapsed header**

In `MonsterCard`, find the collapsed header div (around line 581). Add the portrait before the type badge:
```jsx
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-void/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-3 min-w-0">
          {monster.portrait_url && (
            <img
              src={monster.portrait_url}
              alt={monster.name}
              className="w-8 h-8 rounded-full object-cover border border-void-border shrink-0"
            />
          )}
          <span className={`text-xs font-gothic tracking-wider border rounded px-1.5 py-0.5 capitalize shrink-0 ${typeStyle}`}>
```

- [ ] **Step 7: Verify**

Open GM dashboard → Monsters → expand a monster. Confirm portrait upload area appears at top. Upload a jpg. Confirm the image appears in the expanded editor and as a small circle in the collapsed header.

- [ ] **Step 8: Commit**
```bash
git add backend/app/models/monster.py backend/alembic/versions/026_monster_portrait.py backend/app/routers/portraits.py frontend/src/components/gm/MonsterPanel.jsx
git commit -m "feat: GM can upload portrait images for monsters"
```

---

## Task 10 — F10: GM Secret Mail System

**Goal:** GM can send a secret message to any player from session mode. Messages appear in the player's inbox. Long-term messages stay until deleted. Temporary messages expire 15 minutes after being opened. The inbox button on the player dashboard pulses red when there is unread mail.

### Step 10A — Backend Model

**File:** `backend/app/models/message.py` (new)

- [ ] **Step 1: Create message model**

```python
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class MessageType(str, enum.Enum):
    longterm  = "longterm"
    temporary = "temporary"


class Message(Base):
    __tablename__ = "messages"

    id           = Column(Integer, primary_key=True)
    sender_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String,  nullable=False)
    body         = Column(Text,    nullable=False)
    type         = Column(Enum(MessageType), nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    opened_at    = Column(DateTime(timezone=True), nullable=True)
    expires_at   = Column(DateTime(timezone=True), nullable=True)

    sender    = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
```

### Step 10B — Backend Migration

**File:** `backend/alembic/versions/027_messages_table.py` (new)

- [ ] **Step 2: Create migration 027**

```python
"""create messages table

Revision ID: 027
Revises: 026
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = '027'
down_revision = '026'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'messages',
        sa.Column('id',           sa.Integer(),                  nullable=False),
        sa.Column('sender_id',    sa.Integer(),                  nullable=False),
        sa.Column('recipient_id', sa.Integer(),                  nullable=False),
        sa.Column('title',        sa.String(),                   nullable=False),
        sa.Column('body',         sa.Text(),                     nullable=False),
        sa.Column('type',         sa.Enum('longterm', 'temporary', name='messagetype'), nullable=False),
        sa.Column('created_at',   sa.DateTime(timezone=True),    server_default=sa.text('now()')),
        sa.Column('opened_at',    sa.DateTime(timezone=True),    nullable=True),
        sa.Column('expires_at',   sa.DateTime(timezone=True),    nullable=True),
        sa.ForeignKeyConstraint(['sender_id'],    ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

def downgrade():
    op.drop_table('messages')
    op.execute("DROP TYPE IF EXISTS messagetype")
```

### Step 10C — Backend Router

**File:** `backend/app/routers/messages.py` (new)

- [ ] **Step 3: Create messages router**

```python
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.message import Message, MessageType

router = APIRouter(prefix="/api/messages", tags=["messages"])


class SendMessageIn(BaseModel):
    recipient_username: str
    title: str
    body: str
    type: MessageType


class MessageOut(BaseModel):
    id: int
    sender_username: str
    title: str
    body: str
    type: str
    created_at: datetime
    opened_at: Optional[datetime]
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class HasUnreadOut(BaseModel):
    has_unread: bool


@router.post("", response_model=MessageOut)
def send_message(
    payload: SendMessageIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("gm", "admin"):
        raise HTTPException(status_code=403, detail="GM access required.")
    recipient = db.query(User).filter(User.username == payload.recipient_username).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Player not found.")
    msg = Message(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        title=payload.title,
        body=payload.body,
        type=payload.type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _to_out(msg, current_user.username)


@router.get("/inbox", response_model=list[MessageOut])
def get_inbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    msgs = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        # exclude expired temporary messages
        (Message.expires_at == None) | (Message.expires_at > now),
    ).order_by(Message.created_at.desc()).all()
    sender_map = {m.sender_id: db.query(User).filter(User.id == m.sender_id).first() for m in msgs}
    return [_to_out(m, sender_map[m.sender_id].username) for m in msgs]


@router.get("/inbox/has-unread", response_model=HasUnreadOut)
def has_unread(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    count = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.opened_at == None,
        (Message.expires_at == None) | (Message.expires_at > now),
    ).count()
    return HasUnreadOut(has_unread=count > 0)


@router.put("/{message_id}/open", response_model=MessageOut)
def open_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.recipient_id == current_user.id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    if not msg.opened_at:
        now = datetime.now(timezone.utc)
        msg.opened_at = now
        if msg.type == MessageType.temporary:
            msg.expires_at = now + timedelta(minutes=15)
        db.commit()
        db.refresh(msg)
    sender = db.query(User).filter(User.id == msg.sender_id).first()
    return _to_out(msg, sender.username)


def _to_out(msg: Message, sender_username: str) -> MessageOut:
    return MessageOut(
        id=msg.id,
        sender_username=sender_username,
        title=msg.title,
        body=msg.body,
        type=msg.type,
        created_at=msg.created_at,
        opened_at=msg.opened_at,
        expires_at=msg.expires_at,
    )
```

- [ ] **Step 4: Register router in main.py**

Open `backend/app/main.py`. Add import and include:
```python
from app.routers import messages
app.include_router(messages.router)
```

Also add Message model import to `backend/app/models/__init__.py` if that file is used for model discovery.

- [ ] **Step 5: Run migration**
```bash
docker compose exec backend alembic upgrade head
```
Expected: `Running upgrade 026 -> 027, create messages table`

### Step 10D — Frontend: GM Send Modal in Session Mode

**File:** `frontend/src/pages/SessionModePage.jsx`

- [ ] **Step 6: Add mail modal state to SessionModePage**

In `SessionModePage`, add state (near the other modal states like `retainerModal`):
```jsx
  const [mailTarget, setMailTarget] = useState(null); // { username, charName }
```

- [ ] **Step 7: Add mail icon button to SessionCard header**

In `SessionCard`, the header row (where Edit button was added in Task 5) — add a mail icon button for GM:

Add `onMailPlayer` prop to `SessionCard`:
```jsx
function SessionCard({ char, player, conditions, isGM, onConditionsChange, lastRoll, onOpenRetainer, onSaveCard, onMailPlayer }) {
```

In the header `div` (after the Edit/✕ button), add:
```jsx
            {isGM && (
              <button
                onClick={() => onMailPlayer(player, char.name)}
                title="Send secret message"
                className="text-xs text-gray-600 hover:text-blood transition-colors"
              >
                ✉
              </button>
            )}
```

Pass `onMailPlayer` from `SessionModePage` to each `SessionCard`:
```jsx
              onMailPlayer={(username, charName) => setMailTarget({ username, charName })}
```

- [ ] **Step 8: Add send mail modal to SessionModePage**

Add the modal at the bottom of the return, after the retainer modal:
```jsx
      {/* ── GM send mail modal ── */}
      {mailTarget && (
        <MailModal
          target={mailTarget}
          onClose={() => setMailTarget(null)}
        />
      )}
```

Add `MailModal` component near the top of the file:
```jsx
function MailModal({ target, onClose }) {
  const [title, setTitle]   = useState("");
  const [body,  setBody]    = useState("");
  const [type,  setType]    = useState("longterm");
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState("");

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setError("Title and message required."); return; }
    setSending(true); setError("");
    try {
      await api.post("/api/messages", {
        recipient_username: target.username,
        title: title.trim(),
        body: body.trim(),
        type,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send.");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-void-light border border-blood-dark/60 rounded-lg p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="font-gothic text-blood text-lg">Secret Message</h3>
          <p className="text-xs text-gray-600 mt-0.5">To: <span className="text-gray-400">{target.charName} ({target.username})</span></p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Subject</label>
          <input
            className="w-full bg-void border border-void-border rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-blood transition-colors"
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Message subject…" autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Type</label>
          <select
            className="w-full bg-void border border-void-border rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-blood transition-colors"
            value={type} onChange={(e) => setType(e.target.value)}
          >
            <option value="longterm">Long-term — stays in inbox until dismissed</option>
            <option value="temporary">Temporary — disappears 15 min after opening</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Message</label>
          <textarea
            className="w-full bg-void border border-void-border rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-blood transition-colors resize-none"
            rows={5} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Your secret message to the player…"
          />
        </div>
        {error && <p className="text-blood text-sm">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-void-border text-gray-500 hover:text-gray-300 rounded py-2 text-sm font-gothic tracking-wider transition-colors">
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending}
            className="flex-1 bg-blood-dark hover:bg-blood text-white rounded py-2 text-sm font-gothic tracking-wider transition-colors disabled:opacity-50">
            {sending ? "Sending…" : "Send ✉"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 10E — Frontend: Player Inbox in DashboardPage

**File:** `frontend/src/pages/DashboardPage.jsx`

- [ ] **Step 9: Add unread mail polling and inbox state**

Add state near the top of DashboardPage:
```jsx
  const [hasUnreadMail, setHasUnreadMail] = useState(false);
  const [showInbox,     setShowInbox]     = useState(false);
  const [inboxMessages, setInboxMessages] = useState([]);
```

Add polling useEffect (after the character auto-refresh effect from Task 4):
```jsx
  // Poll for unread mail every 30s
  useEffect(() => {
    const checkMail = async () => {
      try {
        const res = await api.get("/api/messages/inbox/has-unread");
        setHasUnreadMail(res.data.has_unread);
      } catch (_) {}
    };
    checkMail();
    const interval = setInterval(checkMail, 30000);
    return () => clearInterval(interval);
  }, []);

  const openInbox = async () => {
    try {
      const res = await api.get("/api/messages/inbox");
      setInboxMessages(res.data);
      setShowInbox(true);
    } catch (_) {}
  };

  const openMessage = async (msgId) => {
    try {
      const res = await api.put(`/api/messages/${msgId}/open`);
      setInboxMessages((prev) => prev.map((m) => m.id === msgId ? res.data : m));
      setHasUnreadMail(inboxMessages.some((m) => m.id !== msgId && !m.opened_at));
    } catch (_) {}
  };
```

- [ ] **Step 10: Add Mail Inbox button to player nav**

In the nav bar (around line 435, after the Directory button), add:
```jsx
            <button
              onClick={openInbox}
              className={`font-gothic tracking-wider text-xs uppercase transition-colors relative ${
                hasUnreadMail
                  ? "text-blood animate-pulse"
                  : "text-gray-500 hover:text-blood"
              }`}
              title={hasUnreadMail ? "You have unread messages!" : "Message Inbox"}
            >
              ✉ Inbox
            </button>
```

- [ ] **Step 11: Add InboxModal component to DashboardPage**

Add the InboxModal at the bottom of the page return (before the closing `</div>`):
```jsx
      {/* ── Mail inbox modal ── */}
      {showInbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowInbox(false)}>
          <div className="bg-void-light border border-void-border rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-void-border shrink-0">
              <h3 className="font-gothic text-blood text-lg">Message Inbox</h3>
              <button onClick={() => setShowInbox(false)}
                className="text-gray-600 hover:text-gray-300 text-sm font-gothic transition-colors">✕ Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {inboxMessages.length === 0 ? (
                <p className="text-gray-600 text-sm italic text-center py-8">No messages in your inbox.</p>
              ) : (
                inboxMessages.map((msg) => (
                  <div key={msg.id}
                    className={`border rounded-lg p-4 space-y-2 ${
                      !msg.opened_at ? "border-blood-dark/60 bg-blood-dark/10" : "border-void-border"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-gothic text-gray-200 text-sm">{msg.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          From GM · {new Date(msg.created_at).toLocaleDateString()}
                          {msg.type === "temporary" && (
                            <span className="ml-2 text-orange-600">⏱ Temporary</span>
                          )}
                        </p>
                      </div>
                      {!msg.opened_at && (
                        <span className="text-xs text-blood font-gothic shrink-0">● Unread</span>
                      )}
                    </div>
                    {msg.opened_at ? (
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    ) : (
                      <button
                        onClick={() => openMessage(msg.id)}
                        className="text-xs font-gothic tracking-wider border border-blood text-blood hover:bg-blood-dark/20 rounded px-3 py-1 transition-colors"
                      >
                        Open message
                      </button>
                    )}
                    {msg.expires_at && msg.opened_at && (
                      <p className="text-xs text-orange-700">
                        ⏱ Expires {new Date(msg.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 12: Verify end-to-end**

1. Log in as GM, open session mode.
2. Click ✉ on a player card → modal opens, fill title/body/type → Send.
3. Log in as player → ✉ Inbox button pulses red in nav.
4. Click Inbox → see unread message.
5. Click "Open message" → body reveals, timestamp set.
6. For temporary: wait or verify expires_at is set to 15 min after open.
7. After 15 min: message disappears from inbox (filtered by backend).

- [ ] **Step 13: Commit**
```bash
git add backend/app/models/message.py backend/alembic/versions/027_messages_table.py backend/app/routers/messages.py backend/app/main.py frontend/src/pages/SessionModePage.jsx frontend/src/pages/DashboardPage.jsx
git commit -m "feat: GM secret mail system with player inbox and temporary message expiry"
```

---

## Self-Review

### Spec Coverage Check

| Item | Task | Covered |
|------|------|---------|
| B1 — Player no-reload on humanity change | Task 4 | ✅ |
| B2 — Discipline temp dot inside 5-dot line | Task 1 | ✅ |
| F1 — GM sees/adds blood stains | Task 6 | ✅ |
| F2 — Per-card Edit button in session mode | Task 5 | ✅ |
| F3 — GM Manage: view-only attrs/skills/disc | Task 7 | ✅ |
| F3 — Conditions tab to top in manage mode | Task 7 | ✅ |
| F6 — Weapons: remove Strength+N damage labels | Task 2 | ✅ |
| F7 — Monster: replace Attack with Weapons | Task 8 | ✅ |
| F8 — Player footer: Directory/Help/Leave only | Task 3 | ✅ |
| F9 — GM portrait upload for monsters | Task 9 | ✅ |
| F10 — GM mail in session mode | Task 10 | ✅ |
| F10 — Player inbox with unread indicator | Task 10 | ✅ |
| F10 — Long-term vs temporary messages | Task 10 | ✅ |
| F10 — 15-min expiry after opening temporary | Task 10 | ✅ |
| F10 — Pulsing red inbox button | Task 10 | ✅ |

### Deployment Note

After all tasks: rebuild Docker and run migrations on Pi.
```bash
cd /home/rockas/VTM-vampire-app
git pull
docker compose up --build -d
docker compose exec backend alembic upgrade head
```
