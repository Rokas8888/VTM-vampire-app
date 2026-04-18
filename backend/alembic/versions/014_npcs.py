"""create npcs table

Revision ID: 014
Revises: 013
Create Date: 2026-04-13
"""
from alembic import op

revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS npcs (
            id           SERIAL PRIMARY KEY,
            group_id     INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            name         VARCHAR NOT NULL,
            clan         VARCHAR,
            status       VARCHAR,
            relationship VARCHAR,
            notes        TEXT,
            created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS ix_npcs_group_id ON npcs(group_id);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS npcs;")
