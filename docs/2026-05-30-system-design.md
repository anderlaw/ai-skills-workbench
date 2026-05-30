# 项目进度跟踪系统设计文档

日期：2026-05-30

## 1. 文档目的

本文档描述项目进度跟踪系统的目标态设计，覆盖业务模块、角色权限、前端结构、后端接口、数据模型和每张表的字段业务含义。

本文档以“登录后使用的项目协作工作台”为目标形态，而不是当前公开只读 MVP 的原始形态。

## 2. 系统定位

系统用于跟踪项目、人员、任务、需求池和项目动态。系统面向两类用户：

- `ADMIN`：系统管理员，拥有全部权限。
- `CONTRIBUTOR`：项目贡献者，可查看全站信息，在被分配项目后可以参与该项目的需求池。

系统核心价值：

- 统一查看所有项目进度、任务状态、人员信息和动态。
- 管理项目成员分配。
- 收集项目需求和 idea。
- 支持贡献者认领需求。
- 通过权限树统一控制菜单、按钮和接口权限。

## 3. 业务模块

### 3.1 登录认证

用户通过 `/login` 登录。登录成功后后端签发 token，前端后续请求携带 `Authorization: Bearer <token>`。

token 中包含：

- 用户 ID
- 用户名
- 显示名

token 不包含用户状态。每次校验 token 后，后端都需要查询 `users` 表核对用户当前状态，只有 `ACTIVE` 用户可以继续访问系统。

未登录用户不能访问系统内部页面。

### 3.2 用户与角色

用户是系统登录主体。用户和角色通过关联表绑定，支持一个用户拥有多个角色。

MVP 默认角色：

- `ADMIN`
- `CONTRIBUTOR`

角色不是写死在前端，而是通过角色表、用户角色关联表和权限树控制菜单、按钮、接口权限。默认内置两个角色，后续可扩展新角色。

### 3.3 权限树

权限树统一管理三类节点：

- 目录：用于菜单分组。
- 菜单：对应前端页面。
- 权限项：对应按钮、操作和接口。

角色被授予菜单和权限项。用户通过角色获得权限。

权限树是后续菜单权限、按钮权限、接口权限的一致来源。

### 3.4 项目管理

项目记录项目基础信息、技术栈、状态、进度、风险、下一步计划和关键链接。

`ADMIN` 可以创建、编辑、归档项目。

`CONTRIBUTOR` 可以查看所有项目，但不能编辑项目进度，也不能编辑项目基础信息。

### 3.5 项目分配

项目分配用于表示某个用户被安排到某个项目。

被分配项目后，`CONTRIBUTOR` 只获得该项目需求池的贡献权限，不获得项目进度或任务编辑权限。

### 3.6 需求池

需求池用于收集项目 idea、需求建议和待实现事项。

规则：

- `ADMIN` 可以管理所有需求。
- `ADMIN` 可以强制修改、删除已认领需求。
- 被分配到项目的 `CONTRIBUTOR` 可以新增需求。
- 需求创建人可以编辑、删除自己创建且未被认领的需求。
- 被认领后的需求对普通用户锁定，不能修改、不能删除。
- 被分配到项目的 `CONTRIBUTOR` 可以认领未被认领的需求。

### 3.7 任务管理

任务用于跟踪开发事项、负责人、状态、优先级、进度、Issue、PR 和提交说明。

`ADMIN` 可以管理任务。

`CONTRIBUTOR` 可以查看任务，但不能创建、编辑、删除任务，即使被分配到对应项目也不能编辑任务。

### 3.8 Dashboard

Dashboard 是工作动态入口，不再是纯统计图表页面。

展示内容：

- 项目卡片
- 人员卡片
- 任务卡片
- 阻塞任务卡片
- 最近更新的项目动态
- 人员更新动态

不展示：

- 平均进度
- 最近操作记录表格

### 3.9 审计日志

系统记录关键写操作，包括用户创建、项目更新、项目分配、需求创建、需求认领、需求修改、任务提交等。

审计日志主要供 `ADMIN` 排查和追溯使用。

## 4. 前端信息架构

### 4.1 登录层

- `/login`

未登录用户只能访问登录页。

### 4.2 工作区层

所有登录用户可访问，具体菜单展示由权限树决定。

- `/dashboard`
- `/projects`
- `/projects/:id`
- `/tasks`
- `/members` 或 `/users`

### 4.3 管理层

默认仅 `ADMIN` 可访问。

- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/project-assignments`
- `/audit-logs`

### 4.4 项目详情页结构

`/projects/:id` 建议做成 tab 工作台：

- 概览
- 成员与权限
- 任务
- 需求池
- 动态记录

## 5. 后端设计原则

### 5.1 认证

所有站内接口默认需要登录。

公共接口仅保留：

- `POST /api/v1/auth/login`

### 5.2 授权

前端隐藏按钮只是体验优化。后端必须执行最终权限校验。

建议统一依赖：

- `require_user`
- `require_admin`
- `require_menu_permission(menu_scope, code, operation_level)`
- `require_project_assignment(project_id)`

`require_user` 校验流程：

1. 校验 token 签名和有效期。
2. 从 token 中读取用户 ID。
3. 查询 `users` 表。
4. 确认用户存在且 `status=ACTIVE`。
5. 聚合用户关联角色和权限。

#### 5.2.1 项目数据范围与资源归属授权

需求池相关写操作不能只校验权限 code，也不能只依赖前端是否隐藏按钮。后端需要统一执行三层校验：

1. 功能权限：当前用户的角色是否拥有目标菜单 scope 下的全局唯一权限 code，例如在 `requirement` scope 下拥有 `requirement:create`。
2. 项目数据范围：当前用户是否存在有效 `project_users` 记录，且 `project_users.status=ACTIVE`。
3. 资源归属与状态：编辑、删除需求时校验需求创建人、认领状态和需求状态。

通用判断公式：

`功能权限 + 项目分配 + 资源归属/状态 = 允许操作`

`ADMIN` 拥有全部权限，可以绕过项目分配和资源归属限制，但仍需要登录且用户状态为 `ACTIVE`。

需求新增校验流程：

1. 执行 `require_user`。
2. 如果当前用户是 `ADMIN`，直接放行。
3. 校验 `requirement` scope 下的 `requirement:create` 权限。
4. 校验 `project_users(project_id, current_user.id, ACTIVE)` 是否存在。
5. 通过后允许创建需求。

需求编辑校验流程：

1. 执行 `require_user` 并查询目标需求。
2. 如果当前用户是 `ADMIN`，直接放行。
3. 校验 `requirement` scope 下的 `requirement:update-own` 权限。
4. 校验当前用户是否被分配到 `requirement.project_id`。
5. 校验 `requirement.created_by_user_id == current_user.id`。
6. 校验需求未被认领且 `requirement.status=OPEN`。

需求删除校验流程与编辑一致。普通用户只能删除自己创建、未被认领、状态仍为 `OPEN` 的需求。

需求认领校验流程：

1. 执行 `require_user` 并查询目标需求。
2. 如果当前用户是 `ADMIN`，按管理员规则放行。
3. 校验 `requirement` scope 下的 `requirement:claim` 权限。
4. 校验当前用户是否被分配到 `requirement.project_id`。
5. 校验 `claimed_by_user_id` 为空且 `requirement.status=OPEN`。

### 5.3 操作级别

权限项支持三种操作级别：

- `GET`：只读类接口。
- `POST`：写入类接口，包含 `POST`、`PUT`、`PATCH`、`DELETE`。
- `BOTH`：同时允许只读和写入。

### 5.4 命名规范

数据库字段使用 snake_case。

API 返回给前端使用 camelCase。

主键统一使用 `BIGSERIAL` 或等价自增大整数。

时间字段统一使用带时区时间。

外键统一使用逻辑外键，不创建数据库物理外键约束。表结构文档中的“逻辑外键”表示业务关联字段，应用层负责关联校验、删除保护和数据一致性。

## 6. 核心接口设计

### 6.1 认证接口

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

`/auth/me` 返回当前用户信息、角色列表、可见菜单树和按菜单作用域分组的权限 code。后端处理该接口时需要查询 `users.status`，不能只信 token。

建议响应结构：

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "displayName": "超级管理员",
    "status": "ACTIVE"
  },
  "roles": [
    { "id": 1, "code": "ADMIN", "name": "管理员" }
  ],
  "menuTree": [],
  "permissionScopes": {
    "project": ["project:list", "project:create"],
    "requirement": ["requirement:list", "requirement:create"]
  }
}
```

`menuTree` 只返回当前用户可见的 `DIRECTORY` 和 `MENU` 节点，以及必要的权限子节点。`permissionScopes` 的 key 使用菜单 scope，value 使用全局唯一权限 code。

### 6.2 用户接口

- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/{id}`
- `PUT /api/v1/users/{id}`
- `PATCH /api/v1/users/{id}/status`

### 6.3 角色接口

- `GET /api/v1/roles`
- `POST /api/v1/roles`
- `GET /api/v1/roles/{id}`
- `PUT /api/v1/roles/{id}`
- `PATCH /api/v1/roles/{id}/status`

### 6.4 权限树接口

- `GET /api/v1/permission-nodes`
- `POST /api/v1/permission-nodes`
- `PUT /api/v1/permission-nodes/{id}`
- `DELETE /api/v1/permission-nodes/{id}`

### 6.5 角色授权接口

- `GET /api/v1/roles/{id}/permission-nodes`
- `PUT /api/v1/roles/{id}/permission-nodes`

### 6.6 项目接口

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/{id}`
- `PUT /api/v1/projects/{id}`
- `PATCH /api/v1/projects/{id}/status`
- `PATCH /api/v1/projects/{id}/progress`

