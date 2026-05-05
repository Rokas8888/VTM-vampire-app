"""add subject and is_ephemeral to messages

Revision ID: 030
Revises: 029
Create Date: 2026-05-01
"""
from alembic import op
import sqlalchemy as sa

revision = '030'
down_revision = '029'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('messages', sa.Column('subject', sa.Text(), nullable=True))
    op.add_column('messages', sa.Column('is_ephemeral', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('messages', 'is_ephemeral')
    op.drop_column('messages', 'subject')
