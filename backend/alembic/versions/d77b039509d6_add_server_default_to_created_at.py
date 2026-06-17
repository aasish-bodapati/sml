"""add server default to created_at

Revision ID: d77b039509d6
Revises: 00dbfb7c34e3
Create Date: 2026-06-17 13:10:55.299461

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'd77b039509d6'
down_revision: Union[str, Sequence[str], None] = '00dbfb7c34e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Manually configure the server default for created_at
    op.alter_column(
        'foodlog', 
        'created_at', 
        server_default=sa.text("TIMEZONE('utc', now())")
    )

def downgrade() -> None:
    # Remove the server default if rolling back
    op.alter_column(
        'foodlog', 
        'created_at', 
        server_default=None
    )

