"""add grants_json to predator_types for auto-applied merits/flaws

Revision ID: 018
Revises: 017
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('predator_types', sa.Column('grants_json', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('predator_types', 'grants_json')
