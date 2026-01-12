"""Add tax fields to activity

Revision ID: e5f6a7b8c9d0
Revises: d2c325e1d2b4
Create Date: 2025-12-23 13:42:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd2c325e1d2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tax fields to activity table."""
    op.add_column('activity', sa.Column('withholding_tax', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('activity', sa.Column('capital_gains_tax', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('activity', sa.Column('securities_transaction_tax', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('activity', sa.Column('stamp_duty', sa.Float(), nullable=True, server_default='0.0'))


def downgrade() -> None:
    """Remove tax fields from activity table."""
    op.drop_column('activity', 'stamp_duty')
    op.drop_column('activity', 'securities_transaction_tax')
    op.drop_column('activity', 'capital_gains_tax')
    op.drop_column('activity', 'withholding_tax')
