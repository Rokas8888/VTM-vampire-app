"""create scenes table

Revision ID: 023
Revises: 022
Create Date: 2026-04-28
"""
from alembic import op

revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS scenes (
            id         SERIAL PRIMARY KEY,
            group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            name       VARCHAR(100) NOT NULL DEFAULT 'Untitled Scene',
            data       JSONB NOT NULL DEFAULT '[]',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT scenes_group_id_unique UNIQUE (group_id)
        );
        CREATE INDEX IF NOT EXISTS ix_scenes_group_id ON scenes(group_id);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS scenes;")