### 6.7 项目分配接口

- `GET /api/v1/projects/{id}/users`
- `POST /api/v1/projects/{id}/users`
- `DELETE /api/v1/projects/{id}/users/{userId}`

### 6.8 需求池接口

- `GET /api/v1/projects/{id}/requirements`
- `POST /api/v1/projects/{id}/requirements`
- `PUT /api/v1/requirements/{id}`
- `DELETE /api/v1/requirements/{id}`
- `POST /api/v1/requirements/{id}/claim`

### 6.9 任务接口

- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/{id}`
- `PUT /api/v1/tasks/{id}`
- `PATCH /api/v1/tasks/{id}/status`
- `PATCH /api/v1/tasks/{id}/progress`
- `POST /api/v1/tasks/{id}/submit`

### 6.10 Dashboard 接口

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/project-activities`
- `GET /api/v1/dashboard/member-activities`

### 6.11 审计日志接口

- `GET /api/v1/audit-logs`

## 7. 数据库总体设计

目标态核心表：

- `users`
- `roles`
- `user_roles`
- `permission_nodes`
- `role_permission_nodes`
- `projects`
- `project_users`
- `requirements`
- `tasks`
- `audit_logs`

兼容迁移表：

- `members`
- `project_members`

说明：

- 当前 MVP 已存在 `members` 和 `project_members`。
- 目标态建议用 `users` 替代登录用户和人员档案。
- `project_users` 替代 `project_members` 作为项目分配关系。
- 如果需要保留非登录成员，可继续保留 `members`；否则迁移后可逐步废弃。

## 8. 表结构详细设计

### 8.1 `users` 用户表

表作用：保存可登录系统的用户账号，也是目标态的人员主体。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 用户唯一 ID。用于关联角色、项目分配、需求创建人、需求认领人、任务负责人。 |
| `username` | VARCHAR(120) | 是 | 唯一索引 | 登录账号。系统内唯一，不建议修改。 |
| `password` | VARCHAR(200) | 是 | 无 | 登录密码。当前按 MVP 要求明文存储，后续建议改为哈希。 |
| `display_name` | VARCHAR(120) | 是 | 普通索引 | 用户展示名，用于页面、审计日志、动态记录。 |
| `status` | VARCHAR(40) | 是 | 普通索引 | 用户状态。`ACTIVE` 可登录，`DISABLED` 不允许登录或继续操作。 |
| `email` | VARCHAR(200) | 否 | 普通索引 | 邮箱，作为联系方式或后续通知渠道。 |
| `phone` | VARCHAR(50) | 否 | 无 | 手机或其他联系电话。 |
| `github_username` | VARCHAR(120) | 否 | 普通索引 | GitHub 用户名，用于关联开发身份。 |
| `skill_direction` | VARCHAR(100) | 否 | 普通索引 | 技术方向，例如前端、后端、AI、测试、部署。 |
| `skill_level` | VARCHAR(40) | 否 | 无 | 技术水平，例如初级、中级、高级。 |
| `remark` | TEXT | 否 | 无 | 用户备注，记录协作偏好、背景说明等。 |
| `last_login_at` | TIMESTAMPTZ | 否 | 无 | 最近一次登录时间。 |
| `created_at` | TIMESTAMPTZ | 是 | 普通索引 | 用户创建时间。用于人员更新动态。 |
| `updated_at` | TIMESTAMPTZ | 是 | 无 | 用户资料更新时间。 |

核心逻辑关系：

- `user_roles.user_id -> users.id`
- `project_users.user_id -> users.id`
- `requirements.created_by_user_id -> users.id`
- `requirements.claimed_by_user_id -> users.id`
- `tasks.assignee_user_id -> users.id`

### 8.2 `roles` 角色表

表作用：定义系统角色。角色承载菜单权限和操作权限。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 角色唯一 ID。 |
| `code` | VARCHAR(80) | 是 | 唯一索引 | 角色编码，例如 `ADMIN`、`CONTRIBUTOR`。用于程序判断和初始化。 |
| `name` | VARCHAR(120) | 是 | 无 | 角色名称，例如“管理员”“贡献者”。 |
| `description` | TEXT | 否 | 无 | 角色说明。 |
| `status` | VARCHAR(40) | 是 | 普通索引 | 角色状态。`ACTIVE` 可用，`DISABLED` 停用。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 无 | 更新时间。 |

核心逻辑关系：

- `user_roles.role_id -> roles.id`
- `role_permission_nodes.role_id -> roles.id`

### 8.3 `user_roles` 用户角色关联表

