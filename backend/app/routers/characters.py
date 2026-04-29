from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.character import (
    Character, WizardDraft, CharacterStatus,
    CharacterAttribute, CharacterSkill,
    CharacterDiscipline, CharacterPower,
    CharacterMerit, CharacterBackground, CharacterFlaw,
    CharacterWeapon, CharacterPossession,
    CharacterConviction, CharacterTenet,
    CharacterRitual,
)
from app.models.game_data import Clan, Discipline, DisciplinePower, Ritual
from app.schemas.character import (
    DraftSaveRequest, DraftResponse, CharacterOut, CharacterSummaryOut, DirectoryCharOut,
    Step1Data, Step2Data, Step3Data, Step4Data, Step5Data,
    Step6Data, Step7Data, Step8Data, Step9Data, Step10Data,
    CharacterUpdateRequest, GMStatAdjustRequest, XPGrantRequest, XPSpendRequest,
    WeaponIn, PossessionIn, ImproveRequest, SessionUpdateRequest,
    MeritAddRequest, FlawAddRequest, BackgroundAddRequest,
    ConvictionAddRequest, TenetAddRequest, TempDotsRequest,
)
from app.services.character_creation import (
    get_or_create_draft, save_draft_step, build_character,
    validate_step1, validate_step2, validate_step3, validate_step4,
    validate_step5, validate_step6, validate_step7, validate_step9,
)

router = APIRouter(prefix="/api/characters", tags=["characters"])


def _apply_passive_discipline_effects(char: Character) -> None:
    """Apply passive discipline power effects to the character for display.

    These are non-persistent in-memory adjustments — the DB value stays
    as the base (Stamina + 3). Display code should use the adjusted values.

    Fortitude – Resilience (level 1):
        Passive. Add Fortitude rating to Health track size.
    """
    learned_power_names = {cp.power.name for cp in (char.powers or [])}

    if "Resilience" in learned_power_names:
        fortitude_cd = next(
            (cd for cd in (char.disciplines or []) if cd.discipline.name == "Fortitude"),
            None,
        )
        if fortitude_cd:
            char.health += fortitude_cd.level


def load_full_character(character_id: int, db: Session) -> Character:
    # joinedload for single-object relations (avoids extra round-trips)
    # selectinload for collections (avoids cartesian-product explosion)
    char = db.query(Character).options(
        joinedload(Character.clan).selectinload(Clan.disciplines),
        joinedload(Character.predator_type),
        selectinload(Character.attributes),
        selectinload(Character.skills),
        selectinload(Character.specialties),
        selectinload(Character.disciplines).joinedload(CharacterDiscipline.discipline).selectinload(Discipline.powers),
        selectinload(Character.powers).joinedload(CharacterPower.power),
        selectinload(Character.merits).joinedload(CharacterMerit.merit),
        selectinload(Character.backgrounds).joinedload(CharacterBackground.background),
        selectinload(Character.flaws).joinedload(CharacterFlaw.flaw),
        selectinload(Character.convictions),
        selectinload(Character.tenets),
        selectinload(Character.weapons),
        selectinload(Character.possessions),
        selectinload(Character.rituals).joinedload(CharacterRitual.ritual).joinedload(Ritual.discipline),
        selectinload(Character.retainers),
    ).filter(Character.id == character_id).first()
    if char:
        _apply_passive_discipline_effects(char)
    return char


# ── Wizard Draft ─────────────────────────────────────────────────────────────

