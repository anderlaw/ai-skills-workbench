"""初始化管理员、角色、权限树和默认授权数据。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.permission_node import PermissionNode
from app.models.role import Role
from app.models.role_permission_node import RolePermissionNode
from app.models.user import User
from app.models.user_role import UserRole


DEFAULT_PERMISSION_TREE = [
    {"node_type": "DIRECTORY", "name": "工作台", "code": "workspace", "route_path": "", "sort_order": 10, "icon": "LayoutDashboard"},
    {"node_type": "MENU", "name": "Dashboard", "code": "dashboard", "route_path": "dashboard", "parent_code": "workspace", "sort_order": 10, "icon": "BarChart3"},
    {"node_type": "PERMISSION", "name": "Dashboard 查看", "code": "dashboard:view", "parent_code": "dashboard", "sort_order": 10},
    {"node_type": "DIRECTORY", "name": "项目协作", "code": "project-collab", "route_path": "", "sort_order": 20, "icon": "FolderKanban"},
    {"node_type": "MENU", "name": "项目", "code": "project", "route_path": "projects", "parent_code": "project-collab", "sort_order": 10, "icon": "FolderKanban"},
    {"node_type": "PERMISSION", "name": "项目列表", "code": "project:list", "parent_code": "project", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "项目详情", "code": "project:view", "parent_code": "project", "sort_order": 20},
    {"node_type": "PERMISSION", "name": "新增项目", "code": "project:create", "parent_code": "project", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "编辑项目", "code": "project:update", "parent_code": "project", "sort_order": 40, "operation_level": "POST"},
    {"node_type": "MENU", "name": "需求池", "code": "requirement", "route_path": "requirements", "parent_code": "project-collab", "sort_order": 20, "icon": "Lightbulb"},
    {"node_type": "PERMISSION", "name": "需求列表", "code": "requirement:list", "parent_code": "requirement", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "新增需求", "code": "requirement:create", "parent_code": "requirement", "sort_order": 20, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "编辑自己的需求", "code": "requirement:update-own", "parent_code": "requirement", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "删除自己的需求", "code": "requirement:delete-own", "parent_code": "requirement", "sort_order": 40, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "认领需求", "code": "requirement:claim", "parent_code": "requirement", "sort_order": 50, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "管理员编辑需求", "code": "requirement:admin-update", "parent_code": "requirement", "sort_order": 60, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "管理员删除需求", "code": "requirement:admin-delete", "parent_code": "requirement", "sort_order": 70, "operation_level": "POST"},
    {"node_type": "MENU", "name": "任务", "code": "task", "route_path": "tasks", "parent_code": "project-collab", "sort_order": 30, "icon": "ClipboardList"},
    {"node_type": "PERMISSION", "name": "任务列表", "code": "task:list", "parent_code": "task", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "任务详情", "code": "task:view", "parent_code": "task", "sort_order": 20},
    {"node_type": "PERMISSION", "name": "新增任务", "code": "task:create", "parent_code": "task", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "编辑任务", "code": "task:update", "parent_code": "task", "sort_order": 40, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "提交任务", "code": "task:submit", "parent_code": "task", "sort_order": 50, "operation_level": "POST"},
    {"node_type": "MENU", "name": "项目人员", "code": "member", "route_path": "members", "parent_code": "project-collab", "sort_order": 40, "icon": "Users"},
    {"node_type": "PERMISSION", "name": "项目人员列表", "code": "member:list", "parent_code": "member", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "项目人员详情", "code": "member:view", "parent_code": "member", "sort_order": 20},
    {"node_type": "PERMISSION", "name": "新增项目人员", "code": "member:create", "parent_code": "member", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "编辑项目人员", "code": "member:update", "parent_code": "member", "sort_order": 40, "operation_level": "POST"},
    {"node_type": "DIRECTORY", "name": "管理", "code": "admin", "route_path": "admin", "sort_order": 30, "icon": "ShieldCheck"},
    {"node_type": "MENU", "name": "用户管理", "code": "user", "route_path": "users", "parent_code": "admin", "sort_order": 10, "icon": "Users"},
    {"node_type": "PERMISSION", "name": "用户列表", "code": "user:list", "parent_code": "user", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "新增用户", "code": "user:create", "parent_code": "user", "sort_order": 20, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "分配用户角色", "code": "user:assign-roles", "parent_code": "user", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "MENU", "name": "角色管理", "code": "role", "route_path": "roles", "parent_code": "admin", "sort_order": 20, "icon": "ShieldCheck"},
    {"node_type": "PERMISSION", "name": "角色列表", "code": "role:list", "parent_code": "role", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "新增角色", "code": "role:create", "parent_code": "role", "sort_order": 20, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "编辑角色", "code": "role:update", "parent_code": "role", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "删除角色", "code": "role:delete", "parent_code": "role", "sort_order": 40, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "角色授权", "code": "role:update-permissions", "parent_code": "role", "sort_order": 50, "operation_level": "POST"},
    {"node_type": "MENU", "name": "项目分配", "code": "project-assignment", "route_path": "project-assignments", "parent_code": "admin", "sort_order": 30, "icon": "UserPlus"},
    {"node_type": "PERMISSION", "name": "项目分配列表", "code": "project-assignment:list", "parent_code": "project-assignment", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "分配项目用户", "code": "project-assignment:create", "parent_code": "project-assignment", "sort_order": 20, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "移除项目用户", "code": "project-assignment:remove", "parent_code": "project-assignment", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "MENU", "name": "权限配置", "code": "permission-node", "route_path": "permissions", "parent_code": "admin", "sort_order": 40, "icon": "KeyRound"},
    {"node_type": "PERMISSION", "name": "权限树列表", "code": "permission-node:list", "parent_code": "permission-node", "sort_order": 10},
    {"node_type": "PERMISSION", "name": "新增权限节点", "code": "permission-node:create", "parent_code": "permission-node", "sort_order": 20, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "编辑权限节点", "code": "permission-node:update", "parent_code": "permission-node", "sort_order": 30, "operation_level": "POST"},
    {"node_type": "PERMISSION", "name": "删除权限节点", "code": "permission-node:delete", "parent_code": "permission-node", "sort_order": 40, "operation_level": "POST"},
    {"node_type": "MENU", "name": "审计日志", "code": "audit-log", "route_path": "audit-logs", "parent_code": "admin", "sort_order": 50, "icon": "FileClock"},
    {"node_type": "PERMISSION", "name": "审计日志列表", "code": "audit-log:list", "parent_code": "audit-log", "sort_order": 10},
]


CONTRIBUTOR_PERMISSION_CODES = {
    "workspace",
    "dashboard",
    "dashboard:view",
    "project-collab",
    "project",
    "project:list",
    "project:view",
    "requirement",
    "requirement:list",
    "requirement:create",
    "requirement:update-own",
    "requirement:delete-own",
    "requirement:claim",
    "task",
    "task:list",
    "task:view",
    "member",
    "member:list",
    "member:view",
}


def seed_defaults(db: Session) -> None:
    """初始化系统内置角色、管理员账号、权限树和默认授权。

    参数：`db` 表示数据库会话，用于查询和提交业务数据。
    返回：无返回值；重复执行时会更新内置节点而不是重复插入。
    """
    settings = get_settings()
    admin_role = get_or_create_role(db, "ADMIN", "管理员")
    contributor_role = get_or_create_role(db, "CONTRIBUTOR", "贡献者")
    admin_user = db.scalar(select(User).where(User.username == settings.admin_username))
    if admin_user is None:
        admin_user = User(
            username=settings.admin_username,
            password=settings.admin_password,
            display_name=settings.admin_display_name,
            status="ACTIVE",
        )
        db.add(admin_user)
        db.flush()
    elif admin_user.password != settings.admin_password or admin_user.display_name != settings.admin_display_name:
        admin_user.password = settings.admin_password
        admin_user.display_name = settings.admin_display_name
        admin_user.status = "ACTIVE"
    ensure_user_role(db, admin_user.id, admin_role.id)

    code_to_node: dict[str, PermissionNode] = {}
    for item in DEFAULT_PERMISSION_TREE:
        node = db.scalar(select(PermissionNode).where(PermissionNode.code == item["code"]))
        if node is None:
            parent_id = None
            parent_code = item.get("parent_code")
            if parent_code:
                parent_id = code_to_node[parent_code].id
            # 内置权限树使用 code 查找父节点，保持逻辑外键 parent_id 的可重复初始化能力。
            node = PermissionNode(
                parent_id=parent_id,
                node_type=item["node_type"],
                name=item["name"],
                code=item["code"],
                route_path=item.get("route_path"),
                operation_level=item.get("operation_level", "GET"),
                sort_order=item.get("sort_order", 0),
                icon=item.get("icon"),
                status="ACTIVE",
            )
            db.add(node)
            db.flush()
        else:
            parent_code = item.get("parent_code")
            # 已存在节点按内置配置刷新，保证菜单名称、路由和排序随版本升级自动收敛。
            node.parent_id = code_to_node[parent_code].id if parent_code else None
            node.node_type = item["node_type"]
            node.name = item["name"]
            node.route_path = item.get("route_path")
            node.operation_level = item.get("operation_level", "GET")
            node.sort_order = item.get("sort_order", 0)
            node.icon = item.get("icon")
            node.status = "ACTIVE"
        code_to_node[node.code] = node

    all_nodes = list(code_to_node.values())
    for node in all_nodes:
        ensure_role_permission(db, admin_role.id, node.id)
        if node.code in CONTRIBUTOR_PERMISSION_CODES:
            ensure_role_permission(db, contributor_role.id, node.id)

    db.commit()


def get_or_create_role(db: Session, code: str, name: str) -> Role:
    """按 code 查询角色，不存在时创建启用角色。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`code` 表示调用方传入的业务参数；`name` 表示调用方传入的业务参数。
    返回：已存在或新创建的角色 ORM 对象。
    """
    role = db.scalar(select(Role).where(Role.code == code))
    if role is None:
        role = Role(code=code, name=name, status="ACTIVE")
        db.add(role)
        db.flush()
    return role


def ensure_user_role(db: Session, user_id: int, role_id: int) -> None:
    """确保用户拥有指定角色。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`user_id` 表示调用方传入的业务参数；`role_id` 表示调用方传入的业务参数。
    返回：无返回值；关系不存在时新增，多次执行保持幂等。
    """
    exists = db.scalar(select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role_id))
    if exists is None:
        db.add(UserRole(user_id=user_id, role_id=role_id))


def ensure_role_permission(db: Session, role_id: int, permission_node_id: int) -> None:
    """确保角色被授予指定权限节点。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`role_id` 表示调用方传入的业务参数；`permission_node_id` 表示调用方传入的业务参数。
    返回：无返回值；关系不存在时新增，多次执行保持幂等。
    """
    exists = db.scalar(
        select(RolePermissionNode).where(
            RolePermissionNode.role_id == role_id,
            RolePermissionNode.permission_node_id == permission_node_id,
        )
    )
    if exists is None:
        db.add(RolePermissionNode(role_id=role_id, permission_node_id=permission_node_id))