表作用：定义用户拥有哪些角色。一个用户可以拥有多个角色，一个角色可以分配给多个用户。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 用户角色关联记录 ID。 |
| `user_id` | BIGINT | 是 | 逻辑外键、联合唯一 | 用户 ID，逻辑关联 `users.id`。 |
| `role_id` | BIGINT | 是 | 逻辑外键、联合唯一 | 角色 ID，逻辑关联 `roles.id`。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 角色授予时间。 |

唯一约束：

- `user_id + role_id` 唯一，避免同一个用户重复拥有同一个角色。

业务规则：

- 用户有效权限是其所有 `ACTIVE` 角色权限的并集。
- 登录和接口鉴权时需要查询该表获取用户角色。
- MVP 默认每个用户至少拥有一个角色，但数据模型支持多角色。

### 8.4 `permission_nodes` 权限树节点表

表作用：统一存储目录、菜单、权限项。前端菜单、按钮展示和后端接口校验都基于该表。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 权限节点唯一 ID。 |
| `parent_id` | BIGINT | 否 | 逻辑自关联 | 父节点 ID，逻辑关联 `permission_nodes.id`。根目录为空。 |
| `node_type` | VARCHAR(40) | 是 | 普通索引 | 节点类型：`DIRECTORY`、`MENU`、`PERMISSION`。 |
| `name` | VARCHAR(120) | 是 | 无 | 节点展示名，例如“项目协作”“项目列表”“新增需求”。 |
| `code` | VARCHAR(160) | 是 | 唯一索引 | 全局唯一节点编码。目录和菜单可使用业务编码，例如 `business-admin`、`project`；权限项建议使用带业务前缀的唯一编码，例如 `project:list`、`project:create`、`requirement:create`。 |
| `route_path` | VARCHAR(300) | 否 | 普通索引 | 目录和菜单使用的路由片段。权限项为空。目录示例 `business-admin`，菜单示例 `project`，最终页面路由由祖先目录和菜单拼接为 `/business-admin/project`。 |
| `operation_level` | VARCHAR(20) | 是 | 普通索引 | 操作级别：`GET`、`POST`、`BOTH`。 |
| `sort_order` | INTEGER | 是 | 普通索引 | 同级节点排序值，越小越靠前。 |
| `icon` | VARCHAR(80) | 否 | 无 | 前端菜单图标名称，例如 `FolderKanban`。 |
| `status` | VARCHAR(40) | 是 | 普通索引 | 节点状态。`ACTIVE` 可用，`DISABLED` 停用。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 无 | 更新时间。 |

结构规则：

- `DIRECTORY` 下可以放 `DIRECTORY` 或 `MENU`。
- `MENU` 下只能放 `PERMISSION`。
- `PERMISSION` 下不能放子节点。
- `DIRECTORY.route_path` 表示路由分组片段，可以为空；如果有值，会参与子菜单路由拼接。
- `MENU.route_path` 表示页面路由片段，必须有值。
- `PERMISSION.route_path` 为空，因为权限项不直接对应页面。
- 路由拼接时按目录层级从上到下拼接，最后拼接菜单片段。例如目录 `business-admin` 下的菜单 `project` 最终路由为 `/business-admin/project`。
- 权限项的有效 scope 是最近的祖先 `MENU`。scope 用于前端按页面取权限集合，例如 `useMenuPerm("project")`。
- scope 不影响 code 唯一性。`permission_nodes.code` 必须全局唯一，新建和编辑权限节点时需要先查询重复 code，数据库唯一索引作为最终保护。
- 前端在页面内按 scope 获取权限集合后，仍判断全局唯一 code，例如 `useMenuPerm("project").has("project:create")`。
- 菜单节点的 `code` 同时作为默认 route key 和 scope，例如 `project`。前端 `routeRegistry` 使用该 code 映射页面组件。

### 8.5 `role_permission_nodes` 角色权限关联表

表作用：定义角色拥有哪些目录、菜单和权限项。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 关联记录唯一 ID。 |
| `role_id` | BIGINT | 是 | 逻辑外键、联合唯一 | 角色 ID，逻辑关联 `roles.id`。 |
| `permission_node_id` | BIGINT | 是 | 逻辑外键、联合唯一 | 权限树节点 ID，逻辑关联 `permission_nodes.id`。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 授权时间。 |

唯一约束：

- `role_id + permission_node_id` 唯一，避免重复授权。

业务规则：

- 角色拥有菜单节点时，前端可显示该菜单。
- 角色拥有权限项时，前端可显示对应按钮，后端允许对应接口。
- `ADMIN` 初始化时默认拥有所有权限节点。

### 8.6 `projects` 项目表

