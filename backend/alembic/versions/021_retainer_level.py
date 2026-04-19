"""Add retainer_level to characters

Revision ID: 021
Revises: 020
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('characters', sa.Column('retainer_level', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('characters', 'retainer_level')
