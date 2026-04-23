from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group, GroupMember
from app.models.character import Character, CharacterSkill, CharacterAttribute, CharacterDiscipline, CharacterPower, CharacterStatus
from app.models.game_data import DisciplinePower
from app.schemas.group import (
    GroupCreate, GroupUpdate, AddMemberRequest, PatchMemberRequest,
    GroupOut, GroupSummaryOut, GroupMemberOut, GMCharacterCard,
    UserSearchResult, CharacterSearchSummary,
)

router = APIRouter(prefix="/api/groups", tags=["groups"])


def require_gm(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="Game Masters only.")
    return current_user


def build_character_card(char: Character, db: Session) -> GMCharacterCard:
    """Build the GM character card from a Character row."""
    skills = (
        db.query(CharacterSkill)
        .filter(CharacterSkill.character_id == char.id)
        .order_by(CharacterSkill.value.desc())
        .all()
    )
    attrs = (
        db.query(CharacterAttribute)
        .filter(CharacterAttribute.character_id == char.id)
        .all()
    )
    discs = (
        db.query(CharacterDiscipline)
        .options(joinedload(CharacterDiscipline.discipline))
        .filter(CharacterDiscipline.character_id == char.id)
        .all()
    )
    # Load all learned powers for this character, grouped by discipline
    learned_powers = (
        db.query(CharacterPower)
        .join(DisciplinePower, CharacterPower.power_id == DisciplinePower.id)
        .options(joinedload(CharacterPower.power))
        .filter(CharacterPower.character_id == char.id)
        .all()
    )
    powers_by_disc: dict[int, list] = {}
    for cp in learned_powers:
        pw = cp.power
        disc_id = pw.discipline_id
        powers_by_disc.setdefault(disc_id, []).append({
            "id": pw.id,
            "name": pw.name,
            "level": pw.level,
            "description": pw.description,
            "system_text": pw.system_text,
        })
    # Sort powers within each discipline by level
    for disc_id in powers_by_disc:
        powers_by_disc[disc_id].sort(key=lambda p: p["level"])

    # Load retainers for this character
    retainer_chars = (
        db.query(Character)
        .options(joinedload(Character.clan))
        .filter(Character.parent_character_id == char.id, Character.is_retainer == True)
        .all()
    )
    retainers_data = [
        {
            "id": r.id,
            "name": r.name,
            "concept": r.concept,
            "health": r.health,
            "health_superficial": r.health_superficial,
            "health_aggravated": r.health_aggravated,
            "willpower": r.willpower,
            "willpower_superficial": r.willpower_superficial,
            "willpower_aggravated": r.willpower_aggravated,
            "blood_potency": r.blood_potency,
            "humanity": r.humanity,
        }
        for r in retainer_chars
    ]

    top3 = [s for s in skills if s.value > 0][:3]
    return GMCharacterCard(
        id=char.id,
        name=char.name,
        concept=char.concept,
        clan_name=char.clan.name if char.clan else None,
        generation=char.generation.value if char.generation else None,
        blood_potency=char.blood_potency,
        humanity=char.humanity,
        current_hunger=char.current_hunger,
        health=char.health,
        health_superficial=char.health_superficial,
        health_aggravated=char.health_aggravated,
        willpower=char.willpower,
        willpower_superficial=char.willpower_superficial,
        willpower_aggravated=char.willpower_aggravated,
        top_skills=[{"name": s.name.replace("_", " "), "value": s.value} for s in top3],
        all_skills=[{"name": s.name.replace("_", " "), "value": s.value} for s in skills],
        attributes=[{"name": a.name, "value": a.value} for a in attrs],
        disciplines=[
            {
                "name": cd.discipline.name,
                "level": cd.level,
                "powers": powers_by_disc.get(cd.discipline_id, []),
            }
            for cd in discs
        ],
        notes=char.notes,
        retainers=retainers_data,
    )


