"""Add retainer support to characters

Revision ID: 020
Revises: 019
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('characters', sa.Column('is_retainer', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('characters', sa.Column('parent_character_id', sa.Integer(), sa.ForeignKey('characters.id'), nullable=True))


def downgrade():
    op.drop_column('characters', 'parent_character_id')
    op.drop_column('characters', 'is_retainer')
