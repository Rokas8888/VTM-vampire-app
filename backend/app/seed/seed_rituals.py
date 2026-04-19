"""
Seed rituals from rituals_parsed.json into the Ritual table.
Skips rituals already present (matched by name + discipline_id).
Run: python -m app.seed.seed_rituals
"""
import json, os, sys

# ── Model imports (required to resolve SQLAlchemy relationships) ──────────────
import app.models.user
import app.models.character
import app.models.condition
import app.models.group
import app.models.monster
import app.models.chronicle_note
import app.models.npc
import app.models.resonance
import app.models.dice

from app.database import SessionLocal
from app.models.game_data import Ritual, Discipline

DISCIPLINE_MAP = {
    "Blood Sorcery": 36,
    "Oblivion":      41,
}

JSON_PATH = "/app/information/rituals_parsed.json"

def build_system_text(r: dict) -> str:
    parts = []
    if r.get("cost"):
        parts.append(f"Cost: {r['cost']}")
    if r.get("roll"):
        parts.append(f"Roll: {r['roll']}")
    if r.get("notes"):
        parts.append(f"Notes: {r['notes']}")
    if r.get("source"):
        parts.append(f"Source: {r['source']}")
    return "\n".join(parts)

def main():
    if not os.path.exists(JSON_PATH):
        print(f"ERROR: {JSON_PATH} not found. Run rituals parse script first.")
        sys.exit(1)

    with open(JSON_PATH, encoding="utf-8") as f:
        rituals_data = json.load(f)

    db = SessionLocal()
    try:
        # All rituals are Blood Sorcery unless name appears in known Oblivion ceremonies
        oblivion_keywords = ["ashes", "grave", "haunting", "dead", "lay to rest",
                             "amercement", "homuncular", "skuld", "whispers to the dead",
                             "necrotic", "night cry", "unearth foe", "raise the dead",
                             "binding fetter", "shadow cloak", "ashes to ashes"]

        existing_names = {r.name.lower() for r in db.query(Ritual).all()}
        added = 0
        skipped = 0

        for r in rituals_data:
            name = r["name"].strip()
            if not name:
                continue
            if name.lower() in existing_names:
                skipped += 1
                continue

            # Determine discipline
            disc_id = DISCIPLINE_MAP["Blood Sorcery"]
            if any(kw in name.lower() for kw in oblivion_keywords):
                disc_id = DISCIPLINE_MAP["Oblivion"]

            ritual = Ritual(
                discipline_id = disc_id,
                name          = name,
                level         = r["level"],
                description   = r["effect"] or "",
                system_text   = build_system_text(r),
            )
            db.add(ritual)
            existing_names.add(name.lower())
            added += 1

        db.commit()
        print(f"Done — added {added} rituals, skipped {skipped} already present.")

    finally:
        db.close()

if __name__ == "__main__":
    main()