表作用：保存项目基础信息、进度、状态、风险和交付信息。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 项目唯一 ID。 |
| `name` | VARCHAR(200) | 是 | 普通索引 | 项目名称。列表、详情和动态中展示。 |
| `description` | TEXT | 否 | 无 | 项目简介，说明项目目标和背景。 |
| `project_type` | VARCHAR(100) | 否 | 普通索引 | 项目类型，例如 AI 应用、全栈项目、工具项目。 |
| `tech_stack` | JSONB | 是 | 默认 `[]` | 技术栈数组，例如 `["React", "FastAPI"]`。 |
| `feature_points` | TEXT | 否 | 无 | 功能要点，记录项目核心功能。 |
| `github_url` | VARCHAR(500) | 否 | 无 | 项目代码仓库地址。 |
| `deploy_url` | VARCHAR(500) | 否 | 无 | 项目部署访问地址。 |
| `status` | VARCHAR(40) | 是 | 普通索引 | 项目状态：`PLANNING`、`DEVELOPING`、`TESTING`、`DEPLOYED`、`DONE`、`PAUSED`、`ARCHIVED`。 |
| `progress` | INTEGER | 是 | 无 | 项目进度百分比，范围 0 到 100。只有 `ADMIN` 可修改。 |
| `current_progress` | TEXT | 否 | 无 | 当前进展说明。 |
| `current_issues` | TEXT | 否 | 无 | 当前问题和风险。 |
| `next_steps` | TEXT | 否 | 无 | 下一步计划。 |
| `start_date` | DATE | 否 | 无 | 项目开始日期。 |
| `expected_finish_date` | DATE | 否 | 无 | 预计完成日期。 |
| `actual_finish_date` | DATE | 否 | 无 | 实际完成日期。 |
| `remark` | TEXT | 否 | 无 | 项目备注。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 普通索引 | 更新时间，用于最近更新项目排序。 |

核心逻辑关系：

- `project_users.project_id -> projects.id`
- `requirements.project_id -> projects.id`
- `tasks.project_id -> projects.id`

### 8.7 `project_users` 项目用户分配表

表作用：表示用户被分配到项目。该关系只授予需求池贡献权限，不授予项目进度或任务编辑权限。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 项目分配记录 ID。 |
| `project_id` | BIGINT | 是 | 逻辑外键、联合唯一 | 项目 ID，逻辑关联 `projects.id`。 |
| `user_id` | BIGINT | 是 | 逻辑外键、联合唯一 | 用户 ID，逻辑关联 `users.id`。 |
| `responsibility` | TEXT | 否 | 无 | 用户在项目中的责任说明。 |
| `status` | VARCHAR(40) | 是 | 普通索引 | 分配状态：`ACTIVE`、`REMOVED`。 |
| `assigned_at` | TIMESTAMPTZ | 否 | 无 | 分配时间。 |
| `removed_at` | TIMESTAMPTZ | 否 | 无 | 移除时间。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 无 | 更新时间。 |

唯一约束：

- `project_id + user_id` 唯一，避免同一个用户重复分配到同一个项目。

业务规则：

- `ADMIN` 可新增和移除分配。
- `project_users` 只表示项目数据范围，不表示菜单权限、按钮权限或管理员权限。
- `CONTRIBUTOR` 被分配后，可以在该项目需求池中新增、认领需求，前提是角色同时拥有对应权限 code。
- `CONTRIBUTOR` 编辑、删除需求时，除了项目分配，还必须满足资源归属和需求状态限制。
- `CONTRIBUTOR` 被分配后，仍不能修改项目进度和任务。

### 8.8 `requirements` 需求池表

表作用：保存项目需求、idea 和可认领事项。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 需求唯一 ID。 |
| `project_id` | BIGINT | 是 | 逻辑外键、普通索引 | 所属项目 ID，逻辑关联 `projects.id`。 |
| `title` | VARCHAR(200) | 是 | 普通索引 | 需求标题。 |
| `description` | TEXT | 否 | 无 | 需求详细说明。 |
| `status` | VARCHAR(40) | 是 | 普通索引 | 需求状态：`OPEN`、`CLAIMED`、`DONE`、`CANCELLED`。 |
| `priority` | VARCHAR(20) | 是 | 普通索引 | 优先级：`LOW`、`MEDIUM`、`HIGH`。 |
| `created_by_user_id` | BIGINT | 是 | 逻辑外键、普通索引 | 需求创建人，逻辑关联 `users.id`。用于判断普通用户能否编辑、删除。 |
| `claimed_by_user_id` | BIGINT | 否 | 逻辑外键、普通索引 | 需求认领人，逻辑关联 `users.id`。为空表示未认领。 |
| `claimed_at` | TIMESTAMPTZ | 否 | 无 | 认领时间。 |
| `completed_at` | TIMESTAMPTZ | 否 | 无 | 完成时间。 |
| `remark` | TEXT | 否 | 无 | 备注。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 普通索引 | 更新时间。 |

