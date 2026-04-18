"""add willpower and hunger to monsters

Revision ID: 009
Revises: 008
Create Date: 2026-04-12
"""
from alembic import op

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE monsters
        ADD COLUMN IF NOT EXISTS willpower            INTEGER NOT NULL DEFAULT 3,
        ADD COLUMN IF NOT EXISTS willpower_superficial INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS willpower_aggravated  INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_hunger        INTEGER NOT NULL DEFAULT 0;
    """)


def downgrade():
    op.execute("""
        ALTER TABLE monsters
        DROP COLUMN IF EXISTS willpower,
        DROP COLUMN IF EXISTS willpower_superficial,
        DROP COLUMN IF EXISTS willpower_aggravated,
        DROP COLUMN IF EXISTS current_hunger;
    """)
