"""
Business logic for character creation wizard.
Validates each step and builds the final character.

Step order (new):
  1 - Core Concept
  2 - Clan
  3 - Attributes
  4 - Skills + Specialties
  5 - Disciplines
  6 - Advantages & Flaws
  7 - Beliefs
  8 - Humanity
  9 - Predator Type (optional)
  10 - Generation
"""
from collections import Counter
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.character import (
    Character, CharacterStatus, Generation,
    CharacterAttribute, CharacterSkill, CharacterSpecialty,
    CharacterDiscipline, CharacterPower,
    CharacterMerit, CharacterBackground, CharacterFlaw,
    CharacterConviction, CharacterTenet, WizardDraft
)
from app.models.game_data import Clan, PredatorType, Discipline, DisciplinePower, Merit, Flaw, Background
from app.schemas.character import (
    Step1Data, Step2Data, Step3Data, Step4Data, Step5Data,
    Step6Data, Step7Data, Step8Data, Step9Data, Step10Data
)

ALL_ATTRIBUTES = [
    "Strength", "Dexterity", "Stamina",
    "Charisma", "Manipulation", "Composure",
    "Intelligence", "Wits", "Resolve"
]

ALL_SKILLS = [
    "Athletics", "Brawl", "Craft", "Drive", "Firearms", "Larceny", "Melee", "Stealth", "Survival",
    "Animal_Ken", "Etiquette", "Insight", "Intimidation", "Leadership", "Performance", "Persuasion", "Streetwise", "Subterfuge",
    "Academics", "Awareness", "Finance", "Investigation", "Medicine", "Occult", "Politics", "Science", "Technology"
]

# Skills that automatically come with a free specialty if you have dots in them
AUTO_SPECIALTY_SKILLS = {"Academics", "Craft", "Performance", "Science"}

# Skill distributions: name → {expected counts by value, max allowed value}
SKILL_DISTRIBUTIONS = {
    "jack": {
        "label": "Jack of All Trades",
        "max": 3,
        "counts": {3: 1, 2: 8, 1: 10},   # exactly 1 at 3, 8 at 2, 10 at 1
    },
    "balanced": {
        "label": "Balanced",
        "max": 3,
        "counts": {3: 3, 2: 5, 1: 7},    # exactly 3 at 3, 5 at 2, 7 at 1
    },
    "specialist": {
        "label": "Specialist",
        "max": 4,
        "counts": {4: 1, 3: 3, 2: 3, 1: 3},  # exactly 1 at 4, 3 at 3, 3 at 2, 3 at 1
    },
}

GENERATION_BP = {
    Generation.childer: 0,
    Generation.neonate: 1,
    Generation.ancillae: 2,
}


def get_or_create_draft(user_id: int, db: Session) -> WizardDraft:
    draft = db.query(WizardDraft).filter(WizardDraft.user_id == user_id).first()
    if not draft:
        draft = WizardDraft(user_id=user_id, current_step=1, data={})
        db.add(draft)
        db.commit()
        db.refresh(draft)
    return draft


def save_draft_step(user_id: int, step: int, step_data: dict, db: Session) -> WizardDraft:
    draft = get_or_create_draft(user_id, db)
    current_data = dict(draft.data or {})
    current_data[f"step{step}"] = step_data
    draft.data = current_data
    # Cap current_step at 10 — step 10 is the last step
    draft.current_step = min(10, max(draft.current_step, step + 1))
    db.commit()
    db.refresh(draft)
    return draft


def validate_step1(data: Step1Data):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Character name is required")
    if not data.concept.strip():
        raise HTTPException(status_code=400, detail="Concept is required")


def validate_step2(data: Step2Data, db: Session):
    clan = db.query(Clan).filter(Clan.id == data.clan_id).first()
    if not clan:
        raise HTTPException(status_code=400, detail="Invalid clan ID")
    return clan


