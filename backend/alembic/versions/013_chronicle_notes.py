"""create chronicle_notes table

Revision ID: 013
Revises: 012
Create Date: 2026-04-13
"""
from alembic import op

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS chronicle_notes (
            id         SERIAL PRIMARY KEY,
            group_id   INTEGER NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
            user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
            note_type  VARCHAR NOT NULL,
            title      VARCHAR,
            content    TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS ix_chronicle_notes_group_id ON chronicle_notes(group_id);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS chronicle_notes;")