def load_group(group_id: int, gm: User, db: Session) -> Group:
    """Load a group that belongs to the given GM, or raise 404."""
    group = db.query(Group).filter(
        Group.id == group_id, Group.gm_id == gm.id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    return group


def group_to_out(group: Group, db: Session) -> GroupOut:
    """Serialize a Group with its members and character cards.

    If a member has a pinned character_id, only that character is shown in the grid.
    Otherwise all completed characters for that player are shown.
    """
    members_out = []
    for m in group.members:
        if m.character_id:
            # Show only the pinned character
            chars = (
                db.query(Character)
                .options(joinedload(Character.clan))
                .filter(
                    Character.id == m.character_id,
                    Character.status == CharacterStatus.complete,
                )
                .all()
            )
        else:
            # No character pinned — show nothing until GM pins one
            chars = []
        members_out.append(GroupMemberOut(
            user_id=m.user_id,
            username=m.user.username,
            character_id=m.character_id,
            characters=[build_character_card(c, db) for c in chars],
        ))
    return GroupOut(
        id=group.id,
        name=group.name,
        description=group.description,
        gm_id=group.gm_id,
        members=members_out,
    )


# ── Player search (MUST be before /{group_id} to avoid route conflict) ────────

@router.get("/search/players", response_model=list[UserSearchResult])
def search_players(
    q: str = Query("", min_length=0),
    gm: User = Depends(require_gm),
    db: Session = Depends(get_db),
):
    """Search active players by username prefix (for the add-member form).
    Returns each player with their completed characters.
    """
    query = db.query(User).filter(
        User.role == UserRole.player,
        User.is_active == True,
    )
    if q.strip():
        query = query.filter(User.username.ilike(f"%{q.strip()}%"))
    users = query.order_by(User.username).limit(20).all()

    results = []
    for u in users:
        chars = (
            db.query(Character)
            .options(joinedload(Character.clan))
            .filter(
                Character.user_id == u.id,
                Character.status == CharacterStatus.complete,
            )
            .all()
        )
        results.append(UserSearchResult(
            id=u.id,
            username=u.username,
            characters=[
                CharacterSearchSummary(
                    id=c.id,
                    name=c.name,
                    clan_name=c.clan.name if c.clan else None,
                )
                for c in chars
            ],
        ))
    return results


# ── Player: list groups I belong to ──────────────────────────────────────────

@router.get("/mine", response_model=list[GroupSummaryOut])
def list_my_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return groups the current player is a member of."""
    memberships = (
        db.query(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )
    group_ids = [m.group_id for m in memberships]
    if not group_ids:
        return []
    groups = (
        db.query(Group)
        .options(joinedload(Group.members))
        .filter(Group.id.in_(group_ids))
        .all()
    )
    return [
        GroupSummaryOut(
            id=g.id,
            name=g.name,
            description=g.description,
            member_count=len(g.members),
        )
        for g in groups
    ]


# ── Group CRUD ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[GroupSummaryOut])
def list_groups(gm: User = Depends(require_gm), db: Session = Depends(get_db)):
    """List all groups owned by the current GM."""
    groups = (
        db.query(Group)
        .options(joinedload(Group.members))
        .filter(Group.gm_id == gm.id)
        .order_by(Group.created_at.desc())
        .all()
    )
    return [
        GroupSummaryOut(
            id=g.id,
            name=g.name,
            description=g.description,
            member_count=len(g.members),
        )
        for g in groups
    ]


@router.post("", response_model=GroupOut, status_code=201)
def create_group(body: GroupCreate, gm: User = Depends(require_gm), db: Session = Depends(get_db)):
    """Create a new group."""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Group name cannot be empty.")
    group = Group(name=body.name.strip(), description=body.description, gm_id=gm.id)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group_to_out(group, db)


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full group details. GMs must own the group; players must be members."""
    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    is_gm_or_admin = current_user.role in (UserRole.gm, UserRole.admin)
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first() is not None

    if not is_gm_or_admin and not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this group.")

    # GMs can only see their own groups unless admin
    if is_gm_or_admin and current_user.role == UserRole.gm and group.gm_id != current_user.id:
        raise HTTPException(status_code=404, detail="Group not found.")

    return group_to_out(group, db)


@router.put("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: int, body: GroupUpdate,
    gm: User = Depends(require_gm), db: Session = Depends(get_db),
):
    """Rename or update group description."""
    group = load_group(group_id, gm, db)
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=400, detail="Group name cannot be empty.")
        group.name = body.name.strip()
    if body.description is not None:
        group.description = body.description
    db.commit()
    return group_to_out(
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == group_id)
        .first(),
        db,
    )


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, gm: User = Depends(require_gm), db: Session = Depends(get_db)):
    """Delete a group (members are not deleted, just removed from group)."""
    group = load_group(group_id, gm, db)
    db.delete(group)
    db.commit()


# ── Member management ─────────────────────────────────────────────────────────

@router.post("/{group_id}/members", response_model=GroupOut)
def add_member(
    group_id: int, body: AddMemberRequest,
    gm: User = Depends(require_gm), db: Session = Depends(get_db),
):
    """Add a player (and optionally a specific character) to the group."""
    group = load_group(group_id, gm, db)
    player = db.query(User).filter(
        User.username == body.username,
        User.role == UserRole.player,
        User.is_active == True,
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player '{body.username}' not found.")

    already = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == player.id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Player is already in this group.")

    # Validate the character belongs to this player (if provided)
    if body.character_id:
        char = db.query(Character).filter(
            Character.id == body.character_id,
            Character.user_id == player.id,
            Character.status == CharacterStatus.complete,
        ).first()
        if not char:
            raise HTTPException(status_code=400, detail="Character not found or not owned by this player.")

    db.add(GroupMember(group_id=group_id, user_id=player.id, character_id=body.character_id))
    db.commit()
    return group_to_out(
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == group_id)
        .first(),
        db,
    )


@router.patch("/{group_id}/members/{user_id}", response_model=GroupOut)
def pin_member_character(
    group_id: int, user_id: int, body: PatchMemberRequest,
    gm: User = Depends(require_gm), db: Session = Depends(get_db),
):
    """Pin or unpin a specific character for a group member."""
    load_group(group_id, gm, db)
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in group.")

    if body.character_id is not None:
        char = db.query(Character).filter(
            Character.id == body.character_id,
            Character.user_id == user_id,
            Character.status == CharacterStatus.complete,
        ).first()
        if not char:
            raise HTTPException(status_code=400, detail="Character not found or not owned by this player.")

    member.character_id = body.character_id
    db.commit()
    return group_to_out(
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == group_id)
        .first(),
        db,
    )


@router.delete("/{group_id}/members/{user_id}", response_model=GroupOut)
def remove_member(
    group_id: int, user_id: int,
    gm: User = Depends(require_gm), db: Session = Depends(get_db),
):
    """Remove a player from the group."""
    load_group(group_id, gm, db)
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in group.")
    db.delete(member)
    db.commit()
    return group_to_out(
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == group_id)
        .first(),
        db,
    )
