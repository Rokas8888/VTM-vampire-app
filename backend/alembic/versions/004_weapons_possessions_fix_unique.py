"""add weapons and possessions, fix multi-character unique constraint

Revision ID: 004
Revises: 003
Create Date: 2026-04-10
"""
from alembic import op

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Fix: players can have multiple characters, so drop the UNIQUE constraint
    # on characters.user_id (it was accidentally set to UNIQUE).
    op.execute("ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_user_id_key")

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_weapons (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            damage VARCHAR,
            range VARCHAR,
            clips VARCHAR,
            traits VARCHAR,
            notes TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS character_possessions (
            id SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            description TEXT
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS character_possessions")
    op.execute("DROP TABLE IF EXISTS character_weapons")
    op.execute(
        "ALTER TABLE characters ADD CONSTRAINT characters_user_id_key UNIQUE (user_id)"
    )