业务规则：

- 创建需求需要校验用户在 `requirement` scope 下具备 `requirement:create` 权限，并且被分配到目标项目。
- 未认领且状态为 `OPEN` 的需求可以被创建人编辑、删除。
- 编辑需求需要校验 `requirement` scope 下的 `requirement:update-own` 权限、项目分配、创建人归属、需求未认领、需求状态为 `OPEN`。
- 删除需求需要校验 `requirement` scope 下的 `requirement:delete-own` 权限、项目分配、创建人归属、需求未认领、需求状态为 `OPEN`。
- 认领需求需要校验 `requirement` scope 下的 `requirement:claim` 权限、项目分配、需求未被认领、需求状态为 `OPEN`。
- 已认领需求对普通用户锁定，不能编辑、不能删除。
- `ADMIN` 可以强制编辑、删除任意需求。

### 8.9 `tasks` 任务表

表作用：保存项目开发任务。任务是执行层面的开发事项，不等同于需求池 idea。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 任务唯一 ID。 |
| `project_id` | BIGINT | 是 | 逻辑外键、普通索引 | 所属项目 ID，逻辑关联 `projects.id`。 |
| `assignee_user_id` | BIGINT | 否 | 逻辑外键、普通索引 | 任务负责人，逻辑关联 `users.id`。 |
| `requirement_id` | BIGINT | 否 | 逻辑外键、普通索引 | 来源需求 ID，逻辑关联 `requirements.id`。任务可由需求转化而来。 |
| `title` | VARCHAR(200) | 是 | 普通索引 | 任务标题。 |
| `description` | TEXT | 否 | 无 | 任务说明。 |
| `task_type` | VARCHAR(40) | 是 | 普通索引 | 任务类型：前端、后端、AI、数据库、部署、测试、文档、其他。 |
| `priority` | VARCHAR(20) | 是 | 普通索引 | 优先级：`LOW`、`MEDIUM`、`HIGH`。 |
| `status` | VARCHAR(40) | 是 | 普通索引 | 任务状态：`TODO`、`IN_PROGRESS`、`BLOCKED`、`SUBMITTED`、`REVIEWING`、`DONE`、`CANCELLED`。 |
| `progress` | INTEGER | 是 | 无 | 任务进度百分比。`CONTRIBUTOR` 不能编辑。 |
| `github_issue_url` | VARCHAR(500) | 否 | 无 | GitHub Issue 地址。 |
| `pr_url` | VARCHAR(500) | 否 | 无 | Pull Request 地址。 |
| `submission_note` | TEXT | 否 | 无 | 任务提交说明。 |
| `current_issues` | TEXT | 否 | 无 | 当前阻塞或问题说明。 |
| `due_date` | DATE | 否 | 无 | 截止日期。 |
| `completed_at` | TIMESTAMPTZ | 否 | 无 | 完成时间。 |
| `remark` | TEXT | 否 | 无 | 备注。 |
| `created_at` | TIMESTAMPTZ | 是 | 无 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 普通索引 | 更新时间。 |

业务规则：

- `ADMIN` 可创建、编辑、删除任务。
- `CONTRIBUTOR` 只读任务。
- 即使 `CONTRIBUTOR` 被分配到项目，也不能编辑任务。

### 8.10 `audit_logs` 审计日志表

表作用：记录关键写操作，支持追溯“谁在什么时候改了什么”。

| 字段 | 类型 | 必填 | 约束/索引 | 字段注释与业务含义 |
|---|---|---:|---|---|
| `id` | BIGSERIAL | 是 | 主键 | 审计日志 ID。 |
| `actor_id` | BIGINT | 否 | 普通索引 | 操作人用户 ID。系统自动任务可为空。 |
| `actor_name` | VARCHAR(120) | 是 | 普通索引 | 操作人显示名快照。即使用户改名，历史日志仍可读。 |
| `action` | VARCHAR(40) | 是 | 普通索引 | 动作类型，例如 `CREATE`、`UPDATE`、`STATUS_CHANGE`、`ASSIGN`、`CLAIM`、`REMOVE`。 |
| `target_type` | VARCHAR(40) | 是 | 普通索引 | 操作对象类型，例如 `PROJECT`、`USER`、`REQUIREMENT`、`TASK`。 |
| `target_id` | BIGINT | 否 | 普通索引 | 操作对象 ID。 |
| `project_id` | BIGINT | 否 | 普通索引 | 关联项目 ID。用于项目动态过滤。 |
| `before_data` | JSONB | 否 | 无 | 修改前数据快照。 |
| `after_data` | JSONB | 否 | 无 | 修改后数据快照。 |
| `description` | TEXT | 否 | 无 | 动作说明，用于 Dashboard 动态文案。 |
| `created_at` | TIMESTAMPTZ | 是 | 普通索引 | 操作发生时间。 |

