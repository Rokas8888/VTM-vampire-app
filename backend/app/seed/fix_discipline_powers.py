"""
Add missing discipline powers and Thin-Blood Alchemy discipline from Excel source.
Run: docker compose exec backend python -m app.seed.fix_discipline_powers
"""
import sys, os, json, pathlib
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import app.models.user, app.models.character, app.models.condition
import app.models.group, app.models.monster, app.models.chronicle_note
import app.models.npc, app.models.resonance, app.models.dice

from app.database import SessionLocal
from app.models.game_data import Discipline, DisciplinePower

DATA_FILE = pathlib.Path(__file__).parent / "discipline_powers_data.json"


def fix():
    with open(DATA_FILE, encoding="utf-8") as f:
        powers_by_disc = json.load(f)

    db = SessionLocal()
    try:
        added = 0
        skipped = 0

        for disc_name, powers in powers_by_disc.items():
            disc = db.query(Discipline).filter(Discipline.name == disc_name).first()

            if not disc:
                if disc_name == "Thin-Blood Alchemy":
                    disc = Discipline(
                        name="Thin-Blood Alchemy",
                        description=(
                            "A unique discipline available only to thin-blooded vampires. "
                            "Rather than wielding vampiric power directly, thin-bloods brew "
                            "alchemical concoctions from their vitae and the blood resonance "
                            "of their last feeding, producing temporary supernatural effects. "
                            "Each formula requires specific blood resonances to craft."
                        )
                    )
                    db.add(disc)
                    db.flush()
                    print("[DISC +] Created discipline: " + disc_name)
                else:
                    print("[WARN ] Discipline not found in DB: " + disc_name)
                    continue

            existing_names = {
                p.name.lower()
                for p in db.query(DisciplinePower)
                           .filter(DisciplinePower.discipline_id == disc.id).all()
            }

            for p in powers:
                if p["name"].lower() in existing_names:
                    skipped += 1
                    continue

                db.add(DisciplinePower(
                    discipline_id=disc.id,
                    name=p["name"],
                    level=p["level"],
                    description=p["description"] or None,
                    system_text=p["system_text"] or None,
                    prerequisite=p["prerequisite"] or None,
                ))
                print("  [+] " + disc_name + " L" + str(p["level"]) + " -- " + p["name"])
                added += 1

        db.commit()
        print("\nDone. Added: " + str(added) + "  Already existed: " + str(skipped))
        print("Total powers in DB: " + str(db.query(DisciplinePower).count()))

    except Exception as e:
        db.rollback()
        print("Error: " + str(e))
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix()
