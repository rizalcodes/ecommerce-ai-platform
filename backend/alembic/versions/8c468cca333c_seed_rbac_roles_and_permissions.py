"""seed rbac roles and permissions

Schema.md Sections 2.2/2.3 state the role and permission lists are fixed for v1
and managed via seed/migration — there is no admin UI to edit them. Keeping them
in a migration makes the RBAC baseline reproducible on any fresh database.

Revision ID: 8c468cca333c
Revises: 4f156904f560
Create Date: 2026-08-12 14:12:41.508122

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c468cca333c'
down_revision: Union[str, None] = '4f156904f560'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ROLES = ("seller", "admin")

PERMISSIONS = (
    "product:create",
    "product:edit",
    "product:delete",
    "category:manage",
    "inquiry:manage",
    "user:manage",
    "analytics:view_platform",
)

# Seller: owns its own catalog and handles its own inquiries.
# Admin: runs the platform — taxonomy, accounts, platform-wide analytics
#        (PRD.md Section 4). Admin is deliberately NOT given product:* here;
#        browsing products needs no permission, and nothing in PRD.md Section 5
#        gives admins write access to a seller's catalog.
ROLE_PERMISSIONS = {
    "seller": (
        "product:create",
        "product:edit",
        "product:delete",
        "inquiry:manage",
    ),
    "admin": (
        "category:manage",
        "user:manage",
        "analytics:view_platform",
    ),
}


def upgrade() -> None:
    bind = op.get_bind()

    # ON CONFLICT keeps this safe to re-run against a database that already has
    # part of the baseline.
    for role in ROLES:
        bind.execute(
            sa.text("INSERT INTO roles (name) VALUES (:name) ON CONFLICT (name) DO NOTHING"),
            {"name": role},
        )

    for permission in PERMISSIONS:
        bind.execute(
            sa.text("INSERT INTO permissions (name) VALUES (:name) ON CONFLICT (name) DO NOTHING"),
            {"name": permission},
        )

    for role, permissions in ROLE_PERMISSIONS.items():
        for permission in permissions:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT r.id, p.id
                    FROM roles r, permissions p
                    WHERE r.name = :role AND p.name = :permission
                    ON CONFLICT DO NOTHING
                    """
                ),
                {"role": role, "permission": permission},
            )


def downgrade() -> None:
    bind = op.get_bind()

    bind.execute(
        sa.text(
            """
            DELETE FROM role_permissions
            WHERE role_id IN (SELECT id FROM roles WHERE name = ANY(:roles))
            """
        ),
        {"roles": list(ROLES)},
    )
    bind.execute(
        sa.text("DELETE FROM permissions WHERE name = ANY(:names)"),
        {"names": list(PERMISSIONS)},
    )
    bind.execute(
        sa.text("DELETE FROM roles WHERE name = ANY(:names)"),
        {"names": list(ROLES)},
    )
