"""Add hashed_password to user table

Revision ID: fe4ec898f2de
Revises: c1d2e3f4g5h6
Create Date: 2025-12-22 13:44:12.987461

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe4ec898f2de'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4g5h6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add hashed_password column to user table
    op.add_column('user', sa.Column('hashed_password', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove hashed_password column from user table
    op.drop_column('user', 'hashed_password')
