"""add learning_dots column to characters

Revision ID: 032
Revises: 031
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '032'
down_revision = '031'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('characters', sa.Column('learning_dots', postgresql.JSON(), nullable=True))


def downgrade():
    op.drop_column('characters', 'learning_dots')
