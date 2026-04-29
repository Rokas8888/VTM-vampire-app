"""add force_password_reset to users

Revision ID: 024
Revises: 023
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column(
        'force_password_reset', sa.Boolean(), nullable=False, server_default='false'
    ))


def downgrade():
    op.drop_column('users', 'force_password_reset')
