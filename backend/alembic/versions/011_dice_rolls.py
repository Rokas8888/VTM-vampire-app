"""create dice_rolls table

Revision ID: 011
Revises: 010
Create Date: 2026-04-13
"""
from alembic import op

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS dice_rolls (
            id              SERIAL PRIMARY KEY,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            character_id    INTEGER REFERENCES characters(id) ON DELETE SET NULL,
            pool_size       INTEGER NOT NULL,
            hunger_dice     INTEGER NOT NULL DEFAULT 0,
            total_successes INTEGER NOT NULL,
            crit_pairs      INTEGER NOT NULL DEFAULT 0,
            messy_critical  BOOLEAN NOT NULL DEFAULT FALSE,
            bestial_failure BOOLEAN NOT NULL DEFAULT FALSE,
            outcome         VARCHAR NOT NULL,
            label           VARCHAR,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_dice_rolls_user_id ON dice_rolls(user_id);
        CREATE INDEX IF NOT EXISTS ix_dice_rolls_created_at ON dice_rolls(created_at DESC);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS dice_rolls;")
