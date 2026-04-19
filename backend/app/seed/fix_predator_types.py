"""
Fix predator types to match the V5 book exactly.
Run: docker compose exec backend python -m app.seed.fix_predator_types

- Corrects wrong discipline/specialty/grants on Scene Queen, Montero, Pursuer
- Adds missing: Roadside Killer, Grim Reaper, Trapdoor, Tithe Collector
- Removes non-canonical: Headhunter, Stalker (warns if characters use them)
"""
import sys, os, json as _json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal
from app.models.game_data import PredatorType, Discipline
import app.models.user             # noqa: F401
import app.models.character        # noqa: F401
import app.models.condition        # noqa: F401
import app.models.group            # noqa: F401
import app.models.monster          # noqa: F401
import app.models.chronicle_note   # noqa: F401
import app.models.npc              # noqa: F401
import app.models.resonance        # noqa: F401
import app.models.dice             # noqa: F401
from app.models.character import Character

CORRECT_DATA = [
    # name → (discipline_name, discipline_level, specialty_skill, specialty_name,
    #          description, advantages, flaws, humanity_modifier, choices_json, grants_json)
    {
        "name": "Alleycat",
        "description": "You feed by brute force and outright attack, taking blood from whoever you can when you can. Violence is the quickest route — intimidation makes victims cower, and Dominate masks the assault.",
        "discipline": "Celerity", "discipline_level": 1,
        "specialty_skill": "Intimidation", "specialty_name": "Stickups",
        "advantages": "Three dots of Criminal Contacts",
        "flaws": "Lose one dot of Humanity.",
        "humanity_modifier": -1,
        "choices_json": _json.dumps({"discipline": [{"name": "Celerity", "description": "Supernatural speed"}, {"name": "Potence", "description": "Supernatural strength"}], "specialty": [{"skill": "Intimidation", "name": "Stickups"}, {"skill": "Brawl", "name": "Grappling"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Contacts", "level": 3, "notes": "Criminal"}]}),
    },
    {
        "name": "Bagger",
        "description": "You consume preserved, defractionated or rancid blood through Iron Gullet — blood bags, corpses, black-market stock. Maybe you work in a hospital or know the right people. Ventrue cannot take this style.",
        "discipline": "Obfuscate", "discipline_level": 1,
        "specialty_skill": "Larceny", "specialty_name": "Lock Picking",
        "advantages": "Iron Gullet Merit (•••)",
        "flaws": "Enemy (••) — someone believes you owe them, or hunts you.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Blood Sorcery", "description": "Tremere/Banu Haqim only"}, {"name": "Oblivion", "description": "Hecata only"}, {"name": "Obfuscate", "description": "Mental misdirection"}], "specialty": [{"skill": "Larceny", "name": "Lock Picking"}, {"skill": "Streetwise", "name": "Black Market"}]}),
        "grants_json": _json.dumps({"merits": [{"name": "Iron Gullet", "level": 3}], "flaws": [{"name": "Enemy", "notes": "Someone believes you owe them or hunts you"}]}),
    },
    {
        "name": "Blood Leech",
        "description": "You reject mortal blood and feed upon the vitae of other vampires through hunting those weaker than you, coercion, or taking blood as payment. This practice is not looked upon kindly.",
        "discipline": "Celerity", "discipline_level": 1,
        "specialty_skill": "Brawl", "specialty_name": "Kindred",
        "advantages": "Blood Potency +1",
        "flaws": "Lose one Humanity. Dark Secret: Diablerist (••) or Shunned (••). Prey Exclusion: Mortals (••).",
        "humanity_modifier": -1,
        "choices_json": _json.dumps({"discipline": [{"name": "Celerity", "description": "Supernatural speed"}, {"name": "Protean", "description": "Shapeshifting"}], "specialty": [{"skill": "Brawl", "name": "Kindred"}, {"skill": "Stealth", "name": "Against Kindred"}], "flaw": [{"name": "Dark Secret: Diablerist", "value": 2}, {"name": "Shunned", "value": 2}]}),
        "grants_json": _json.dumps({"special": {"blood_potency": 1}, "flaws": [{"name": "Prey Exclusion", "notes": "Mortals"}]}),
    },
    {
        "name": "Cleaver",
        "description": "You covertly take blood from close friends and family while maintaining relationships with them. You go to extreme lengths to keep your condition secret — or take less pleasant routes.",
        "discipline": "Dominate", "discipline_level": 1,
        "specialty_skill": "Persuasion", "specialty_name": "Gaslighting",
        "advantages": "Herd (••)",
        "flaws": "Dark Secret: Cleaver (•)",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Dominate", "description": "Mental domination"}, {"name": "Animalism", "description": "Control over beasts"}], "specialty": [{"skill": "Persuasion", "name": "Gaslighting"}, {"skill": "Subterfuge", "name": "Coverups"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Herd", "level": 2}], "flaws": [{"name": "Dark Secret", "notes": "Cleaver — your human family does not know what you are"}]}),
    },
    {
        "name": "Consensualist",
        "description": "You never feed against a victim's free will — posing as a charity blood drive, someone with a blood kink, or even admitting the truth and getting permission. The last method is a Masquerade breach.",
        "discipline": "Auspex", "discipline_level": 1,
        "specialty_skill": "Medicine", "specialty_name": "Phlebotomy",
        "advantages": "Gain one dot of Humanity.",
        "flaws": "Dark Secret: Masquerade Breacher (•). Prey Exclusion: Non-consenting (•).",
        "humanity_modifier": 1,
        "choices_json": _json.dumps({"discipline": [{"name": "Auspex", "description": "Supernatural senses"}, {"name": "Fortitude", "description": "Supernatural resilience"}], "specialty": [{"skill": "Medicine", "name": "Phlebotomy"}, {"skill": "Persuasion", "name": "Vessels"}]}),
        "grants_json": _json.dumps({"flaws": [{"name": "Masquerade Breacher", "notes": "Dark Secret — you have fed with consent and revealed your nature"}, {"name": "Prey Exclusion", "notes": "Non-consenting mortals"}]}),
    },
    {
        "name": "Farmer",
        "description": "You feed exclusively from animals. The Beast gnaws at you with hunger, but you have successfully avoided killing mortals except on bad nights. Unavailable to Ventrue or characters with Blood Potency 3+.",
        "discipline": "Animalism", "discipline_level": 1,
        "specialty_skill": "Animal Ken", "specialty_name": "Specific Animal",
        "advantages": "Gain one dot of Humanity.",
        "flaws": "Farmer (••) — you cannot feed on humans without strong provocation.",
        "humanity_modifier": 1,
        "choices_json": _json.dumps({"discipline": [{"name": "Animalism", "description": "Control over beasts"}, {"name": "Protean", "description": "Shapeshifting"}], "specialty": [{"skill": "Animal Ken", "name": "Specific animal (choose)"}, {"skill": "Survival", "name": "Hunting"}]}),
        "grants_json": _json.dumps({"flaws": [{"name": "Farmer", "notes": "Cannot feed on humans except under extreme provocation"}]}),
    },
    {
        "name": "Osiris",
        "description": "You are a celebrity, cult leader, musician, writer, or priest. Your followers come to you willingly, offering blood as tribute. Easy access to blood — but followers attract their own problems.",
        "discipline": "Blood Sorcery", "discipline_level": 1,
        "specialty_skill": "Occult", "specialty_name": "Specific Tradition",
        "advantages": "Three dots split between Fame and Herd backgrounds.",
        "flaws": "Two dots split between Enemies and Mythic flaws.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Blood Sorcery", "description": "Tremere/Banu Haqim only"}, {"name": "Presence", "description": "Supernatural charisma"}], "specialty": [{"skill": "Occult", "name": "Specific tradition (choose)"}, {"skill": "Performance", "name": "Specific entertainment field (choose)"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Fame", "level": 2}, {"name": "Herd", "level": 1}], "flaws": [{"name": "Enemy", "notes": "Enemies drawn by your fame"}, {"name": "Mythic", "notes": "Legends and expectations follow you"}]}),
    },
    {
        "name": "Sandman",
        "description": "You hunt sleeping mortals, gliding through bedrooms like a nightmare. Using stealth or Disciplines you feed without ever waking your victim — though being caught means serious problems.",
        "discipline": "Auspex", "discipline_level": 1,
        "specialty_skill": "Medicine", "specialty_name": "Anesthetics",
        "advantages": "One dot of Resources.",
        "flaws": "Prey Exclusion: Awake victims (•) — feeding on a conscious person triggers Stains.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Auspex", "description": "Supernatural senses"}, {"name": "Obfuscate", "description": "Invisibility and misdirection"}], "specialty": [{"skill": "Medicine", "name": "Anesthetics"}, {"skill": "Stealth", "name": "Break-in"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Resources", "level": 1}], "flaws": [{"name": "Prey Exclusion", "notes": "Awake victims — conscious prey triggers Stains"}]}),
    },
    {
        "name": "Scene Queen",
        "description": "You hunt within a subculture you likely belonged to in life — street culture, high fashion, underground music. Your victims adore your status and disbelieve those who suspect the truth.",
        "discipline": "Dominate", "discipline_level": 1,
        "specialty_skill": "Etiquette", "specialty_name": "Specific Scene",
        "advantages": "Fame (•), Contacts (•)",
        "flaws": "Disliked (•) outside your subculture, or Prey Exclusion (•) for a different subculture.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Dominate", "description": "Mental domination"}, {"name": "Potence", "description": "Supernatural strength"}], "specialty": [{"skill": "Etiquette", "name": "Specific scene (choose)"}, {"skill": "Leadership", "name": "Specific scene (choose)"}, {"skill": "Streetwise", "name": "Specific scene (choose)"}], "flaw": [{"name": "Disliked", "value": 1, "notes": "Outside your subculture"}, {"name": "Prey Exclusion", "value": 1, "notes": "A different subculture"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Fame", "level": 1}, {"name": "Contacts", "level": 1}], "flaws": [{"name": "Prey Exclusion", "notes": "Outside your scene"}]}),
    },
    {
        "name": "Siren",
        "description": "You feed while feigning sex or sexual interest, using Disciplines and seduction to lure prey. Moving through clubs and one-night stands are skills you have mastered.",
        "discipline": "Fortitude", "discipline_level": 1,
        "specialty_skill": "Persuasion", "specialty_name": "Seduction",
        "advantages": "Beautiful Merit (••)",
        "flaws": "Enemy (•) — a spurned lover or jealous partner.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Fortitude", "description": "Supernatural resilience"}, {"name": "Presence", "description": "Supernatural charisma"}], "specialty": [{"skill": "Persuasion", "name": "Seduction"}, {"skill": "Subterfuge", "name": "Seduction"}]}),
        "grants_json": _json.dumps({"merits": [{"name": "Striking Looks", "level": 2}], "flaws": [{"name": "Enemy", "notes": "A spurned lover or jealous partner"}]}),
    },
    {
        "name": "Extortionist",
        "description": "You acquire blood in exchange for services — protection, security, surveillance. For as many times as the service is genuine, there are many times when it is fabricated to make the deal sweeter.",
        "discipline": "Dominate", "discipline_level": 1,
        "specialty_skill": "Intimidation", "specialty_name": "Coercion",
        "advantages": "Three dots split between Contacts and Resources.",
        "flaws": "Enemy (••) — the police or a victim who escaped and wants revenge.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Dominate", "description": "Mental domination"}, {"name": "Potence", "description": "Supernatural strength"}], "specialty": [{"skill": "Intimidation", "name": "Coercion"}, {"skill": "Larceny", "name": "Security"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Contacts", "level": 2}, {"name": "Resources", "level": 1}], "flaws": [{"name": "Enemy", "notes": "Police or an escaped victim who wants revenge"}]}),
    },
    {
        "name": "Graverobber",
        "description": "Similar to Baggers, you understand there is no good in wasting blood. You dig up corpses or work in mortuaries — but often prefer feeding from grieving mourners at gravesites or hospitals.",
        "discipline": "Fortitude", "discipline_level": 1,
        "specialty_skill": "Occult", "specialty_name": "Grave Rituals",
        "advantages": "Iron Gullet (•••), Haven (•)",
        "flaws": "Obvious Predator (••) — something about you screams death to mortals.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Fortitude", "description": "Supernatural resilience"}, {"name": "Oblivion", "description": "Command over darkness and death"}], "specialty": [{"skill": "Occult", "name": "Grave Rituals"}, {"skill": "Medicine", "name": "Cadavers"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Haven", "level": 1}], "merits": [{"name": "Iron Gullet", "level": 3}], "flaws": [{"name": "Obvious Predator", "notes": "Something about you screams death to mortals"}]}),
    },
    {
        "name": "Roadside Killer",
        "description": "You are always on the move, hunting those who will not be missed alongside the road. Roadside Killers know the risk is just as worth as the reward — you never stay in one spot for long.",
        "discipline": "Fortitude", "discipline_level": 1,
        "specialty_skill": "Survival", "specialty_name": "The Road",
        "advantages": "Two dots of migrating Herd.",
        "flaws": "Prey Exclusion: Locals (•) — you struggle to feed on people with roots in a community.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Fortitude", "description": "Supernatural resilience"}, {"name": "Protean", "description": "Shapeshifting"}], "specialty": [{"skill": "Survival", "name": "The Road"}, {"skill": "Investigation", "name": "Vampire Cant"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Herd", "level": 2, "notes": "Migrating — across multiple cities"}], "flaws": [{"name": "Prey Exclusion", "notes": "Locals — you cannot feed on people with established roots"}]}),
    },
    {
        "name": "Grim Reaper",
        "description": "You hunt inside hospice care facilities and assisted living homes, feeding from those near the end of their lives. Constantly on the move to locate new victims, you may develop a taste for specific diseases.",
        "discipline": "Auspex", "discipline_level": 1,
        "specialty_skill": "Awareness", "specialty_name": "Death",
        "advantages": "One dot of Allies or Influence (medical community). Gain one dot of Humanity.",
        "flaws": "Prey Exclusion: Healthy Mortals (•) — you cannot feed from those not near death.",
        "humanity_modifier": 1,
        "choices_json": _json.dumps({"discipline": [{"name": "Auspex", "description": "Supernatural senses"}, {"name": "Oblivion", "description": "Command over darkness and death"}], "specialty": [{"skill": "Awareness", "name": "Death"}, {"skill": "Larceny", "name": "Forgery"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Allies", "level": 1, "notes": "Medical community — doctor, nurse, or orderly"}], "flaws": [{"name": "Prey Exclusion", "notes": "Healthy mortals — you can only feed from those near death"}]}),
    },
    {
        "name": "Montero",
        "description": "Carrying on the aristocratic Spanish tradition of hunting, your retainers drive victims towards you. This takes the form of long cons, flash mobs, or gang pursuits — expert planning, patient waiting.",
        "discipline": "Dominate", "discipline_level": 1,
        "specialty_skill": "Leadership", "specialty_name": "Hunting Pack",
        "advantages": "Two dots of Retainers.",
        "flaws": "Lose one dot of Humanity.",
        "humanity_modifier": -1,
        "choices_json": _json.dumps({"discipline": [{"name": "Dominate", "description": "Mental domination"}, {"name": "Obfuscate", "description": "Invisibility and misdirection"}], "specialty": [{"skill": "Leadership", "name": "Hunting Pack"}, {"skill": "Stealth", "name": "Stakeout"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Retainers", "level": 2}]}),
    },
    {
        "name": "Pursuer",
        "description": "You stalk your victim, learning their habits and routines, determining whether they will cause an outcry if they disappear. You strike when the time is right and hunger is at a perfect balance.",
        "discipline": "Animalism", "discipline_level": 1,
        "specialty_skill": "Investigation", "specialty_name": "Profiling",
        "advantages": "Bloodhound Merit (•), one dot of Contacts from morally flexible inhabitants where you hunt.",
        "flaws": "Lose one dot of Humanity.",
        "humanity_modifier": -1,
        "choices_json": _json.dumps({"discipline": [{"name": "Animalism", "description": "Control over beasts"}, {"name": "Auspex", "description": "Supernatural senses"}], "specialty": [{"skill": "Investigation", "name": "Profiling"}, {"skill": "Stealth", "name": "Shadowing"}]}),
        "grants_json": _json.dumps({"merits": [{"name": "Bloodhound", "level": 1}], "backgrounds": [{"name": "Contacts", "level": 1, "notes": "Morally flexible locals"}]}),
    },
    {
        "name": "Trapdoor",
        "description": "Much like the spider, you build a nest and lure prey inside — an amusement park, an abandoned house, an underground club. The victim comes to you. Then you play with their mind, imprison them, or take a deep drink and send them home.",
        "discipline": "Protean", "discipline_level": 1,
        "specialty_skill": "Persuasion", "specialty_name": "Marketing",
        "advantages": "One dot of Haven, plus one dot of Retainers or Herd (or a second Haven dot).",
        "flaws": "Haven Flaw: Creepy (•) or Haunted (•).",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Protean", "description": "Shapeshifting"}, {"name": "Obfuscate", "description": "Invisibility and misdirection"}], "specialty": [{"skill": "Persuasion", "name": "Marketing"}, {"skill": "Stealth", "name": "Ambushes or Traps"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Haven", "level": 1}], "flaws": [{"name": "Creepy", "notes": "Haven flaw — your lair unsettles all who enter"}]}),
    },
    {
        "name": "Tithe Collector",
        "description": "You hold enough power that other Kindred pay tribute in the form of specially selected vessels, delivered regularly or upon request. The vessels must be kept in reasonable condition — the Masquerade is everyone else's problem.",
        "discipline": "Dominate", "discipline_level": 1,
        "specialty_skill": "Intimidation", "specialty_name": "Kindred",
        "advantages": "Three dots of Domain or Status.",
        "flaws": "Adversary (••) — a rival who disputes your claim.",
        "humanity_modifier": 0,
        "choices_json": _json.dumps({"discipline": [{"name": "Dominate", "description": "Mental domination"}, {"name": "Presence", "description": "Supernatural charisma"}], "specialty": [{"skill": "Intimidation", "name": "Kindred"}, {"skill": "Leadership", "name": "Kindred"}]}),
        "grants_json": _json.dumps({"backgrounds": [{"name": "Status", "level": 3}], "flaws": [{"name": "Adversary", "notes": "A rival Kindred who disputes your domain or status"}]}),
    },
]

NON_CANONICAL = ["Headhunter", "Stalker"]


def fix():
    db = SessionLocal()
    try:
        disc_lookup = {d.name: d for d in db.query(Discipline).all()}

        # Warn about non-canonical types in use
        for name in NON_CANONICAL:
            pt = db.query(PredatorType).filter(PredatorType.name == name).first()
            if pt:
                count = db.query(Character).filter(Character.predator_type_id == pt.id).count()
                if count > 0:
                    print(f"WARNING: '{name}' has {count} character(s) using it — skipping removal.")
                else:
                    db.delete(pt)
                    print(f"Removed non-canonical predator type: {name}")

        db.flush()

        for data in CORRECT_DATA:
            disc_name = data["discipline"]
            disc = disc_lookup.get(disc_name)
            if not disc:
                print(f"WARNING: Discipline '{disc_name}' not found, skipping {data['name']}")
                continue

            pt = db.query(PredatorType).filter(PredatorType.name == data["name"]).first()
            if pt:
                # Update existing
                pt.description       = data["description"]
                pt.discipline_id     = disc.id
                pt.discipline_level  = data["discipline_level"]
                pt.specialty_skill   = data["specialty_skill"]
                pt.specialty_name    = data["specialty_name"]
                pt.advantages        = data["advantages"]
                pt.flaws             = data["flaws"]
                pt.humanity_modifier = data["humanity_modifier"]
                pt.choices_json      = data.get("choices_json")
                pt.grants_json       = data.get("grants_json")
                print(f"Updated: {data['name']}")
            else:
                # Insert new
                db.add(PredatorType(
                    name             = data["name"],
                    description      = data["description"],
                    discipline_id    = disc.id,
                    discipline_level = data["discipline_level"],
                    specialty_skill  = data["specialty_skill"],
                    specialty_name   = data["specialty_name"],
                    advantages       = data["advantages"],
                    flaws            = data["flaws"],
                    humanity_modifier= data["humanity_modifier"],
                    choices_json     = data.get("choices_json"),
                    grants_json      = data.get("grants_json"),
                ))
                print(f"Added: {data['name']}")

        db.commit()
        print(f"\nDone. Total predator types: {db.query(PredatorType).count()}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix()