业务规则：

- 写操作应尽量记录审计日志。
- Dashboard 的“最近更新项目”和“人员更新”可以从审计日志聚合。
- 审计日志只允许 `ADMIN` 查看完整列表。

## 9. 兼容迁移表

### 9.1 `members` 成员表

当前 MVP 表。目标态建议由 `users` 替代。

表作用：当前用于保存成员资料，不支持登录。

| 字段 | 类型 | 必填 | 字段注释与业务含义 |
|---|---|---:|---|
| `id` | BIGSERIAL | 是 | 成员 ID。 |
| `name` | VARCHAR(120) | 是 | 成员姓名或昵称。 |
| `contact` | VARCHAR(200) | 否 | 联系方式。 |
| `github_username` | VARCHAR(120) | 否 | GitHub 用户名。 |
| `email` | VARCHAR(200) | 否 | 邮箱。 |
| `skill_direction` | VARCHAR(100) | 否 | 技术方向。 |
| `skill_level` | VARCHAR(40) | 否 | 技术水平。 |
| `status` | VARCHAR(40) | 是 | 成员状态。 |
| `remark` | TEXT | 否 | 备注。 |
| `created_at` | TIMESTAMPTZ | 是 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 更新时间。 |

迁移建议：

- 把 `members` 数据迁移到 `users`。
- 如果成员没有账号，可生成临时用户名或保留为非登录人员档案。
- 目标态页面建议统一使用 `users` 展示人员。

### 9.2 `project_members` 项目成员关系表

当前 MVP 表。目标态建议由 `project_users` 替代。

表作用：当前表示成员参与项目。

| 字段 | 类型 | 必填 | 字段注释与业务含义 |
|---|---|---:|---|
| `id` | BIGSERIAL | 是 | 关系 ID。 |
| `project_id` | BIGINT | 是 | 项目 ID。 |
| `member_id` | BIGINT | 是 | 成员 ID。 |
| `role` | VARCHAR(40) | 是 | 项目内角色，例如前端、后端、AI。 |
| `responsibility` | TEXT | 否 | 负责内容。 |
| `joined_at` | TIMESTAMPTZ | 否 | 加入时间。 |
| `left_at` | TIMESTAMPTZ | 否 | 离开时间。 |
| `status` | VARCHAR(40) | 是 | 关系状态。 |
| `created_at` | TIMESTAMPTZ | 是 | 创建时间。 |
| `updated_at` | TIMESTAMPTZ | 是 | 更新时间。 |

迁移建议：

- 根据 `members -> users` 的映射，把 `project_members` 迁移为 `project_users`。
- `role` 可以先写入 `responsibility`，或后续扩展为项目内说明字段。

## 10. 枚举值设计

### 10.1 用户状态

- `ACTIVE`: 正常可用。
- `DISABLED`: 已禁用，不允许登录和操作。

### 10.2 角色编码

- `ADMIN`: 管理员。
- `CONTRIBUTOR`: 贡献者。

### 10.3 权限节点类型

- `DIRECTORY`: 目录。
- `MENU`: 菜单。
- `PERMISSION`: 权限项。

### 10.4 操作级别

- `GET`: 只读。
- `POST`: 写入，包括 `POST`、`PUT`、`PATCH`、`DELETE`。
- `BOTH`: 只读和写入。

### 10.5 项目状态

- `PLANNING`: 规划中。
- `DEVELOPING`: 开发中。
- `TESTING`: 测试中。
- `DEPLOYED`: 已部署。
- `DONE`: 已完成。
- `PAUSED`: 暂停。
- `ARCHIVED`: 已归档。

### 10.6 需求状态

- `OPEN`: 未认领。
- `CLAIMED`: 已认领。
- `DONE`: 已完成。
- `CANCELLED`: 已取消。

### 10.7 任务状态

- `TODO`: 待处理。
- `IN_PROGRESS`: 进行中。
- `BLOCKED`: 阻塞。
- `SUBMITTED`: 已提交。
- `REVIEWING`: 评审中。
- `DONE`: 已完成。
- `CANCELLED`: 已取消。

## 11. 权限 scope 与 code 建议

`permission_nodes.code` 必须全局唯一。scope 来自菜单，用于前端分组和 `useMenuPerm(scope)`，但不允许不同 scope 下出现重复 code。

### 11.1 Dashboard

菜单 scope：`dashboard`

- `dashboard:view`

### 11.2 项目

菜单 scope：`project`

- `project:list`
- `project:view`
- `project:create`
- `project:update`
- `project:delete`
- `project:update-status`
- `project:update-progress`

### 11.3 项目分配

菜单 scope：`project-user`

- `project-user:list`
- `project-user:assign`
- `project-user:remove`

