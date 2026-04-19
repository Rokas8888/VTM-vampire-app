"""Add rituals table and character_rituals

Revision ID: 022
Revises: 021
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'rituals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('discipline_id', sa.Integer(), sa.ForeignKey('disciplines.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('system_text', sa.Text()),
    )
    op.create_table(
        'character_rituals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('character_id', sa.Integer(), sa.ForeignKey('characters.id'), nullable=False),
        sa.Column('ritual_id', sa.Integer(), sa.ForeignKey('rituals.id'), nullable=False),
    )


def downgrade():
    op.drop_table('character_rituals')
    op.drop_table('rituals')
