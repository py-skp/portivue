"""Add composite indexes for performance

Revision ID: c1d2e3f4g5h6
Revises: b62346732591
Create Date: 2025-12-22 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4g5h6'
down_revision: Union[str, Sequence[str], None] = 'b62346732591'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add composite indexes for improved query performance."""
    
    # Activity table indexes
    op.create_index(
        'ix_activity_owner_date',
        'activity',
        ['owner_user_id', 'date'],
        unique=False
    )
    op.create_index(
        'ix_activity_owner_account',
        'activity',
        ['owner_user_id', 'account_id'],
        unique=False
    )
    op.create_index(
        'ix_activity_owner_instrument',
        'activity',
        ['owner_user_id', 'instrument_id'],
        unique=False
    )
    
    # Account table index
    op.create_index(
        'ix_account_owner_type',
        'account',
        ['owner_user_id', 'type'],
        unique=False
    )
    
    # Instrument table indexes
    op.create_index(
        'ix_instrument_owner_source',
        'instrument',
        ['owner_user_id', 'data_source'],
        unique=False
    )
    op.create_index(
        'ix_instrument_symbol_source',
        'instrument',
        ['symbol', 'data_source'],
        unique=False
    )


def downgrade() -> None:
    """Remove composite indexes."""
    
    # Drop instrument indexes
    op.drop_index('ix_instrument_symbol_source', table_name='instrument')
    op.drop_index('ix_instrument_owner_source', table_name='instrument')
    
    # Drop account index
    op.drop_index('ix_account_owner_type', table_name='account')
    
    # Drop activity indexes
    op.drop_index('ix_activity_owner_instrument', table_name='activity')
    op.drop_index('ix_activity_owner_account', table_name='activity')
    op.drop_index('ix_activity_owner_date', table_name='activity')
