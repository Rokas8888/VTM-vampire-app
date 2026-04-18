"""create character tables

Revision ID: 003
Revises: 002
Create Date: 2026-04-10
"""
from alembic import op

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE characterstatus AS ENUM ('draft', 'complete');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE generation AS ENUM ('childer', 'neonate', 'ancillae');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS characters (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            status characterstatus NOT NULL DEFAULT 'draft',
            name VARCHAR,
            concept VARCHAR,
            ambition VARCHAR,
            desire VARCHAR,
            clan_id INTEGER REFERENCES clans(id),
            predator_type_id INTEGER REFERENCES predator_types(id),
            humanity INTEGER DEFAULT 7,
            generation generation,
            blood_potency INTEGER DEFAULT 0,
            health INTEGER DEFAULT 0,
            willpower INTEGER DEFAULT 0,
            total_xp INTEGER DEFAULT 0,
            spent_xp INTEGER DEFAULT 0,
            biography TEXT,
            notes TEXT,
            haven_location VARCHAR,
            haven_description TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_attributes (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            value INTEGER DEFAULT 1
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_skills (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            value INTEGER DEFAULT 0
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_specialties (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            skill_name VARCHAR NOT NULL,
            specialty_name VARCHAR NOT NULL
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_disciplines (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            discipline_id INTEGER NOT NULL REFERENCES disciplines(id),
            level INTEGER DEFAULT 1
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_powers (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            power_id INTEGER NOT NULL REFERENCES discipline_powers(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_merits (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            merit_id INTEGER NOT NULL REFERENCES merits(id),
            level INTEGER DEFAULT 1,
            notes VARCHAR
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_backgrounds (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            background_id INTEGER NOT NULL REFERENCES backgrounds(id),
            level INTEGER DEFAULT 1,
            notes VARCHAR
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_flaws (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            flaw_id INTEGER NOT NULL REFERENCES flaws(id),
            notes VARCHAR
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_convictions (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            conviction VARCHAR NOT NULL,
            touchstone VARCHAR NOT NULL
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_tenets (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            tenet VARCHAR NOT NULL
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS wizard_drafts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            current_step INTEGER DEFAULT 1,
            data JSONB DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS wizard_drafts")
    op.execute("DROP TABLE IF EXISTS character_tenets")
    op.execute("DROP TABLE IF EXISTS character_convictions")
    op.execute("DROP TABLE IF EXISTS character_flaws")
    op.execute("DROP TABLE IF EXISTS character_backgrounds")
    op.execute("DROP TABLE IF EXISTS character_merits")
    op.execute("DROP TABLE IF EXISTS character_powers")
    op.execute("DROP TABLE IF EXISTS character_disciplines")
    op.execute("DROP TABLE IF EXISTS character_specialties")
    op.execute("DROP TABLE IF EXISTS character_skills")
    op.execute("DROP TABLE IF EXISTS character_attributes")
    op.execute("DROP TABLE IF EXISTS characters")
    op.execute("DROP TYPE IF EXISTS generation")
    op.execute("DROP TYPE IF EXISTS characterstatus")
