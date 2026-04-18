"""create game data tables

Revision ID: 002
Revises: 001
Create Date: 2026-04-10
"""
from alembic import op

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS disciplines (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL UNIQUE,
            description TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS clans (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL UNIQUE,
            description TEXT,
            bane TEXT,
            compulsion TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS clan_disciplines (
            clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
            discipline_id INTEGER NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
            PRIMARY KEY (clan_id, discipline_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS discipline_powers (
            id SERIAL PRIMARY KEY,
            discipline_id INTEGER NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            level INTEGER NOT NULL,
            description TEXT,
            system_text TEXT,
            prerequisite VARCHAR
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS predator_types (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL UNIQUE,
            description TEXT,
            discipline_id INTEGER REFERENCES disciplines(id),
            discipline_level INTEGER DEFAULT 1,
            specialty_skill VARCHAR,
            specialty_name VARCHAR,
            advantages TEXT,
            flaws TEXT,
            humanity_modifier INTEGER DEFAULT 0
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS merits (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            cost INTEGER NOT NULL,
            category VARCHAR,
            description TEXT,
            system_text TEXT,
            prerequisite VARCHAR
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS flaws (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            value INTEGER NOT NULL,
            category VARCHAR,
            description TEXT,
            system_text TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS backgrounds (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL UNIQUE,
            description TEXT,
            system_text TEXT
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS clan_disciplines")
    op.execute("DROP TABLE IF EXISTS discipline_powers")
    op.execute("DROP TABLE IF EXISTS predator_types")
    op.execute("DROP TABLE IF EXISTS merits")
    op.execute("DROP TABLE IF EXISTS flaws")
    op.execute("DROP TABLE IF EXISTS backgrounds")
    op.execute("DROP TABLE IF EXISTS clans")
    op.execute("DROP TABLE IF EXISTS disciplines")
