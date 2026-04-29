# GM Manage Dropdown — Design Spec
**Date:** 2026-04-25  
**Status:** Approved  
**Authors:** Victor (orchestrator), user  

---

## Overview

Add a **"Manage ▾"** dropdown to the GM's Session Mode page that lets the GM directly adjust permanent character stats (Humanity, Blood Potency) without going through the character sheet. Management is per-card, with a mode banner and card dimming to make the active edit state unmistakable.

**Player permissions are unchanged.** Players cannot add humanity — only the GM can add or remove it.

---

## Feature Scope

### In Scope
- "Manage ▾" dropdown button in `SessionModePage` header (top-right)
- Two dropdown items: **Humanity** and **Blood Potency**
- Management mode UX: banner, card dimming, per-card +/− controls
- Immediate PATCH save on each +/− click
- Value clamping: Humanity 0–10, Blood Potency 0–5

### Out of Scope
- Player-side humanity changes (players keep remorse roll only)
- Any other stats (Hunger, Stains, XP, Willpower — rejected during design)
- New backend endpoints (existing `PATCH /api/characters/{id}` is sufficient)

---

## UI Design

### Header Button
- Location: top-right of `SessionModePage` header, left of "← Dashboard"
- Label: `Manage ▾`
- Style: `font-gothic`, `border-void-border`, hover `border-blood` — matches existing nav buttons
- Clicking opens a small dropdown with two items: **Humanity**, **Blood Potency**
- Only one mode active at a time; selecting a new mode while one is active switches immediately

### Mode Banner (Option A)
Appears below the header when a mode is active:

```
⚑ Humanity Mode — tap a character card to adjust.          [Exit]
```

- Full-width, `bg-blood-dark/20 border-b border-blood-dark`
- `font-gothic text-sm text-blood`
- Exit button right-aligned, clicking it clears the active mode
- Banner label changes based on active mode ("Humanity Mode" / "Blood Potency Mode")

### Card Behaviour in Management Mode

| State | Appearance |
|-------|-----------|
| Inactive card | `opacity-50` — dimmed, not interactive for mode |
| Active card (last clicked) | Full opacity, `border-blood` highlight |
| No card selected yet | All cards dimmed |

Clicking a dimmed card:
1. Sets it as the active card (full opacity, blood border)
2. Reveals inline +/− controls next to the relevant stat row
3. Deactivates the previously active card (dims it again)

### Inline +/− Controls
Appear on the **active card only**, next to the relevant stat dots:

```
Humanity  ● ● ● ● ● ● ○ ○ ○ ○   [−] [+]
```

- Buttons: `w-6 h-6`, `border-void-border`, hover `border-blood text-blood`
- `−` disabled when value is at minimum (0); `+` disabled at maximum (10 / 5)
- Each click fires `PATCH /api/characters/{id}` with `{ humanity: newValue }` or `{ blood_potency: newValue }`
- Card stat display updates immediately on success (optimistic update)
- On API error: revert value, show brief error text on card

---

## Data Flow

```
GM clicks "Manage ▾" → "Humanity"
  → setManageMode("humanity")
  → Banner appears, all cards dim

GM clicks Character Card A
  → setActiveCard(charId)
  → Card A highlights, shows +/− next to humanity dots

GM clicks "+"
  → newVal = Math.min(char.humanity + 1, 10)
  → PATCH /api/characters/{charId} { humanity: newVal }
  → On success: update statOverrides[charId].humanity = newVal
  → On error: revert statOverrides entry, show error on card

GM clicks Exit (or selects new mode)
  → setManageMode(null), setActiveCard(null)
  → Banner removed, all cards return to full opacity
```

---

## Files to Change

| File | Change |
|------|--------|
| `frontend/src/pages/SessionModePage.jsx` | Add `manageMode`, `activeCard`, `statOverrides` state; Manage dropdown button; mode banner; card dimming logic; pass mode props to SessionCard |
| `frontend/src/pages/SessionModePage.jsx` (SessionCard) | Accept `manageMode`, `isActive`, `onActivate`, `statOverrides`, `onStatChange` props; render +/− controls when active; display overridden stat values |

No backend changes required.

---

## Edge Cases

- **Switching modes mid-edit:** Active card is deactivated, new mode activates with no card selected
- **Character with no dots shown:** +/− still works; stat is just 0
- **API failure:** Revert optimistic update, show `"Save failed"` text briefly on the card
- **Mobile (375px):** +/− buttons must fit alongside the dot track — use `shrink-0` buttons, allow dot track to `flex-wrap` if needed
