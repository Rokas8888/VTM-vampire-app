"""add weapons, custom_skills, disciplines JSON to monsters

Revision ID: 010
Revises: 009
Create Date: 2026-04-12
"""
from alembic import op

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE monsters
        ADD COLUMN IF NOT EXISTS weapons       JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS custom_skills JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS disciplines   JSONB NOT NULL DEFAULT '[]';
    """)


def downgrade():
    op.execute("""
        ALTER TABLE monsters
        DROP COLUMN IF EXISTS weapons,
        DROP COLUMN IF EXISTS custom_skills,
        DROP COLUMN IF EXISTS disciplines;
    """)
