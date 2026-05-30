"""add auth permissions and requirements

Revision ID: 20260530_0002
Revises: 20260529_0001
Create Date: 2026-05-30
"""

from alembic import op
import sqlalchemy as sa


revision = "20260530_0002"
down_revision = "20260529_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing MVP migration used physical foreign keys. Target-state design uses
    # logical foreign keys only, so drop old physical constraints when present.
    for table_name, constraint_name in (
        ("project_members", "project_members_project_id_fkey"),
        ("project_members", "project_members_member_id_fkey"),
        ("tasks", "tasks_project_id_fkey"),
        ("tasks", "tasks_assignee_id_fkey"),
    ):
        op.execute(sa.text(f'ALTER TABLE "{table_name}" DROP CONSTRAINT IF EXISTS "{constraint_name}"'))

    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(length=120), nullable=False),
        sa.Column("password", sa.String(length=200), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVE"),
        sa.Column("email", sa.String(length=200), nullable=True),
        sa.Column("phone", sa.String(length=80), nullable=True),
        sa.Column("github_username", sa.String(length=120), nullable=True),
        sa.Column("skill_direction", sa.String(length=100), nullable=True),
        sa.Column("skill_level", sa.String(length=40), nullable=True),
        sa.Column("remark", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_display_name", "users", ["display_name"])
    op.create_index("ix_users_status", "users", ["status"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_github_username", "users", ["github_username"])
    op.create_index("ix_users_skill_direction", "users", ["skill_direction"])

    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_roles_code", "roles", ["code"], unique=True)
    op.create_index("ix_roles_status", "roles", ["status"])

    op.create_table(
        "user_roles",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])

    op.create_table(
        "permission_nodes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("parent_id", sa.BigInteger(), nullable=True),
        sa.Column("node_type", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("code", sa.String(length=160), nullable=False),
        sa.Column("route_path", sa.String(length=300), nullable=True),
        sa.Column("operation_level", sa.String(length=20), nullable=False, server_default="GET"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("icon", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_permission_nodes_parent_id", "permission_nodes", ["parent_id"])
    op.create_index("ix_permission_nodes_node_type", "permission_nodes", ["node_type"])
    op.create_index("ix_permission_nodes_code", "permission_nodes", ["code"], unique=True)
    op.create_index("ix_permission_nodes_route_path", "permission_nodes", ["route_path"])
    op.create_index("ix_permission_nodes_operation_level", "permission_nodes", ["operation_level"])
    op.create_index("ix_permission_nodes_sort_order", "permission_nodes", ["sort_order"])
    op.create_index("ix_permission_nodes_status", "permission_nodes", ["status"])

    op.create_table(
        "role_permission_nodes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.Column("permission_node_id", sa.BigInteger(), nullable=False),
        sa.UniqueConstraint("role_id", "permission_node_id", name="uq_role_permission_node"),
    )
    op.create_index("ix_role_permission_nodes_role_id", "role_permission_nodes", ["role_id"])
    op.create_index("ix_role_permission_nodes_permission_node_id", "role_permission_nodes", ["permission_node_id"])

    op.create_table(
        "project_users",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("responsibility", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVE"),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_users_project_user"),
    )
    op.create_index("ix_project_users_project_id", "project_users", ["project_id"])
    op.create_index("ix_project_users_user_id", "project_users", ["user_id"])
    op.create_index("ix_project_users_status", "project_users", ["status"])

    op.create_table(
        "requirements",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="OPEN"),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="MEDIUM"),
        sa.Column("created_by_user_id", sa.BigInteger(), nullable=False),
        sa.Column("claimed_by_user_id", sa.BigInteger(), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("remark", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_requirements_project_id", "requirements", ["project_id"])
    op.create_index("ix_requirements_title", "requirements", ["title"])
    op.create_index("ix_requirements_status", "requirements", ["status"])
    op.create_index("ix_requirements_priority", "requirements", ["priority"])
    op.create_index("ix_requirements_created_by_user_id", "requirements", ["created_by_user_id"])
    op.create_index("ix_requirements_claimed_by_user_id", "requirements", ["claimed_by_user_id"])


def downgrade() -> None:
    op.drop_table("requirements")
    op.drop_table("project_users")
    op.drop_table("role_permission_nodes")
    op.drop_table("permission_nodes")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("users")
