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
