"""add portrait_url to monsters

Revision ID: 026
Revises: 025
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = '026'
down_revision = '025'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('monsters', sa.Column('portrait_url', sa.String(), nullable=True))


def downgrade():
    op.drop_column('monsters', 'portrait_url')
