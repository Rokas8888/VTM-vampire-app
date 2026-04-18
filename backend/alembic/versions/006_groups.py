"""create groups and group_members tables

Revision ID: 006
Revises: 005
Create Date: 2026-04-11
"""
from alembic import op

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS groups (
            id          SERIAL PRIMARY KEY,
            name        VARCHAR NOT NULL,
            description TEXT,
            gm_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS group_members (
            id        SERIAL PRIMARY KEY,
            group_id  INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(group_id, user_id)
        );
    """)


def downgrade():
    op.execute("""
        DROP TABLE IF EXISTS group_members;
        DROP TABLE IF EXISTS groups;
    """)
