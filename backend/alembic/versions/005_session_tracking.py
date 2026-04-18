"""add session tracking columns (hunger, damage tracks)

Revision ID: 005
Revises: 004
Create Date: 2026-04-11
"""
from alembic import op

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Hunger (0–5), health damage, willpower damage — all default 0
    op.execute("""
        ALTER TABLE characters
        ADD COLUMN IF NOT EXISTS current_hunger      INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS health_superficial  INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS health_aggravated   INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS willpower_superficial INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS willpower_aggravated  INTEGER NOT NULL DEFAULT 0
    """)


def downgrade():
    op.execute("""
        ALTER TABLE characters
        DROP COLUMN IF EXISTS current_hunger,
        DROP COLUMN IF EXISTS health_superficial,
        DROP COLUMN IF EXISTS health_aggravated,
        DROP COLUMN IF EXISTS willpower_superficial,
        DROP COLUMN IF EXISTS willpower_aggravated
    """)