def validate_step3(data: Step3Data):
    """Step 3 — Attributes. Rule: one at 4, three at 3, four at 2, one at 1."""
    values = [
        data.attributes.Strength, data.attributes.Dexterity, data.attributes.Stamina,
        data.attributes.Charisma, data.attributes.Manipulation, data.attributes.Composure,
        data.attributes.Intelligence, data.attributes.Wits, data.attributes.Resolve
    ]
    counts = Counter(values)

    if any(v < 1 or v > 5 for v in values):
        raise HTTPException(status_code=400, detail="All attribute values must be between 1 and 5")

    expected = {4: 1, 3: 3, 2: 4, 1: 1}
    for val, expected_count in expected.items():
        if counts.get(val, 0) != expected_count:
            raise HTTPException(
                status_code=400,
                detail=f"Attribute distribution must be: one at 4, three at 3, four at 2, one at 1. Got: {dict(counts)}"
            )


def validate_step4(data: Step4Data):
    """Step 4 — Skills. Validate distribution type and specialty requirements."""
    dist = SKILL_DISTRIBUTIONS.get(data.distribution)
    if not dist:
        raise HTTPException(status_code=400, detail=f"Invalid distribution. Choose: jack, balanced, or specialist")

    skills_dict = data.skills.dict()

    # Check max level
    if any(v > dist["max"] for v in skills_dict.values()):
        raise HTTPException(
            status_code=400,
            detail=f"Max skill level for '{dist['label']}' is {dist['max']}"
        )

    # Check exact distribution counts
    value_counts = Counter(v for v in skills_dict.values() if v > 0)
    for level, expected in dist["counts"].items():
        actual = value_counts.get(level, 0)
        if actual != expected:
            raise HTTPException(
                status_code=400,
                detail=f"'{dist['label']}' requires exactly {expected} skill(s) at {level}. You have {actual}."
            )

    # Check no unexpected levels (e.g., a 4 in jack/balanced)
    for level in value_counts:
        if level not in dist["counts"] and level > 0:
            raise HTTPException(
                status_code=400,
                detail=f"'{dist['label']}' does not allow skills at level {level}"
            )

    # Specialty validation
    skills_with_dots = {name for name, val in skills_dict.items() if val > 0}

    # Auto-specialty skills that have dots → must have a specialty
    required_auto = AUTO_SPECIALTY_SKILLS & skills_with_dots
    provided_specialty_skills = {s.skill_name for s in data.specialties}

    for skill in required_auto:
        if skill not in provided_specialty_skills:
            raise HTTPException(
                status_code=400,
                detail=f"Must choose a specialty for {skill} (automatic specialty rule)"
            )

    # "Take one MORE free specialty" — in addition to any auto specialties
    # Minimum required: len(required_auto) + 1 (the free extra one)
    min_specialties = len(required_auto) + 1
    if len(skills_with_dots) > 0 and len(data.specialties) < min_specialties:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Must choose at least {min_specialties} specialties "
                f"({len(required_auto)} auto + 1 free extra). Got {len(data.specialties)}."
            )
        )

    # All provided specialties must be for skills with dots
    for sp in data.specialties:
        if sp.skill_name not in skills_with_dots:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add specialty for '{sp.skill_name}' — no dots in that skill"
            )


