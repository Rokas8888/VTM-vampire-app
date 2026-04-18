"""add max_level to merits

Revision ID: 017
Revises: 016
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('merits', sa.Column('max_level', sa.Integer(), server_default='1', nullable=False))


def downgrade():
    op.drop_column('merits', 'max_level')
