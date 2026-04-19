from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.game_data import Clan, Discipline, DisciplinePower, PredatorType, Merit, Flaw, Background, Ritual
from app.schemas.game_data import (
    ClanOut, DisciplineOut, DisciplineWithPowersOut, DisciplinePowerOut,
    PredatorTypeOut, MeritOut, FlawOut, BackgroundOut, RitualOut
)

router = APIRouter(prefix="/api/game-data", tags=["game-data"])


@router.get("/clans", response_model=List[ClanOut])
def get_clans(db: Session = Depends(get_db)):
    return db.query(Clan).options(joinedload(Clan.disciplines)).order_by(Clan.name).all()


@router.get("/clans/{clan_id}", response_model=ClanOut)
def get_clan(clan_id: int, db: Session = Depends(get_db)):
    return db.query(Clan).options(joinedload(Clan.disciplines)).filter(Clan.id == clan_id).first()


@router.get("/disciplines", response_model=List[DisciplineOut])
def get_disciplines(db: Session = Depends(get_db)):
    return db.query(Discipline).order_by(Discipline.name).all()


@router.get("/disciplines/{discipline_id}/powers", response_model=DisciplineWithPowersOut)
def get_discipline_powers(discipline_id: int, db: Session = Depends(get_db)):
    return db.query(Discipline).options(joinedload(Discipline.powers)).filter(Discipline.id == discipline_id).first()


@router.get("/predator-types", response_model=List[PredatorTypeOut])
def get_predator_types(db: Session = Depends(get_db)):
    return db.query(PredatorType).options(joinedload(PredatorType.discipline)).order_by(PredatorType.name).all()


@router.get("/merits", response_model=List[MeritOut])
def get_merits(db: Session = Depends(get_db)):
    return db.query(Merit).order_by(Merit.category, Merit.cost, Merit.name).all()


@router.get("/flaws", response_model=List[FlawOut])
def get_flaws(db: Session = Depends(get_db)):
    return db.query(Flaw).order_by(Flaw.category, Flaw.value, Flaw.name).all()


@router.get("/backgrounds", response_model=List[BackgroundOut])
def get_backgrounds(db: Session = Depends(get_db)):
    return db.query(Background).order_by(Background.name).all()


@router.get("/rituals", response_model=List[RitualOut])
def get_rituals(db: Session = Depends(get_db)):
    return db.query(Ritual).options(joinedload(Ritual.discipline)).order_by(Ritual.discipline_id, Ritual.level, Ritual.name).all()
