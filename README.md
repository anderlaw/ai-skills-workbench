# 搭子工坊 MVP

搭子工坊是面向社群成员共同开发项目的轻量级协作工作台。系统基于 `requirement.md`、`docs/2026-05-30-system-design.md`、`docs/2026-05-30-frontend-page-design.md` 和 `docs/2026-05-30-test-cases.md` 实现，包含项目、成员、项目成员关系、任务、审计日志和统计看板。

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind CSS + TanStack Query + React Hook Form + Zod + lucide-react
- 后端：FastAPI + SQLAlchemy + Alembic + Pydantic + PostgreSQL
- 数据库：外部 PostgreSQL，通过 `DATABASE_URL` 配置

## 功能范围

- 登录访问：站内项目、人员、任务、统计看板和操作记录默认需要登录。
- 权限写入：新增、编辑、状态/进度修改、项目用户分配、任务提交等操作按角色和权限树控制。
- 审计日志：记录项目、成员、项目成员关系和任务的关键写操作。
- 统计看板：项目/成员/任务数量、状态分布、最近项目、阻塞任务、待提交任务、最近操作记录。

## 后端启动

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，设置外部 PostgreSQL：

```text
DATABASE_URL=postgresql+psycopg://user:password@host:5432/project_tracker
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
ADMIN_DISPLAY_NAME=项目负责人
AUTH_SECRET=change-me-to-a-long-random-string
```

执行迁移并启动 API：

```bash
cd backend
../.venv/bin/alembic upgrade head
../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

API 文档地址：`http://127.0.0.1:8000/docs`

## 前端启动

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

默认前端地址：`http://127.0.0.1:5173`

## 验证命令

```bash
.venv/bin/python -m pytest backend/tests/test_api_contract.py -q
cd frontend && npm run build
```

## MVP 验收路径

1. 管理员登录。
2. 新增成员。
3. 新增项目。
4. 在项目详情里添加成员。
5. 给项目创建任务并分配负责人。
6. 更新任务进度和状态。
7. 提交 PR 地址和提交说明。
8. 更新项目进度。
9. 查看操作记录。
10. 查看统计看板的数据变化。
