"""create monsters table

Revision ID: 008
Revises: 007
Create Date: 2026-04-12
"""
from alembic import op

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TYPE monstertype AS ENUM ('vampire','ghoul','mortal','beast','spirit','other');
        CREATE TYPE damagetype   AS ENUM ('superficial','aggravated');

        CREATE TABLE IF NOT EXISTS monsters (
            id                   SERIAL PRIMARY KEY,
            group_id             INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            name                 VARCHAR NOT NULL,
            type                 monstertype NOT NULL DEFAULT 'other',

            health               INTEGER NOT NULL DEFAULT 4,
            health_superficial   INTEGER NOT NULL DEFAULT 0,
            health_aggravated    INTEGER NOT NULL DEFAULT 0,

            strength             INTEGER DEFAULT 1,
            dexterity            INTEGER DEFAULT 1,
            stamina              INTEGER DEFAULT 1,
            charisma             INTEGER DEFAULT 1,
            manipulation         INTEGER DEFAULT 1,
            composure            INTEGER DEFAULT 1,
            intelligence         INTEGER DEFAULT 1,
            wits                 INTEGER DEFAULT 1,
            resolve              INTEGER DEFAULT 1,

            attack_pool          INTEGER DEFAULT 0,
            attack_damage_type   damagetype DEFAULT 'superficial',

            special_abilities    TEXT DEFAULT '',
            notes                TEXT DEFAULT '',

            created_at           TIMESTAMPTZ DEFAULT NOW()
        );
    """)


def downgrade():
    op.execute("""
        DROP TABLE IF EXISTS monsters;
        DROP TYPE IF EXISTS damagetype;
        DROP TYPE IF EXISTS monstertype;
    """)
