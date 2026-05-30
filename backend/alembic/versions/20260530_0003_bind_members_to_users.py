"""bind members to user accounts

Revision ID: 20260530_0003
Revises: 20260530_0002
Create Date: 2026-05-30
"""

from alembic import op
import sqlalchemy as sa


revision = "20260530_0003"
down_revision = "20260530_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("members", sa.Column("user_id", sa.BigInteger(), nullable=True))

    # Backfill existing project personnel. Prefer an existing user matched by
    # email, GitHub username, or display name; otherwise create a login account
    # that can be claimed/reset by an admin later.
    op.execute(
        sa.text(
            """
            UPDATE members m
            SET user_id = u.id
            FROM users u
            WHERE m.user_id IS NULL
              AND (
                (m.email IS NOT NULL AND u.email = m.email)
                OR (m.github_username IS NOT NULL AND u.github_username = m.github_username)
                OR u.display_name = m.name
              )
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO users (
                username,
                password,
                display_name,
                status,
                email,
                github_username,
                skill_direction,
                skill_level,
                remark,
                created_at,
                updated_at
            )
            SELECT
                'member_' || m.id,
                'changeme',
                m.name,
                'ACTIVE',
                m.email,
                m.github_username,
                m.skill_direction,
                m.skill_level,
                m.remark,
                now(),
                now()
            FROM members m
            WHERE m.user_id IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM users u WHERE u.username = 'member_' || m.id
              )
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE members m
            SET user_id = u.id
            FROM users u
            WHERE m.user_id IS NULL
              AND u.username = 'member_' || m.id
            """
        )
    )

    op.alter_column("members", "user_id", existing_type=sa.BigInteger(), nullable=False)
    op.create_index("ix_members_user_id", "members", ["user_id"], unique=True)

    op.execute(
        sa.text(
            """
            INSERT INTO project_members (
                project_id,
                member_id,
                role,
                responsibility,
                joined_at,
                left_at,
                status,
                created_at,
                updated_at
            )
            SELECT
                pu.project_id,
                m.id,
                'OTHER',
                pu.responsibility,
                pu.assigned_at,
                pu.removed_at,
                CASE WHEN pu.status = 'ACTIVE' THEN 'ACTIVE' ELSE 'LEFT' END,
                pu.created_at,
                pu.updated_at
            FROM project_users pu
            JOIN members m ON m.user_id = pu.user_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM project_members pm
                WHERE pm.project_id = pu.project_id
                  AND pm.member_id = m.id
            )
            """
        )
    )
    op.drop_table("project_users")


def downgrade() -> None:
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
    op.execute(
        sa.text(
            """
            INSERT INTO project_users (
                project_id,
                user_id,
                responsibility,
                status,
                assigned_at,
                removed_at,
                created_at,
                updated_at
            )
            SELECT
                pm.project_id,
                m.user_id,
                pm.responsibility,
                CASE WHEN pm.status = 'ACTIVE' THEN 'ACTIVE' ELSE 'REMOVED' END,
                pm.joined_at,
                pm.left_at,
                pm.created_at,
                pm.updated_at
            FROM project_members pm
            JOIN members m ON m.id = pm.member_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM project_users pu
                WHERE pu.project_id = pm.project_id
                  AND pu.user_id = m.user_id
            )
            """
        )
    )
    op.drop_index("ix_members_user_id", table_name="members")
    op.drop_column("members", "user_id")
