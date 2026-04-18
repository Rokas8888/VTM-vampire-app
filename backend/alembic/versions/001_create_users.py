"""create users and refresh_tokens tables

Revision ID: 001
Revises:
Create Date: 2026-04-09
"""
from alembic import op

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('player', 'gm', 'admin');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            hashed_password VARCHAR NOT NULL,
            role userrole NOT NULL DEFAULT 'player',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_users_username UNIQUE (username),
            CONSTRAINT uq_users_email UNIQUE (email)
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id SERIAL PRIMARY KEY,
            token VARCHAR NOT NULL UNIQUE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token ON refresh_tokens (token)")


def downgrade():
    op.execute("DROP TABLE IF EXISTS refresh_tokens")
    op.execute("DROP TABLE IF EXISTS users")
    op.execute("DROP TYPE IF EXISTS userrole")
