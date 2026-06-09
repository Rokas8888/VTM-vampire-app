"""make merit/flaw/background FK nullable + add custom_name (custom advantages)

Revision ID: 033
Revises: 032
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = '033'
down_revision = '032'
branch_labels = None
depends_on = None


def upgrade():
    # character_merits
    op.add_column('character_merits', sa.Column('custom_name', sa.String(), nullable=True))
    op.alter_column('character_merits', 'merit_id', existing_type=sa.Integer(), nullable=True)
    # character_flaws
    op.add_column('character_flaws', sa.Column('custom_name', sa.String(), nullable=True))
    op.alter_column('character_flaws', 'flaw_id', existing_type=sa.Integer(), nullable=True)
    # character_backgrounds
    op.add_column('character_backgrounds', sa.Column('custom_name', sa.String(), nullable=True))
    op.alter_column('character_backgrounds', 'background_id', existing_type=sa.Integer(), nullable=True)


def downgrade():
    op.alter_column('character_backgrounds', 'background_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('character_backgrounds', 'custom_name')
    op.alter_column('character_flaws', 'flaw_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('character_flaws', 'custom_name')
    op.alter_column('character_merits', 'merit_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('character_merits', 'custom_name')
