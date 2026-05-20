"""add level column to character_flaws

Revision ID: 031
Revises: 030
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa

revision = '031'
down_revision = '030'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('character_flaws', sa.Column('level', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('character_flaws', 'level')
