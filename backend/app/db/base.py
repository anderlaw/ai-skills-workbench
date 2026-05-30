"""集中导入所有 ORM 模型，供 SQLAlchemy metadata 和 Alembic 识别表结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from app.db.base_class import Base


from app.models.audit_log import AuditLog  # noqa: E402,F401
from app.models.member import Member  # noqa: E402,F401
from app.models.permission_node import PermissionNode  # noqa: E402,F401
from app.models.project import Project  # noqa: E402,F401
from app.models.project_member import ProjectMember  # noqa: E402,F401
from app.models.requirement import Requirement  # noqa: E402,F401
from app.models.role import Role  # noqa: E402,F401
from app.models.role_permission_node import RolePermissionNode  # noqa: E402,F401
from app.models.task import Task  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
from app.models.user_role import UserRole  # noqa: E402,F401