def validate_step5(data: Step5Data, clan: Clan, db: Session):
    """Step 5 — Disciplines. 2 disciplines, 3 total dots.
    Caitiff and Thin-Blooded have no clan disciplines, so they may pick any 2.
    """
    if len(data.disciplines) != 2:
        raise HTTPException(status_code=400, detail="Must select exactly 2 disciplines")

    is_clanless = len(clan.disciplines) == 0  # Caitiff, Thin-Blooded
    clan_discipline_ids = {d.id for d in clan.disciplines}
    total_dots = sum(d.level for d in data.disciplines)

    if total_dots != 3:
        raise HTTPException(status_code=400, detail=f"Must assign exactly 3 discipline dots. Got {total_dots}")

    for disc_sel in data.disciplines:
        disc = db.query(Discipline).filter(Discipline.id == disc_sel.discipline_id).first()
        if not disc:
            raise HTTPException(status_code=400, detail=f"Invalid discipline ID: {disc_sel.discipline_id}")
        # Only enforce clan restriction for clanned vampires
        if not is_clanless and disc_sel.discipline_id not in clan_discipline_ids:
            raise HTTPException(status_code=400, detail=f"{disc.name} is not a clan discipline for {clan.name}")
        if disc_sel.level < 1 or disc_sel.level > 3:
            raise HTTPException(status_code=400, detail="Discipline level must be between 1 and 3 at creation")

        if len(disc_sel.power_ids) != disc_sel.level:
            raise HTTPException(
                status_code=400,
                detail=f"Must select {disc_sel.level} power(s) for {disc.name} (one per dot)"
            )

        for power_id in disc_sel.power_ids:
            power = db.query(DisciplinePower).filter(
                DisciplinePower.id == power_id,
                DisciplinePower.discipline_id == disc_sel.discipline_id
            ).first()
            if not power:
                raise HTTPException(status_code=400, detail=f"Invalid power ID {power_id} for discipline")


def validate_step6(data: Step6Data, db: Session):
    """Step 6 — Advantages: 7 points to spend, exactly 2 points of flaws."""
    total_cost = sum(a.level for a in data.advantages)
    if total_cost > 7:
        raise HTTPException(status_code=400, detail=f"Advantages cost {total_cost} points but only 7 are available")

    total_flaw_value = 0
    for fi in data.flaws:
        flaw = db.query(Flaw).filter(Flaw.id == fi.id).first()
        if not flaw:
            raise HTTPException(status_code=400, detail=f"Invalid flaw ID: {fi.id}")
        total_flaw_value += flaw.value

    if total_flaw_value != 2:
        raise HTTPException(status_code=400, detail=f"Must take exactly 2 points of flaws. Got {total_flaw_value}")


def validate_step7(data: Step7Data):
    """Step 7 — Beliefs: 0-3 convictions, each must have a touchstone."""
    if len(data.convictions) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 convictions")
    for c in data.convictions:
        if not c.conviction.strip() or not c.touchstone.strip():
            raise HTTPException(status_code=400, detail="Each conviction must have a paired touchstone")


def validate_step9(data: Step9Data, db: Session):
    """Step 9 — Predator Type (optional). If provided, validate the ID."""
    if data.predator_type_id is None:
        return None  # skipped — that's fine
    pt = db.query(PredatorType).filter(PredatorType.id == data.predator_type_id).first()
    if not pt:
        raise HTTPException(status_code=400, detail="Invalid predator type ID")
    return pt


