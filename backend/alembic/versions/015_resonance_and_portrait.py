"""create resonance_log table and add portrait_url to characters

Revision ID: 015
Revises: 014
Create Date: 2026-04-13
"""
from alembic import op

revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS resonance_log (
            id           SERIAL PRIMARY KEY,
            group_id     INTEGER NOT NULL REFERENCES groups(id)     ON DELETE CASCADE,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            npc_name     VARCHAR NOT NULL,
            resonance    VARCHAR NOT NULL,
            potency      VARCHAR NOT NULL,
            notes        TEXT,
            created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_resonance_log_group_id     ON resonance_log(group_id);
        CREATE INDEX IF NOT EXISTS ix_resonance_log_character_id ON resonance_log(character_id);

        ALTER TABLE characters ADD COLUMN IF NOT EXISTS portrait_url VARCHAR;
    """)


def downgrade():
    op.execute("""
        DROP TABLE IF EXISTS resonance_log;
        ALTER TABLE characters DROP COLUMN IF EXISTS portrait_url;
    """)
