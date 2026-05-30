"""汇总并挂载所有 v1 API 路由，定义后端接口入口。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from fastapi import APIRouter

from app.api.routes import audit_logs, auth, dashboard, members, permission_nodes, projects, requirements, roles, tasks, users


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(roles.router)
api_router.include_router(permission_nodes.router)
api_router.include_router(projects.router)
api_router.include_router(requirements.router)
api_router.include_router(members.router)
api_router.include_router(tasks.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit_logs.router)