def build_character(user_id: int, draft: WizardDraft, db: Session) -> Character:
    """
    Take all wizard draft data and create the final Character record.
    Clears the wizard draft on success.
    """
    d = draft.data
    s1  = d.get("step1", {})    # concept
    s2  = d.get("step2", {})    # clan
    s3  = d.get("step3", {})    # attributes
    s4  = d.get("step4", {})    # skills + specialties
    s5  = d.get("step5", {})    # disciplines
    s6  = d.get("step6", {})    # advantages & flaws
    s7  = d.get("step7", {})    # beliefs
    s8  = d.get("step8", {})    # humanity
    s9  = d.get("step9", {})    # predator type (optional)
    s10 = d.get("step10", {})   # generation

    clan = db.query(Clan).filter(Clan.id == s2["clan_id"]).first()

    # Predator type is optional
    predator_type = None
    if s9.get("predator_type_id"):
        predator_type = db.query(PredatorType).filter(PredatorType.id == s9["predator_type_id"]).first()

    generation   = Generation(s10["generation"])
    blood_potency = GENERATION_BP[generation]
    humanity     = s8.get("humanity", 7)

    # Derived stats from attributes
    attrs     = s3.get("attributes", {})
    stamina   = attrs.get("Stamina", 1)
    composure = attrs.get("Composure", 1)
    resolve   = attrs.get("Resolve", 1)
    health    = 3 + stamina
    willpower = composure + resolve

    char = Character(
        user_id=user_id,
        status=CharacterStatus.complete,
        name=s1["name"],
        concept=s1["concept"],
        ambition=s1["ambition"],
        desire=s1["desire"],
        clan_id=s2["clan_id"],
        predator_type_id=s9.get("predator_type_id"),   # may be None
        humanity=humanity,
        generation=generation,
        blood_potency=blood_potency,
        health=health,
        willpower=willpower,
        biography=s10.get("biography"),
        notes=s10.get("notes"),
        haven_location=s10.get("haven_location"),
        haven_description=s10.get("haven_description"),
        total_xp=0,
        spent_xp=0,
    )
    db.add(char)
    db.flush()

    # ── Attributes ──
    for attr_name, value in attrs.items():
        db.add(CharacterAttribute(character_id=char.id, name=attr_name, value=value))

    # ── Skills ──
    skills = s4.get("skills", {})
    for skill_name, value in skills.items():
        if value > 0:
            db.add(CharacterSkill(character_id=char.id, name=skill_name, value=value))

    # ── Specialties from step 4 (includes auto + free) ──
    for sp in s4.get("specialties", []):
        db.add(CharacterSpecialty(
            character_id=char.id,
            skill_name=sp["skill_name"],
            specialty_name=sp["specialty_name"]
        ))

    # ── Predator type free specialty (use player choice if provided) ──
    if predator_type and predator_type.specialty_skill:
        spec_skill = s9.get("chosen_specialty_skill") or predator_type.specialty_skill
        spec_name  = s9.get("chosen_specialty_name")  or predator_type.specialty_name
        if spec_skill and spec_name:
            db.add(CharacterSpecialty(
                character_id=char.id,
                skill_name=spec_skill,
                specialty_name=spec_name
            ))

    # ── Disciplines ──
    disciplines_data = s5.get("disciplines", [])
    for disc_sel in disciplines_data:
        db.add(CharacterDiscipline(
            character_id=char.id,
            discipline_id=disc_sel["discipline_id"],
            level=disc_sel["level"]
        ))
        for power_id in disc_sel.get("power_ids", []):
            db.add(CharacterPower(character_id=char.id, power_id=power_id))
    db.flush()  # flush so predator-type discipline query can find these records

    # ── Predator type bonus discipline dot (use player choice if provided) ──
    if predator_type:
        # Resolve which discipline ID to grant — use chosen name or fall back to default
        chosen_disc_name = s9.get("chosen_discipline")
        if chosen_disc_name:
            pt_disc_id = db.query(Discipline.id).filter(Discipline.name == chosen_disc_name).scalar()
        else:
            pt_disc_id = predator_type.discipline_id   # use the FK directly, no lazy load

        if pt_disc_id:
            existing = next(
                (d for d in disciplines_data if d["discipline_id"] == pt_disc_id),
                None
            )
            if existing:
                disc_rec = db.query(CharacterDiscipline).filter(
                    CharacterDiscipline.character_id == char.id,
                    CharacterDiscipline.discipline_id == pt_disc_id
                ).first()
                if disc_rec:
                    disc_rec.level += 1
            else:
                db.add(CharacterDiscipline(
                    character_id=char.id,
                    discipline_id=pt_disc_id,
                    level=predator_type.discipline_level or 1
                ))

        # Also add the power the player chose for the predator type bonus dot
        predator_power_id = s5.get("predator_power_id")
        if predator_power_id:
            already_has_power = db.query(CharacterPower).filter(
                CharacterPower.character_id == char.id,
                CharacterPower.power_id == predator_power_id,
            ).first()
            if not already_has_power:
                db.add(CharacterPower(character_id=char.id, power_id=predator_power_id))

    # ── Advantages ──
    for adv in s6.get("advantages", []):
        if adv["type"] == "merit":
            db.add(CharacterMerit(character_id=char.id, merit_id=adv["id"], level=adv["level"], notes=adv.get("notes")))
        elif adv["type"] == "background":
            db.add(CharacterBackground(character_id=char.id, background_id=adv["id"], level=adv["level"], notes=adv.get("notes")))

    # ── Flaws ──
    for fi in s6.get("flaws", []):
        db.add(CharacterFlaw(character_id=char.id, flaw_id=fi["id"], notes=fi.get("notes")))

    # ── Predator type auto-grants (backgrounds / merits / flaws / special stats) ──
    if predator_type and predator_type.grants_json:
        import json as _json
        grants = _json.loads(predator_type.grants_json)

        # Backgrounds (Herd, Haven, Resources, Contacts, Fame, etc.)
        for grant_bg in grants.get("backgrounds", []):
            bg_obj = db.query(Background).filter(Background.name == grant_bg["name"]).first()
            if bg_obj:
                existing_bg = db.query(CharacterBackground).filter(
                    CharacterBackground.character_id == char.id,
                    CharacterBackground.background_id == bg_obj.id,
                ).first()
                if existing_bg:
                    # Stack: add granted dots on top of player-purchased dots, capped at 5
                    existing_bg.level = min(5, existing_bg.level + grant_bg.get("level", 1))
                else:
                    db.add(CharacterBackground(
                        character_id=char.id,
                        background_id=bg_obj.id,
                        level=grant_bg.get("level", 1),
                        notes=grant_bg.get("notes") or "(Granted by Predator Type)",
                    ))

        # Merits (Iron Gullet, Striking Looks, etc.)
        for grant_merit in grants.get("merits", []):
            merit_obj = db.query(Merit).filter(Merit.name == grant_merit["name"]).first()
            if merit_obj:
                already = db.query(CharacterMerit).filter(
                    CharacterMerit.character_id == char.id,
                    CharacterMerit.merit_id == merit_obj.id,
                ).first()
                if not already:
                    db.add(CharacterMerit(
                        character_id=char.id,
                        merit_id=merit_obj.id,
                        level=grant_merit.get("level", 1),
                        notes="(Granted by Predator Type)",
                    ))

        # Flaws (Enemy, Dark Secret, Prey Exclusion, etc.)
        for grant_flaw in grants.get("flaws", []):
            flaw_obj = db.query(Flaw).filter(Flaw.name == grant_flaw["name"]).first()
            if flaw_obj:
                already = db.query(CharacterFlaw).filter(
                    CharacterFlaw.character_id == char.id,
                    CharacterFlaw.flaw_id == flaw_obj.id,
                ).first()
                if not already:
                    db.add(CharacterFlaw(
                        character_id=char.id,
                        flaw_id=flaw_obj.id,
                        notes=grant_flaw.get("notes") or "(Granted by Predator Type)",
                    ))

        # Special stat bonuses (Blood Leech: +1 Blood Potency; Pursuer: +1 Stamina)
        special = grants.get("special", {})
        if special.get("blood_potency"):
            char.blood_potency = min(10, char.blood_potency + special["blood_potency"])
        if special.get("stamina"):
            stamina_increase = special["stamina"]
            # Raise the Stamina attribute and recalculate health
            sa = db.query(CharacterAttribute).filter(
                CharacterAttribute.character_id == char.id,
                CharacterAttribute.name == "Stamina",
            ).first()
            if sa:
                sa.value = min(5, sa.value + stamina_increase)
                char.health = 3 + sa.value

    # ── Convictions & Tenets ──
    for c in s7.get("convictions", []):
        db.add(CharacterConviction(character_id=char.id, conviction=c["conviction"], touchstone=c["touchstone"]))
    for t in s7.get("tenets", []):
        db.add(CharacterTenet(character_id=char.id, tenet=t))

    db.commit()
    db.delete(draft)
    db.commit()
    db.refresh(char)

    return char
