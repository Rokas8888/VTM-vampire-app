"""Add temp_dots to characters

Revision ID: 019
Revises: 018
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('characters', sa.Column('temp_dots', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('characters', 'temp_dots')
