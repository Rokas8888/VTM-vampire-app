"""add character_id to group_members

Revision ID: 007
Revises: 006
Create Date: 2026-04-11
"""
from alembic import op

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE group_members
        ADD COLUMN IF NOT EXISTS character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL;
    """)


def downgrade():
    op.execute("ALTER TABLE group_members DROP COLUMN IF EXISTS character_id;")