@router.get("/wizard/draft", response_model=DraftResponse)
def get_draft(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current player's wizard draft."""
    draft = get_or_create_draft(current_user.id, db)
    return draft


@router.post("/wizard/draft")
def save_draft(body: DraftSaveRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save raw step data to the draft without validation. Use for auto-save."""
    draft = save_draft_step(current_user.id, body.step, body.data, db)
    return {"message": "Draft saved", "current_step": draft.current_step}


@router.delete("/wizard/draft", status_code=204)
def reset_draft(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete the current wizard draft so the player starts fresh from step 1."""
    draft = db.query(WizardDraft).filter(WizardDraft.user_id == current_user.id).first()
    if draft:
        db.delete(draft)
        db.commit()


# ── Wizard Steps (validated) ──────────────────────────────────────────────────

@router.post("/wizard/step/1")
def step1(body: Step1Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    validate_step1(body)
    save_draft_step(current_user.id, 1, body.dict(), db)
    return {"message": "Step 1 saved", "next_step": 2}


@router.post("/wizard/step/2")
def step2(body: Step2Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clan = validate_step2(body, db)
    save_draft_step(current_user.id, 2, body.dict(), db)
    return {"message": "Step 2 saved", "clan": clan.name, "next_step": 3}


@router.post("/wizard/step/3")
def step3(body: Step3Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 3 — Attributes"""
    validate_step3(body)
    save_draft_step(current_user.id, 3, body.dict(), db)
    return {"message": "Step 3 saved", "next_step": 4}


@router.post("/wizard/step/4")
def step4(body: Step4Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 4 — Skills + Specialties"""
    validate_step4(body)
    save_draft_step(current_user.id, 4, body.dict(), db)
    return {"message": "Step 4 saved", "next_step": 5}


@router.post("/wizard/step/5")
def step5(body: Step5Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 5 — Disciplines. Requires clan from step 2."""
    draft = get_or_create_draft(current_user.id, db)
    step2_data = draft.data.get("step2", {})
    if not step2_data:
        raise HTTPException(status_code=400, detail="Must complete Step 2 (Clan) before Disciplines")

    clan = db.query(Clan).options(
        joinedload(Clan.disciplines)
    ).filter(Clan.id == step2_data["clan_id"]).first()

    validate_step5(body, clan, db)
    save_draft_step(current_user.id, 5, body.dict(), db)
    return {"message": "Step 5 saved", "next_step": 6}


@router.post("/wizard/step/6")
def step6(body: Step6Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 6 — Advantages & Flaws"""
    validate_step6(body, db)
    save_draft_step(current_user.id, 6, body.dict(), db)
    return {"message": "Step 6 saved", "next_step": 7}


@router.post("/wizard/step/7")
def step7(body: Step7Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 7 — Beliefs"""
    validate_step7(body)
    save_draft_step(current_user.id, 7, body.dict(), db)
    return {"message": "Step 7 saved", "next_step": 8}


@router.post("/wizard/step/8")
def step8(body: Step8Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 8 — Humanity"""
    if body.humanity < 1 or body.humanity > 10:
        raise HTTPException(status_code=400, detail="Humanity must be between 1 and 10")
    save_draft_step(current_user.id, 8, body.dict(), db)
    return {"message": "Step 8 saved", "next_step": 9}


@router.post("/wizard/step/9")
def step9(body: Step9Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 9 — Predator Type (optional). predator_type_id may be null to skip."""
    validate_step9(body, db)
    save_draft_step(current_user.id, 9, body.dict(), db)
    return {"message": "Step 9 saved", "next_step": 10}


@router.post("/wizard/step/10")
def step10(body: Step10Data, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 10 — Generation & final details"""
    save_draft_step(current_user.id, 10, body.dict(), db)
    return {"message": "Step 10 saved — ready to complete character"}


@router.post("/wizard/complete", response_model=CharacterOut)
def complete_wizard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Finalize the wizard and create the character. Players may have multiple characters."""
    draft = db.query(WizardDraft).filter(WizardDraft.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=400, detail="No wizard draft found — complete all steps first")

    # Step 9 (predator type) is optional — not in required list
    required_steps = ["step1", "step2", "step3", "step4", "step5", "step6", "step7", "step8", "step10"]
    missing = [s for s in required_steps if s not in draft.data]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing steps: {missing}")

    char = build_character(current_user.id, draft, db)
    return load_full_character(char.id, db)


# ── Character Endpoints ───────────────────────────────────────────────────────
# NOTE: specific string paths (/mine) must come before the wildcard (/{id}).

@router.get("/my-retainers", response_model=list[CharacterSummaryOut])
def get_my_retainers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all retainer characters belonging to the current player."""
    return (
        db.query(Character)
        .options(joinedload(Character.clan))
        .filter(Character.user_id == current_user.id, Character.is_retainer == True)
        .all()
    )


@router.get("/mine", response_model=list[CharacterSummaryOut])
def get_my_characters(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all complete characters belonging to the current player."""
    return (
        db.query(Character)
        .options(joinedload(Character.clan))
        .filter(Character.user_id == current_user.id, Character.status == CharacterStatus.complete, Character.is_retainer == False)
        .all()
    )


@router.get("/directory", response_model=list[DirectoryCharOut])
def get_directory(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Browse all completed characters — visible to any logged-in user."""
    chars = (
        db.query(Character)
        .options(joinedload(Character.clan), joinedload(Character.parent_character))
        .filter(Character.status == CharacterStatus.complete)
        .order_by(Character.name)
        .all()
    )
    # Attach parent character name for retainers (Pydantic reads from_attributes
    # but parent_character_name is a derived field, so set it manually)
    result = []
    for c in chars:
        out = DirectoryCharOut.model_validate(c)
        if c.is_retainer and c.parent_character:
            out.parent_character_name = c.parent_character.name
        result.append(out)
    return result


@router.get("/{character_id}", response_model=CharacterOut)
def get_character(character_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get full details for a single character."""
    char = load_full_character(character_id, db)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


@router.put("/{character_id}", response_model=CharacterOut)
def update_character(
    character_id: int,
    body: CharacterUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update biography, notes, and haven for a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    if body.ambition is not None:
        char.ambition = body.ambition
    if body.desire is not None:
        char.desire = body.desire
    if body.biography is not None:
        char.biography = body.biography
    if body.notes is not None:
        char.notes = body.notes
    if body.haven_location is not None:
        char.haven_location = body.haven_location
    if body.haven_description is not None:
        char.haven_description = body.haven_description
    if body.name is not None:
        char.name = body.name
    if body.concept is not None:
        char.concept = body.concept
    if body.clan_id is not None:
        char.clan_id = body.clan_id
    if body.predator_type_id is not None:
        char.predator_type_id = body.predator_type_id
    if body.generation is not None:
        from app.models.character import Generation as Gen
        char.generation = Gen(body.generation)
    db.commit()
    return load_full_character(char.id, db)


@router.post("/{character_id}/xp", response_model=CharacterOut)
def add_xp(
    character_id: int,
    body: XPGrantRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add experience points to a character the player owns."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="XP amount must be positive.")
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    char.total_xp += body.amount
    db.commit()
    return load_full_character(char.id, db)


@router.post("/{character_id}/xp/remove", response_model=CharacterOut)
def remove_xp(
    character_id: int,
    body: XPGrantRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove experience points from a character (correct a mistake). Cannot go below spent XP."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive.")
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    available = char.total_xp - char.spent_xp
    if body.amount > available:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot remove more than available (unspent) XP. Available: {available}."
        )
    char.total_xp -= body.amount
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}", status_code=204)
def delete_character(
    character_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete a character. Requires ownership."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    db.delete(char)
    db.commit()


# ── Session Save ─────────────────────────────────────────────────────────────

@router.put("/{character_id}/session", response_model=CharacterOut)
def save_session(
    character_id: int,
    body: SessionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save in-session state: hunger, damage tracks, humanity, blood potency."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    # Update only fields that were provided
    if body.current_hunger is not None:
        char.current_hunger = max(0, min(5, body.current_hunger))
    if body.humanity is not None:
        char.humanity = max(0, min(10, body.humanity))
    if body.blood_potency is not None:
        char.blood_potency = max(0, min(5, body.blood_potency))
    if body.health_superficial is not None:
        char.health_superficial = max(0, min(char.health, body.health_superficial))
    if body.health_aggravated is not None:
        char.health_aggravated = max(0, min(char.health, body.health_aggravated))
    if body.willpower_superficial is not None:
        char.willpower_superficial = max(0, min(char.willpower, body.willpower_superficial))
    if body.willpower_aggravated is not None:
        char.willpower_aggravated = max(0, min(char.willpower, body.willpower_aggravated))

    db.commit()
    return load_full_character(char.id, db)


# ── GM Stat Adjust ────────────────────────────────────────────────────────────

@router.put("/{character_id}/gm-adjust", response_model=CharacterOut)
def gm_adjust_stats(
    character_id: int,
    body: GMStatAdjustRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GM/admin endpoint to adjust permanent character stats (Humanity, Blood Potency)."""
    if current_user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Only GMs and admins can adjust character stats.")

    char = db.query(Character).filter(Character.id == character_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    if current_user.role == UserRole.gm:
        from app.models.group import Group, GroupMember
        has_access = db.query(GroupMember).join(
            Group, Group.id == GroupMember.group_id
        ).filter(
            Group.gm_id == current_user.id,
            GroupMember.character_id == character_id,
        ).first() is not None
        if not has_access:
            raise HTTPException(status_code=403, detail="Character is not in one of your groups.")

    if body.humanity is not None:
        char.humanity = max(0, min(10, body.humanity))
    if body.blood_potency is not None:
        char.blood_potency = max(0, min(5, body.blood_potency))
    if body.health is not None:
        char.health = max(1, min(15, body.health))
    if body.willpower is not None:
        char.willpower = max(1, min(10, body.willpower))
    if body.current_hunger is not None:
        char.current_hunger = max(0, min(5, body.current_hunger))
    if body.health_superficial is not None:
        char.health_superficial = max(0, min(char.health, body.health_superficial))
    if body.health_aggravated is not None:
        char.health_aggravated = max(0, min(char.health, body.health_aggravated))
    if body.willpower_superficial is not None:
        char.willpower_superficial = max(0, min(char.willpower, body.willpower_superficial))
    if body.willpower_aggravated is not None:
        char.willpower_aggravated = max(0, min(char.willpower, body.willpower_aggravated))

    db.commit()
    return load_full_character(char.id, db)


# ── XP Spend ──────────────────────────────────────────────────────────────────

@router.post("/{character_id}/xp/spend", response_model=CharacterOut)
def spend_xp(
    character_id: int,
    body: XPSpendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record that the player spent XP. Deducts from available (unspent) XP."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive.")
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    available = char.total_xp - char.spent_xp
    if body.amount > available:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough XP. Available: {available}, requested: {body.amount}."
        )
    char.spent_xp += body.amount
    db.commit()
    return load_full_character(char.id, db)


# ── Improve Trait (spend XP to raise attribute or skill) ─────────────────────

# XP costs per rulebook (Players Guide):
#   Attribute:  new_level × 5
#   Skill:      new_level × 3

ALL_VALID_ATTRIBUTES = {
    "Strength", "Dexterity", "Stamina",
    "Charisma", "Manipulation", "Composure",
    "Intelligence", "Wits", "Resolve",
}

ALL_VALID_SKILLS = {
    "Athletics", "Brawl", "Craft", "Drive", "Firearms", "Larceny",
    "Melee", "Stealth", "Survival",
    "Animal_Ken", "Etiquette", "Insight", "Intimidation", "Leadership",
    "Performance", "Persuasion", "Streetwise", "Subterfuge",
    "Academics", "Awareness", "Finance", "Investigation", "Medicine",
    "Occult", "Politics", "Science", "Technology",
}


@router.post("/{character_id}/improve", response_model=CharacterOut)
def improve_trait(
    character_id: int,
    body: ImproveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Spend XP to raise an attribute or skill by 1 dot."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    available_xp = char.total_xp - char.spent_xp

    if body.trait_type == "attribute":
        if body.trait_name not in ALL_VALID_ATTRIBUTES:
            raise HTTPException(status_code=400, detail=f"Unknown attribute: {body.trait_name}")
        trait = db.query(CharacterAttribute).filter(
            CharacterAttribute.character_id == character_id,
            CharacterAttribute.name == body.trait_name,
        ).first()
        if not trait:
            raise HTTPException(status_code=404, detail=f"Attribute '{body.trait_name}' not found on character.")
        if trait.value >= 5:
            raise HTTPException(status_code=400, detail="Already at maximum (5).")
        cost = (trait.value + 1) * 5
        if not body.free:
            if cost > available_xp:
                raise HTTPException(status_code=400, detail=f"Not enough XP. Need {cost}, have {available_xp}.")
            char.spent_xp += cost
        trait.value += 1

    elif body.trait_type == "skill":
        if body.trait_name not in ALL_VALID_SKILLS:
            raise HTTPException(status_code=400, detail=f"Unknown skill: {body.trait_name}")
        trait = db.query(CharacterSkill).filter(
            CharacterSkill.character_id == character_id,
            CharacterSkill.name == body.trait_name,
        ).first()
        if trait:
            if trait.value >= 5:
                raise HTTPException(status_code=400, detail="Already at maximum (5).")
            cost = (trait.value + 1) * 3
            if not body.free:
                if cost > available_xp:
                    raise HTTPException(status_code=400, detail=f"Not enough XP. Need {cost}, have {available_xp}.")
                char.spent_xp += cost
            trait.value += 1
        else:
            cost = 1 * 3
            if not body.free:
                if cost > available_xp:
                    raise HTTPException(status_code=400, detail=f"Not enough XP. Need {cost}, have {available_xp}.")
                char.spent_xp += cost
            db.add(CharacterSkill(character_id=character_id, name=body.trait_name, value=1))

    elif body.trait_type == "discipline":
        # Raise a discipline level by 1 dot.
        # V5 cost: new_level × 5 (in-clan) or new_level × 7 (out-of-clan).
        # Raising a dot includes ONE free power at the new level (pass power_id to claim it).
        if not body.discipline_id:
            raise HTTPException(status_code=400, detail="discipline_id is required.")
        char_disc = db.query(CharacterDiscipline).filter(
            CharacterDiscipline.character_id == character_id,
            CharacterDiscipline.discipline_id == body.discipline_id,
        ).first()
        # Determine in-clan vs out-of-clan
        from sqlalchemy import and_
        from app.models.game_data import clan_disciplines as clan_disc_table
        is_in_clan = db.execute(
            clan_disc_table.select().where(
                and_(
                    clan_disc_table.c.clan_id == char.clan_id,
                    clan_disc_table.c.discipline_id == body.discipline_id,
                )
            )
        ).first() is not None
        if not char_disc:
            # New discipline — create at level 1
            disc_obj = db.query(Discipline).filter(Discipline.id == body.discipline_id).first()
            if not disc_obj:
                raise HTTPException(status_code=404, detail="Discipline not found.")
            cost = 1 * (5 if is_in_clan else 7)
            if not body.free:
                if cost > available_xp:
                    raise HTTPException(status_code=400, detail=f"Not enough XP. Need {cost}, have {available_xp}.")
                char.spent_xp += cost
            char_disc = CharacterDiscipline(character_id=character_id, discipline_id=body.discipline_id, level=1)
            db.add(char_disc)
            db.flush()
            new_level = 1
        else:
            if char_disc.level >= 5:
                raise HTTPException(status_code=400, detail="Discipline already at maximum (5).")
            new_level = char_disc.level + 1
            cost = new_level * (5 if is_in_clan else 7)
            if not body.free:
                if cost > available_xp:
                    raise HTTPException(status_code=400, detail=f"Not enough XP. Need {cost}, have {available_xp}.")
                char.spent_xp += cost
            char_disc.level += 1
        # Claim the free power included with this dot purchase
        if body.power_id:
            free_power = db.query(DisciplinePower).filter(DisciplinePower.id == body.power_id).first()
            if not free_power or free_power.discipline_id != body.discipline_id:
                raise HTTPException(status_code=400, detail="Free power must belong to this discipline.")
            if free_power.level != new_level:
                raise HTTPException(status_code=400, detail=f"Free power must be level {new_level} to match the new dot.")
            already = db.query(CharacterPower).filter(
                CharacterPower.character_id == character_id,
                CharacterPower.power_id == body.power_id,
            ).first()
            if not already:
                db.add(CharacterPower(character_id=character_id, power_id=body.power_id))

    elif body.trait_type == "background":
        # Raise a background level by 1 dot. Cost: new_level × 3 XP (same as skills).
        if not body.background_id:
            raise HTTPException(status_code=400, detail="background_id is required.")
        char_bg = db.query(CharacterBackground).filter(
            CharacterBackground.character_id == character_id,
            CharacterBackground.background_id == body.background_id,
        ).first()
        if not char_bg:
            raise HTTPException(status_code=404, detail="Background not found on character.")
        if char_bg.level >= 5:
            raise HTTPException(status_code=400, detail="Background already at maximum (5).")
        cost = (char_bg.level + 1) * 3
        if not body.free:
            if cost > available_xp:
                raise HTTPException(status_code=400, detail=f"Not enough XP. Need {cost}, have {available_xp}.")
            char.spent_xp += cost
        char_bg.level += 1

    else:
        raise HTTPException(status_code=400, detail="trait_type must be 'attribute', 'skill', 'discipline', or 'background'.")

    # Recalculate health/willpower if relevant attribute changed
    if body.trait_type == "attribute" and body.trait_name in ("Stamina", "Composure", "Resolve"):
        attrs = {a.name: a.value for a in db.query(CharacterAttribute).filter(CharacterAttribute.character_id == character_id).all()}
        if body.trait_name == "Stamina":
            char.health = attrs.get("Stamina", 1) + 3
        if body.trait_name in ("Composure", "Resolve"):
            char.willpower = attrs.get("Composure", 1) + attrs.get("Resolve", 1)

    db.commit()
    return load_full_character(char.id, db)


# ── Undo Improve (refund XP and lower trait) ──────────────────────────────────

def _apply_refund(char: "Character", refund: int) -> None:
    """
    Subtract refund from spent_xp.  If spent_xp is already lower than the
    refund (e.g. the stat was raised at character creation with no XP recorded),
    clamp spent_xp to 0 and top up total_xp by the deficit so that available
    XP always increases by the full refund amount.
    """
    deficit = max(0, refund - char.spent_xp)
    char.spent_xp = max(0, char.spent_xp - refund)
    if deficit:
        char.total_xp += deficit


@router.post("/{character_id}/unimprove", response_model=CharacterOut)
def unimprove_trait(
    character_id: int,
    body: ImproveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Refund XP and lower a previously raised trait by 1 dot."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    if body.trait_type == "attribute":
        if body.trait_name not in ALL_VALID_ATTRIBUTES:
            raise HTTPException(status_code=400, detail=f"Unknown attribute: {body.trait_name}")
        trait = db.query(CharacterAttribute).filter(
            CharacterAttribute.character_id == character_id,
            CharacterAttribute.name == body.trait_name,
        ).first()
        if not trait or trait.value <= 1:
            raise HTTPException(status_code=400, detail="Attribute is already at minimum (1).")
        refund = trait.value * 5   # refund cost of the last dot bought
        trait.value -= 1
        _apply_refund(char, refund)

    elif body.trait_type == "skill":
        if body.trait_name not in ALL_VALID_SKILLS:
            raise HTTPException(status_code=400, detail=f"Unknown skill: {body.trait_name}")
        trait = db.query(CharacterSkill).filter(
            CharacterSkill.character_id == character_id,
            CharacterSkill.name == body.trait_name,
        ).first()
        if not trait or trait.value <= 0:
            raise HTTPException(status_code=400, detail="Skill is already at 0.")
        refund = trait.value * 3
        trait.value -= 1
        _apply_refund(char, refund)
        if trait.value == 0:
            db.delete(trait)

    elif body.trait_type == "discipline":
        if not body.discipline_id:
            raise HTTPException(status_code=400, detail="discipline_id is required.")
        char_disc = db.query(CharacterDiscipline).filter(
            CharacterDiscipline.character_id == character_id,
            CharacterDiscipline.discipline_id == body.discipline_id,
        ).first()
        if not char_disc or char_disc.level <= 1:
            raise HTTPException(status_code=400, detail="Discipline is already at minimum (1).")
        from sqlalchemy import and_
        from app.models.game_data import clan_disciplines as clan_disc_table
        is_in_clan = db.execute(
            clan_disc_table.select().where(
                and_(
                    clan_disc_table.c.clan_id == char.clan_id,
                    clan_disc_table.c.discipline_id == body.discipline_id,
                )
            )
        ).first() is not None
        refund = char_disc.level * (5 if is_in_clan else 7)
        # Remove the power that was learned at this dot level (V5: dots = powers, always equal)
        # If body.power_id given, remove that specific power; otherwise remove the highest-level one
        powers_at_level = (
            db.query(CharacterPower)
            .join(DisciplinePower, CharacterPower.power_id == DisciplinePower.id)
            .filter(
                CharacterPower.character_id == character_id,
                DisciplinePower.discipline_id == body.discipline_id,
                DisciplinePower.level == char_disc.level,
            ).all()
        )
        if body.power_id:
            to_remove = next((cp for cp in powers_at_level if cp.power_id == body.power_id), None)
            if not to_remove and powers_at_level:
                to_remove = powers_at_level[0]
        else:
            to_remove = powers_at_level[0] if powers_at_level else None
        if to_remove:
            db.delete(to_remove)
        char_disc.level -= 1
        _apply_refund(char, refund)

    elif body.trait_type == "background":
        if not body.background_id:
            raise HTTPException(status_code=400, detail="background_id is required.")
        char_bg = db.query(CharacterBackground).filter(
            CharacterBackground.character_id == character_id,
            CharacterBackground.background_id == body.background_id,
        ).first()
        if not char_bg or char_bg.level <= 1:
            raise HTTPException(status_code=400, detail="Background is already at minimum (1).")
        refund = char_bg.level * 3
        char_bg.level -= 1
        _apply_refund(char, refund)

    else:
        raise HTTPException(status_code=400, detail="trait_type must be 'attribute', 'skill', 'discipline', or 'background'.")

    # Recalculate health/willpower if relevant attribute changed
    if body.trait_type == "attribute" and body.trait_name in ("Stamina", "Composure", "Resolve"):
        attrs = {a.name: a.value for a in db.query(CharacterAttribute).filter(CharacterAttribute.character_id == character_id).all()}
        if body.trait_name == "Stamina":
            char.health = attrs.get("Stamina", 1) + 3
        if body.trait_name in ("Composure", "Resolve"):
            char.willpower = attrs.get("Composure", 1) + attrs.get("Resolve", 1)

    db.commit()
    return load_full_character(char.id, db)


# ── Claim free predator-type power (Option B — picked post-creation) ─────────

@router.post("/{character_id}/claim-predator-power", response_model=CharacterOut)
def claim_predator_power(
    character_id: int,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Claim the free power that came with the predator type discipline bonus dot.
    No XP cost — this is the Option B flow where the player picks it post-creation.
    body: { power_id: int }
    """
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    power_id = body.get("power_id")
    if not power_id:
        raise HTTPException(status_code=400, detail="power_id is required.")

    power = db.query(DisciplinePower).filter(DisciplinePower.id == power_id).first()
    if not power:
        raise HTTPException(status_code=404, detail="Power not found.")

    # Must be level 1 power (predator type always grants +1 starting from 0 or stacked on clan dots)
    # Verify the character actually has the corresponding discipline
    from app.models.character import CharacterDiscipline
    char_disc = db.query(CharacterDiscipline).filter(
        CharacterDiscipline.character_id == character_id,
        CharacterDiscipline.discipline_id == power.discipline_id,
    ).first()
    if not char_disc:
        raise HTTPException(status_code=400, detail="Character does not have this discipline.")

    # Power level must not exceed current discipline level
    if power.level > char_disc.level:
        raise HTTPException(status_code=400, detail=f"Power level {power.level} exceeds discipline level {char_disc.level}.")

    # Don't add duplicates
    already = db.query(CharacterPower).filter(
        CharacterPower.character_id == character_id,
        CharacterPower.power_id == power_id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Power already known.")

    db.add(CharacterPower(character_id=character_id, power_id=power_id))
    db.commit()
    return load_full_character(char.id, db)


# ── Set predator type post-wizard (for characters that skipped it) ────────────

@router.post("/{character_id}/set-predator-type", response_model=CharacterOut)
def set_predator_type(
    character_id: int,
    body: Step9Data,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply a predator type to a complete character that skipped it during the wizard."""
    import json as _json
    from app.models.game_data import PredatorType, Merit, Flaw, Background
    from app.models.character import (
        CharacterSpecialty, CharacterDiscipline, CharacterPower,
        CharacterMerit, CharacterFlaw, CharacterBackground,
    )

    char = db.query(Character).filter(
        Character.id == character_id,
        Character.user_id == current_user.id,
        Character.status == CharacterStatus.complete,
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    if char.predator_type_id:
        raise HTTPException(status_code=400, detail="Character already has a predator type.")
    if not body.predator_type_id:
        raise HTTPException(status_code=400, detail="predator_type_id is required.")

    pt = db.query(PredatorType).filter(PredatorType.id == body.predator_type_id).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Predator type not found.")

    char.predator_type_id = pt.id

    # Free specialty
    if pt.specialty_skill:
        spec_skill = body.chosen_specialty_skill or pt.specialty_skill
        spec_name  = body.chosen_specialty_name  or pt.specialty_name
        if spec_skill and spec_name:
            db.add(CharacterSpecialty(character_id=char.id, skill_name=spec_skill, specialty_name=spec_name))

    # Free discipline dot
    chosen_disc_name = body.chosen_discipline
    if chosen_disc_name:
        pt_disc = db.query(Discipline).filter(Discipline.name == chosen_disc_name).first()
        pt_disc_id = pt_disc.id if pt_disc else None
    else:
        pt_disc_id = pt.discipline_id

    if pt_disc_id:
        existing = db.query(CharacterDiscipline).filter(
            CharacterDiscipline.character_id == char.id,
            CharacterDiscipline.discipline_id == pt_disc_id,
        ).first()
        if existing:
            existing.level += 1
        else:
            db.add(CharacterDiscipline(character_id=char.id, discipline_id=pt_disc_id, level=pt.discipline_level or 1))

    # Auto-granted backgrounds / merits / flaws
    if pt.grants_json:
        grants = _json.loads(pt.grants_json)

        for grant_bg in grants.get("backgrounds", []):
            bg_obj = db.query(Background).filter(Background.name == grant_bg["name"]).first()
            if bg_obj:
                existing_bg = db.query(CharacterBackground).filter(
                    CharacterBackground.character_id == char.id,
                    CharacterBackground.background_id == bg_obj.id,
                ).first()
                if existing_bg:
                    existing_bg.level = min(5, existing_bg.level + grant_bg.get("level", 1))
                else:
                    db.add(CharacterBackground(character_id=char.id, background_id=bg_obj.id,
                                               level=grant_bg.get("level", 1),
                                               notes=grant_bg.get("notes") or "(Granted by Predator Type)"))

        for grant_merit in grants.get("merits", []):
            merit_obj = db.query(Merit).filter(Merit.name == grant_merit["name"]).first()
            if merit_obj:
                already = db.query(CharacterMerit).filter(CharacterMerit.character_id == char.id,
                                                          CharacterMerit.merit_id == merit_obj.id).first()
                if not already:
                    db.add(CharacterMerit(character_id=char.id, merit_id=merit_obj.id,
                                          level=grant_merit.get("level", 1),
                                          notes="(Granted by Predator Type)"))

        for grant_flaw in grants.get("flaws", []):
            flaw_obj = db.query(Flaw).filter(Flaw.name == grant_flaw["name"]).first()
            if flaw_obj:
                already = db.query(CharacterFlaw).filter(CharacterFlaw.character_id == char.id,
                                                         CharacterFlaw.flaw_id == flaw_obj.id).first()
                if not already:
                    db.add(CharacterFlaw(character_id=char.id, flaw_id=flaw_obj.id,
                                         notes=grant_flaw.get("notes") or "(Granted by Predator Type)"))

        special = grants.get("special", {})
        if special.get("blood_potency"):
            char.blood_potency = min(10, char.blood_potency + special["blood_potency"])

    # Chosen flaw (Blood Leech / Scene Queen choice)
    if body.chosen_flaw:
        flaw_obj = db.query(Flaw).filter(Flaw.name == body.chosen_flaw).first()
        if flaw_obj:
            already = db.query(CharacterFlaw).filter(CharacterFlaw.character_id == char.id,
                                                     CharacterFlaw.flaw_id == flaw_obj.id).first()
            if not already:
                db.add(CharacterFlaw(character_id=char.id, flaw_id=flaw_obj.id,
                                     notes="(Chosen via Predator Type)"))

    # Humanity modifier
    if pt.humanity_modifier:
        char.humanity = max(0, min(10, char.humanity + pt.humanity_modifier))

    db.commit()
    return load_full_character(char.id, db)


# ── Specialties ──────────────────────────────────────────────────────────────

class SpecialtyAddRequest(BaseModel):
    skill_name: str
    specialty_name: str

@router.post("/{character_id}/specialties", response_model=CharacterOut)
def add_specialty(
    character_id: int,
    body: SpecialtyAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a specialty to a skill."""
    from app.models.character import CharacterSpecialty
    char = db.query(Character).filter(
        Character.id == character_id,
        Character.user_id == current_user.id,
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    if not body.skill_name.strip() or not body.specialty_name.strip():
        raise HTTPException(status_code=400, detail="Skill name and specialty name are required.")
    db.add(CharacterSpecialty(
        character_id=character_id,
        skill_name=body.skill_name.strip(),
        specialty_name=body.specialty_name.strip(),
    ))
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/specialties", response_model=CharacterOut)
def delete_specialty(
    character_id: int,
    skill_name: str,
    specialty_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a specialty by skill + name."""
    from app.models.character import CharacterSpecialty
    char = db.query(Character).filter(
        Character.id == character_id,
        Character.user_id == current_user.id,
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    sp = db.query(CharacterSpecialty).filter(
        CharacterSpecialty.character_id == character_id,
        CharacterSpecialty.skill_name == skill_name,
        CharacterSpecialty.specialty_name == specialty_name,
    ).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Specialty not found.")
    db.delete(sp)
    db.commit()
    return load_full_character(char.id, db)


# ── Weapons ───────────────────────────────────────────────────────────────────

@router.post("/{character_id}/weapons", response_model=CharacterOut)
def add_weapon(
    character_id: int,
    body: WeaponIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a weapon to the character's inventory."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    weapon = CharacterWeapon(character_id=char.id, **body.dict())
    db.add(weapon)
    db.commit()
    return load_full_character(char.id, db)


@router.put("/{character_id}/weapons/{weapon_id}", response_model=CharacterOut)
def update_weapon(
    character_id: int,
    weapon_id: int,
    body: WeaponIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a weapon. Requires character ownership."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    weapon = db.query(CharacterWeapon).filter(
        CharacterWeapon.id == weapon_id, CharacterWeapon.character_id == character_id
    ).first()
    if not weapon:
        raise HTTPException(status_code=404, detail="Weapon not found.")
    for field, value in body.dict().items():
        setattr(weapon, field, value)
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/weapons/{weapon_id}", response_model=CharacterOut)
def delete_weapon(
    character_id: int,
    weapon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a weapon from the character's inventory."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    weapon = db.query(CharacterWeapon).filter(
        CharacterWeapon.id == weapon_id, CharacterWeapon.character_id == character_id
    ).first()
    if not weapon:
        raise HTTPException(status_code=404, detail="Weapon not found.")
    db.delete(weapon)
    db.commit()
    return load_full_character(char.id, db)


# ── Possessions ───────────────────────────────────────────────────────────────

@router.post("/{character_id}/possessions", response_model=CharacterOut)
def add_possession(
    character_id: int,
    body: PossessionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a possession to the character's inventory."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    possession = CharacterPossession(character_id=char.id, **body.dict())
    db.add(possession)
    db.commit()
    return load_full_character(char.id, db)


@router.put("/{character_id}/possessions/{possession_id}", response_model=CharacterOut)
def update_possession(
    character_id: int,
    possession_id: int,
    body: PossessionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a possession. Requires character ownership."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    possession = db.query(CharacterPossession).filter(
        CharacterPossession.id == possession_id,
        CharacterPossession.character_id == character_id
    ).first()
    if not possession:
        raise HTTPException(status_code=404, detail="Possession not found.")
    for field, value in body.dict().items():
        setattr(possession, field, value)
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/possessions/{possession_id}", response_model=CharacterOut)
def delete_possession(
    character_id: int,
    possession_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a possession from the character's inventory."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    possession = db.query(CharacterPossession).filter(
        CharacterPossession.id == possession_id,
        CharacterPossession.character_id == character_id
    ).first()
    if not possession:
        raise HTTPException(status_code=404, detail="Possession not found.")
    db.delete(possession)
    db.commit()
    return load_full_character(char.id, db)


# ── Merits ────────────────────────────────────────────────────────────────────

@router.post("/{character_id}/merits", response_model=CharacterOut, status_code=201)
def add_merit(
    character_id: int,
    body: MeritAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a merit to a character the player owns."""
    from app.models.game_data import Merit
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    merit = db.query(Merit).filter(Merit.id == body.merit_id).first()
    if not merit:
        raise HTTPException(status_code=404, detail="Merit not found.")
    existing = db.query(CharacterMerit).filter(
        CharacterMerit.character_id == character_id,
        CharacterMerit.merit_id == body.merit_id,
        CharacterMerit.level == body.level,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Merit at this level already on character.")
    db.add(CharacterMerit(character_id=character_id, merit_id=body.merit_id, level=body.level))
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/merits/{merit_id}", response_model=CharacterOut)
def remove_merit(
    character_id: int,
    merit_id: int,
    level: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a merit from a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    q = db.query(CharacterMerit).filter(
        CharacterMerit.character_id == character_id,
        CharacterMerit.merit_id == merit_id,
    )
    if level is not None:
        q = q.filter(CharacterMerit.level == level)
    cm = q.first()
    if not cm:
        raise HTTPException(status_code=404, detail="Merit not on character.")
    db.delete(cm)
    db.commit()
    return load_full_character(char.id, db)


# ── Flaws ─────────────────────────────────────────────────────────────────────

@router.post("/{character_id}/flaws", response_model=CharacterOut, status_code=201)
def add_flaw(
    character_id: int,
    body: FlawAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a flaw to a character the player owns."""
    from app.models.game_data import Flaw
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    flaw = db.query(Flaw).filter(Flaw.id == body.flaw_id).first()
    if not flaw:
        raise HTTPException(status_code=404, detail="Flaw not found.")
    existing = db.query(CharacterFlaw).filter(
        CharacterFlaw.character_id == character_id,
        CharacterFlaw.flaw_id == body.flaw_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Flaw already on character.")
    db.add(CharacterFlaw(character_id=character_id, flaw_id=body.flaw_id, notes=body.notes))
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/flaws/{flaw_id}", response_model=CharacterOut)
def remove_flaw(
    character_id: int,
    flaw_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a flaw from a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    cf = db.query(CharacterFlaw).filter(
        CharacterFlaw.character_id == character_id,
        CharacterFlaw.flaw_id == flaw_id,
    ).first()
    if not cf:
        raise HTTPException(status_code=404, detail="Flaw not on character.")
    db.delete(cf)
    db.commit()
    return load_full_character(char.id, db)


# ── Backgrounds ───────────────────────────────────────────────────────────────

@router.post("/{character_id}/backgrounds", response_model=CharacterOut, status_code=201)
def add_background(
    character_id: int,
    body: BackgroundAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a background to a character the player owns."""
    from app.models.game_data import Background
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    bg = db.query(Background).filter(Background.id == body.background_id).first()
    if not bg:
        raise HTTPException(status_code=404, detail="Background not found.")
    existing = db.query(CharacterBackground).filter(
        CharacterBackground.character_id == character_id,
        CharacterBackground.background_id == body.background_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Background already on character.")
    db.add(CharacterBackground(
        character_id=character_id,
        background_id=body.background_id,
        level=body.level,
        notes=getattr(body, "notes", None),
    ))
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/backgrounds/{background_id}", response_model=CharacterOut)
def remove_background(
    character_id: int,
    background_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a background from a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    cb = db.query(CharacterBackground).filter(
        CharacterBackground.character_id == character_id,
        CharacterBackground.background_id == background_id,
    ).first()
    if not cb:
        raise HTTPException(status_code=404, detail="Background not on character.")
    db.delete(cb)
    db.commit()
    return load_full_character(char.id, db)


# ── Convictions ───────────────────────────────────────────────────────────────

@router.post("/{character_id}/convictions", response_model=CharacterOut, status_code=201)
def add_conviction(
    character_id: int,
    body: ConvictionAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a conviction + touchstone to a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    db.add(CharacterConviction(
        character_id=character_id,
        conviction=body.conviction.strip(),
        touchstone=body.touchstone.strip(),
    ))
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/convictions/{conviction_id}", response_model=CharacterOut)
def remove_conviction(
    character_id: int,
    conviction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a conviction from a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    c = db.query(CharacterConviction).filter(
        CharacterConviction.id == conviction_id,
        CharacterConviction.character_id == character_id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conviction not found.")
    db.delete(c)
    db.commit()
    return load_full_character(char.id, db)


# ── Tenets ────────────────────────────────────────────────────────────────────

@router.post("/{character_id}/tenets", response_model=CharacterOut, status_code=201)
def add_tenet(
    character_id: int,
    body: TenetAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a chronicle tenet to a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    db.add(CharacterTenet(
        character_id=character_id,
        tenet=body.tenet.strip(),
    ))
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/tenets/{tenet_id}", response_model=CharacterOut)
def remove_tenet(
    character_id: int,
    tenet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a chronicle tenet from a character the player owns."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    t = db.query(CharacterTenet).filter(
        CharacterTenet.id == tenet_id,
        CharacterTenet.character_id == character_id,
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenet not found.")
    db.delete(t)
    db.commit()
    return load_full_character(char.id, db)


# ── Temporary Dots ────────────────────────────────────────────────────────────

@router.put("/{character_id}/temp-dots", response_model=CharacterOut)
def set_temp_dots(
    character_id: int,
    body: TempDotsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set (replace) the temporary dots state for a character. Pass null to clear all."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    char.temp_dots = body.temp_dots
    db.commit()
    return load_full_character(char.id, db)


# ── Retainers ─────────────────────────────────────────────────────────────────

class RetainerCreate(BaseModel):
    name: str
    concept: Optional[str] = None
    retainer_level: Optional[int] = None

@router.post("/{character_id}/retainers", response_model=CharacterOut, status_code=201)
def create_retainer(
    character_id: int,
    body: RetainerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a retainer linked to a character."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    retainer = Character(
        user_id=current_user.id,
        name=body.name,
        concept=body.concept,
        is_retainer=True,
        parent_character_id=character_id,
        retainer_level=body.retainer_level,
        status=CharacterStatus.complete,
        humanity=7,
        health=3,
        willpower=3,
    )
    db.add(retainer)
    db.flush()  # get retainer.id before commit
    for attr in ALL_VALID_ATTRIBUTES:
        db.add(CharacterAttribute(character_id=retainer.id, name=attr, value=1))
    db.commit()
    return load_full_character(char.id, db)


@router.delete("/{character_id}/retainers/{retainer_id}", response_model=CharacterOut)
def delete_retainer(
    character_id: int,
    retainer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a retainer."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    retainer = db.query(Character).filter(
        Character.id == retainer_id,
        Character.parent_character_id == character_id,
        Character.is_retainer == True,
    ).first()
    if not retainer:
        raise HTTPException(status_code=404, detail="Retainer not found.")
    db.delete(retainer)
    db.commit()
    return load_full_character(char.id, db)


@router.post("/{character_id}/disciplines", response_model=CharacterOut, status_code=201)
def add_discipline(
    character_id: int,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a discipline at level 1 to a character (used for retainers)."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    discipline_id = body.get("discipline_id")
    existing = db.query(CharacterDiscipline).filter(
        CharacterDiscipline.character_id == character_id,
        CharacterDiscipline.discipline_id == discipline_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Discipline already on character.")
    db.add(CharacterDiscipline(character_id=character_id, discipline_id=discipline_id, level=1))
    db.commit()
    return load_full_character(character_id, db)


@router.delete("/{character_id}/disciplines/{discipline_id}", response_model=CharacterOut)
def remove_discipline(
    character_id: int,
    discipline_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a discipline from a character (used for retainers)."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")
    cd = db.query(CharacterDiscipline).filter(
        CharacterDiscipline.character_id == character_id,
        CharacterDiscipline.discipline_id == discipline_id,
    ).first()
    if not cd:
        raise HTTPException(status_code=404, detail="Discipline not found.")
    db.delete(cd)
    db.commit()
    return load_full_character(character_id, db)


# ── Rituals ───────────────────────────────────────────────────────────────────

@router.post("/{character_id}/rituals/{ritual_id}", response_model=CharacterOut)
def learn_ritual(
    character_id: int,
    ritual_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Learn a ritual. XP cost = 3× ritual level. First level-1 ritual is free."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    ritual = db.query(Ritual).filter(Ritual.id == ritual_id).first()
    if not ritual:
        raise HTTPException(status_code=404, detail="Ritual not found.")

    # Character must have the discipline at a level ≥ ritual level
    disc = db.query(CharacterDiscipline).filter(
        CharacterDiscipline.character_id == character_id,
        CharacterDiscipline.discipline_id == ritual.discipline_id,
    ).first()
    if not disc:
        raise HTTPException(status_code=400, detail="Character does not have the required discipline.")
    if disc.level < ritual.level:
        raise HTTPException(status_code=400, detail=f"Requires {ritual.discipline.name} level {ritual.level}.")

    # No duplicates
    already = db.query(CharacterRitual).filter(
        CharacterRitual.character_id == character_id,
        CharacterRitual.ritual_id == ritual_id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Ritual already learned.")

    # XP cost: first level-1 ritual of this discipline is free, rest cost 3× level
    known_rituals = db.query(CharacterRitual).join(Ritual).filter(
        CharacterRitual.character_id == character_id,
        Ritual.discipline_id == ritual.discipline_id,
        Ritual.level == 1,
    ).count()
    is_free = (ritual.level == 1 and known_rituals == 0)
    xp_cost = 0 if is_free else ritual.level * 3

    if xp_cost > 0:
        available_xp = char.total_xp - char.spent_xp
        if available_xp < xp_cost:
            raise HTTPException(status_code=400, detail=f"Not enough XP. Need {xp_cost}, have {available_xp}.")
        char.spent_xp += xp_cost

    db.add(CharacterRitual(character_id=character_id, ritual_id=ritual_id))
    db.commit()
    return load_full_character(character_id, db)


@router.delete("/{character_id}/rituals/{ritual_id}", response_model=CharacterOut)
def unlearn_ritual(
    character_id: int,
    ritual_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a learned ritual and refund XP."""
    char = db.query(Character).filter(
        Character.id == character_id, Character.user_id == current_user.id
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found.")

    ritual = db.query(Ritual).filter(Ritual.id == ritual_id).first()
    if not ritual:
        raise HTTPException(status_code=404, detail="Ritual not found.")

    cr = db.query(CharacterRitual).filter(
        CharacterRitual.character_id == character_id,
        CharacterRitual.ritual_id == ritual_id,
    ).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Ritual not learned.")

    # Refund XP (first level-1 ritual was free — check if there are others)
    level1_known = db.query(CharacterRitual).join(Ritual).filter(
        CharacterRitual.character_id == character_id,
        Ritual.discipline_id == ritual.discipline_id,
        Ritual.level == 1,
        CharacterRitual.id != cr.id,
    ).count()
    was_free = (ritual.level == 1 and level1_known == 0)
    xp_refund = 0 if was_free else ritual.level * 3

    db.delete(cr)
    if xp_refund > 0:
        char.spent_xp = max(0, char.spent_xp - xp_refund)
    db.commit()
    return load_full_character(character_id, db)
