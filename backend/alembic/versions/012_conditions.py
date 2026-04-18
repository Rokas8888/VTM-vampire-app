"""create conditions table

Revision ID: 012
Revises: 011
Create Date: 2026-04-13
"""
from alembic import op

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS conditions (
            id           SERIAL PRIMARY KEY,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            name         VARCHAR NOT NULL,
            severity     VARCHAR NOT NULL DEFAULT 'moderate',
            notes        VARCHAR,
            created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
            cleared      BOOLEAN NOT NULL DEFAULT FALSE,
            cleared_at   TIMESTAMPTZ,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_conditions_character_id ON conditions(character_id);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS conditions;")