### 11.4 需求池

菜单 scope：`requirement`

- `requirement:list`
- `requirement:create`
- `requirement:update-own`
- `requirement:delete-own`
- `requirement:claim`
- `requirement:admin-update`
- `requirement:admin-delete`

### 11.5 任务

菜单 scope：`task`

- `task:list`
- `task:view`
- `task:create`
- `task:update`
- `task:delete`
- `task:update-status`
- `task:update-progress`
- `task:submit`

### 11.6 用户、角色、权限

菜单 scope：`user`

- `user:list`
- `user:create`
- `user:update`
- `user:disable`

菜单 scope：`role`

- `role:list`
- `role:create`
- `role:update`

菜单 scope：`permission-node`

- `permission-node:list`
- `permission-node:create`
- `permission-node:update`
- `permission-node:delete`

菜单 scope：`role-permission`

- `role-permission:update`

### 11.7 审计日志

菜单 scope：`audit-log`

- `audit-log:list`

## 12. Dashboard 数据设计

### 12.1 四个卡片

项目卡片：

- 项目总数。
- 开发中项目数。
- 已部署项目数。

人员卡片：

- 用户总数。
- 活跃用户数。

任务卡片：

- 任务总数。
- 进行中任务数。
- 待提交任务数。

阻塞任务卡片：

- 阻塞任务数。
- 最近阻塞任务摘要。

### 12.2 最近更新的项目

来源：

- `audit_logs`
- `project_users`
- `requirements`

动态示例：

- 张三加入了「项目 A」。
- 李四在「项目 B」增加了需求「支持导出」。
- 王五领取了「项目 C」的需求「权限配置」。

### 12.3 人员更新

来源：

- `users.created_at`
- 用户状态变更审计日志。
- 项目分配审计日志。

动态示例：

- 张三加入系统。
- 李四被分配到「项目 A」。
- 王五被禁用。

## 13. 数据迁移建议

### 13.1 从单管理员到用户体系

1. 创建 `roles`。
2. 初始化 `ADMIN`、`CONTRIBUTOR`。
3. 创建 `users`。
4. 从环境变量中的管理员账号初始化第一个 `ADMIN` 用户。
5. 后续登录从 `users` 表校验。

### 13.2 从成员到用户

1. 为现有 `members` 生成对应 `users`。
2. `members.name -> users.display_name`。
3. `members.email -> users.email`。
4. `members.github_username -> users.github_username`。
5. 默认角色为 `CONTRIBUTOR`。
6. 默认状态为 `ACTIVE`。

### 13.3 从项目成员到项目用户

1. 建立 `member_id -> user_id` 映射。
2. 把 `project_members.project_id` 和映射后的 `user_id` 写入 `project_users`。
3. `project_members.responsibility -> project_users.responsibility`。

### 13.4 从任务负责人到用户

1. 建立 `member_id -> user_id` 映射。
2. 把 `tasks.assignee_id` 迁移为 `tasks.assignee_user_id`。

## 14. 验收标准

- 未登录访问站内页面会跳转 `/login`。
- `ADMIN` 可以进入所有菜单。
- `CONTRIBUTOR` 只能看到被授权菜单。
- 侧栏菜单来自权限树，不再完全写死。
- 按钮显示由权限 code 控制。
- 接口由后端权限依赖校验。
- `CONTRIBUTOR` 可以查看所有项目、任务、人员信息。
- `CONTRIBUTOR` 被分配项目后，可以在需求池新增需求。
- `CONTRIBUTOR` 未被分配到项目时，即使拥有需求权限 code，也不能新增、编辑、删除、认领该项目需求。
- `CONTRIBUTOR` 可以编辑、删除自己创建、未被认领且状态为 `OPEN` 的需求。
- `CONTRIBUTOR` 不能编辑、删除其他人创建的需求。
- `CONTRIBUTOR` 不能编辑项目进度。
- `CONTRIBUTOR` 不能编辑任务。
- 已认领需求对普通用户锁定。
- `ADMIN` 可以强制编辑、删除已认领需求。
- Dashboard 不展示平均进度和最近操作记录表格。
- Dashboard 展示四个核心卡片、最近项目动态、人员更新。

## 15. 风险与注意事项

- 明文密码有安全风险，后续应尽快改为哈希。
- 权限树初始化很关键，初始化不完整会导致菜单不可见或接口不可用。
- 前端权限控制不能代替后端权限校验。
- `POST` 操作级别需要覆盖 `POST`、`PUT`、`PATCH`、`DELETE`。
- 用户角色已经通过 `user_roles` 多对多实现；实现时需要避免把角色冗余写回 `users` 表。
- 如果保留 `members` 和 `users` 两套人员模型，前端和权限判断会更复杂；建议目标态统一到 `users`。
