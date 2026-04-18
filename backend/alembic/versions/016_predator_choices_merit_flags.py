"""add choices_json to predator_types and requires_custom_text to merits/flaws

Revision ID: 016
Revises: 015
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('predator_types', sa.Column('choices_json', sa.Text(), nullable=True))
    op.add_column('merits', sa.Column('requires_custom_text', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('flaws', sa.Column('requires_custom_text', sa.Boolean(), server_default='false', nullable=False))


def downgrade():
    op.drop_column('predator_types', 'choices_json')
    op.drop_column('merits', 'requires_custom_text')
    op.drop_column('flaws', 'requires_custom_text')
