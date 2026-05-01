"""add expires_at to messages

Revision ID: 028
Revises: 027
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = '028'
down_revision = '027'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('messages', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('messages', 'expires_at')
