"""add humanity_stains to characters

Revision ID: 025
Revises: 024
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('characters', sa.Column('humanity_stains', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('characters', 'humanity_stains')
