# 测试用例文档

日期：2026-05-30

## 1. 文档目的

本文档定义搭子工坊目标态的测试范围、测试数据、后端接口用例、前端页面用例和端到端验收路径。

配套文档：

- [需求文档](../requirement.md)
- [后端系统设计文档](./2026-05-30-system-design.md)
- [前端功能设计文档](./2026-05-30-frontend-page-design.md)

## 2. 测试范围

覆盖范围：

- 登录、token 校验、用户状态校验。
- 用户、角色、用户角色关联。
- 权限树、角色授权、菜单和按钮权限。
- 动态菜单、动态路由、路由守卫。
- 项目、任务、项目用户分配。
- 需求池新增、编辑、删除、认领和锁定规则。
- Dashboard 动态、审计日志。
- 前端表单、交互状态、错误状态。

不覆盖范围：

- 注册、找回密码、邮箱验证。
- 多租户、审批流、通知系统。
- 性能压测和安全渗透测试。
- 第三方平台集成。

## 3. 测试环境

后端：

- Python 3.11。
- FastAPI。
- SQLAlchemy。
- Alembic。
- PostgreSQL，使用外部 `DATABASE_URL`。

前端：

- React。
- Vite。
- TypeScript。
- TanStack Query。
- React Router。

建议命令：

```bash
.venv/bin/python -m pytest backend/tests -q
cd frontend && npm run build
```

浏览器验证：

- Chrome 或 Codex in-app browser。
- 桌面视口。
- 移动视口。

## 4. 测试数据

### 4.1 用户

| 用户 | 角色 | 状态 | 说明 |
|---|---|---|---|
| `admin` | `ADMIN` | `ACTIVE` | 超级管理员，拥有全部权限。 |
| `alice` | `CONTRIBUTOR` | `ACTIVE` | 被分配到项目 A。 |
| `bob` | `CONTRIBUTOR` | `ACTIVE` | 未被分配到项目 A。 |
| `disabled_user` | `CONTRIBUTOR` | `DISABLED` | 用于状态校验。 |

### 4.2 项目

| 项目 | 状态 | 分配用户 | 说明 |
|---|---|---|---|
| 项目 A | `DEVELOPING` | `alice` | 用于需求池权限验证。 |
| 项目 B | `PLANNING` | 无 | 用于未分配项目验证。 |

### 4.3 需求

| 需求 | 项目 | 创建人 | 认领人 | 状态 | 说明 |
|---|---|---|---|---|---|
| 需求 A1 | 项目 A | `alice` | 空 | `OPEN` | 可被 alice 编辑、删除、认领。 |
| 需求 A2 | 项目 A | `alice` | `alice` | `CLAIMED` | 普通用户不可编辑、删除。 |
| 需求 A3 | 项目 A | `bob` | 空 | `OPEN` | alice 不可编辑、删除。 |

## 5. 后端接口测试用例

### 5.1 认证与 token

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| BE-AUTH-001 | 登录成功 | 使用 `admin` 正确账号密码调用 `POST /api/v1/auth/login` | 返回 token 和用户基础信息。 |
| BE-AUTH-002 | 登录失败 | 使用错误密码调用登录接口 | 返回 401 或业务错误，不能返回 token。 |
| BE-AUTH-003 | 禁用用户登录 | 使用 `disabled_user` 登录 | 拒绝登录。 |
| BE-AUTH-004 | `/auth/me` 成功 | 使用有效 token 调用 `GET /api/v1/auth/me` | 返回 `user`、`roles`、`menuTree`、`permissionScopes`。 |
| BE-AUTH-005 | token 不包含状态 | 修改用户状态为 `DISABLED` 后使用旧 token 调接口 | 后端查询表中状态并拒绝。 |
| BE-AUTH-006 | 无 token 访问站内接口 | 不带 `Authorization` 调任意业务接口 | 返回 401。 |

### 5.2 用户、角色、权限树

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| BE-PERM-001 | 创建用户 | `ADMIN` 调 `POST /api/v1/users` | 创建成功，密码按当前 MVP 明文保存。 |
| BE-PERM-002 | 非管理员创建用户 | `CONTRIBUTOR` 调创建用户接口 | 返回 403。 |
| BE-PERM-003 | 用户多角色 | 给同一用户绑定多个角色 | `/auth/me` 返回角色权限并集。 |
| BE-PERM-004 | 创建权限节点 | `ADMIN` 创建 `PERMISSION` 节点 | 创建成功，节点在权限树中可见。 |
| BE-PERM-005 | 权限 code 全局唯一 | 使用已存在 `code` 创建权限节点 | 返回 409 或字段校验错误。 |
| BE-PERM-006 | 权限层级校验 | 在 `PERMISSION` 下创建子节点 | 返回 400。 |
| BE-PERM-007 | routePath 校验 | `PERMISSION` 填写 `routePath` | 返回 400。 |
| BE-PERM-008 | 角色授权 | 给 `CONTRIBUTOR` 授予菜单和权限项 | `/auth/me` 返回对应菜单和 `permissionScopes`。 |

### 5.3 动态菜单与权限校验

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| BE-MENU-001 | ADMIN 菜单 | `ADMIN` 调 `/auth/me` | 返回全部菜单和权限。 |
| BE-MENU-002 | CONTRIBUTOR 菜单 | `CONTRIBUTOR` 调 `/auth/me` | 不返回用户管理、角色管理、权限配置、项目分配、审计日志菜单。 |
| BE-MENU-003 | scope 分组 | 检查 `/auth/me.permissionScopes` | key 为菜单 scope，value 为全局唯一 code。 |
| BE-MENU-004 | 接口权限通过 | 具备 `project:create` 的用户创建项目 | 创建成功。 |
| BE-MENU-005 | 接口权限失败 | 不具备 `project:create` 的用户创建项目 | 返回 403。 |

### 5.4 项目与项目分配

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| BE-PROJ-001 | 创建项目 | `ADMIN` 创建项目 | 项目创建成功，生成审计日志。 |
| BE-PROJ-002 | 普通用户创建项目 | `CONTRIBUTOR` 创建项目 | 返回 403。 |
| BE-PROJ-003 | 分配项目用户 | `ADMIN` 将 `alice` 分配到项目 A | `project_users` 生成 `ACTIVE` 记录，生成审计日志。 |
| BE-PROJ-004 | 重复分配 | 重复将 `alice` 分配到项目 A | 返回 409 或更新已有记录，不产生重复有效记录。 |
| BE-PROJ-005 | 移除项目用户 | `ADMIN` 移除 `alice` | 分配状态变为 `REMOVED`，后续需求池写操作失效。 |

### 5.5 需求池

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| BE-REQ-001 | 被分配用户新增需求 | `alice` 在项目 A 创建需求 | 创建成功，`created_by_user_id=alice`。 |
| BE-REQ-002 | 未分配用户新增需求 | `bob` 在项目 A 创建需求 | 返回 403。 |
| BE-REQ-003 | 创建人编辑未认领需求 | `alice` 编辑需求 A1 | 编辑成功。 |
| BE-REQ-004 | 非创建人编辑需求 | `alice` 编辑 `bob` 创建的需求 A3 | 返回 403。 |
| BE-REQ-005 | 创建人删除未认领需求 | `alice` 删除需求 A1 | 删除成功或按软删除规则处理。 |
| BE-REQ-006 | 已认领需求锁定 | `alice` 编辑或删除需求 A2 | 返回 403。 |
| BE-REQ-007 | 认领需求 | `alice` 认领项目 A 的未认领需求 | `claimed_by_user_id=alice`，状态变为 `CLAIMED`。 |
| BE-REQ-008 | 重复认领 | 再次认领已认领需求 | 返回 409 或业务错误。 |
| BE-REQ-009 | ADMIN 强制编辑 | `ADMIN` 编辑已认领需求 A2 | 编辑成功。 |
| BE-REQ-010 | ADMIN 强制删除 | `ADMIN` 删除已认领需求 A2 | 删除成功或按软删除规则处理。 |

### 5.6 任务

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| BE-TASK-001 | 创建任务 | `ADMIN` 创建任务并关联项目 | 创建成功，生成审计日志。 |
| BE-TASK-002 | 分配任务负责人 | `ADMIN` 设置任务负责人 | 更新成功，生成审计日志。 |
| BE-TASK-003 | 更新任务进度 | `ADMIN` 更新任务进度为合法值 | 成功。 |
| BE-TASK-004 | 非法任务进度 | 设置进度小于 0 或大于 100 | 返回 422 或字段错误。 |
| BE-TASK-005 | CONTRIBUTOR 编辑任务 | 被分配到项目的 `alice` 编辑任务 | 返回 403。 |

### 5.7 Dashboard 与审计日志

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| BE-DASH-001 | Summary | 调 `GET /api/v1/dashboard/summary` | 返回项目、人员、任务、阻塞任务四类数据。 |
| BE-DASH-002 | 项目动态 | 创建需求、认领需求、分配项目用户 | Dashboard 最近项目动态出现对应文案。 |
| BE-DASH-003 | 人员更新 | 创建用户、分配项目用户 | Dashboard 人员更新出现对应文案。 |
| BE-AUDIT-001 | 审计日志生成 | 执行创建、更新、认领、移除等写操作 | `audit_logs` 有操作人、动作、对象、时间和描述。 |
| BE-AUDIT-002 | 审计日志查询 | `ADMIN` 查询审计日志并分页 | 返回 `{ items, total }`。 |

## 6. 前端页面测试用例

### 6.1 登录与路由守卫

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| FE-AUTH-001 | 未登录访问站内页面 | 打开 `/dashboard` | 跳转 `/login`。 |
| FE-AUTH-002 | 登录成功 | 输入正确账号密码 | 保存 token，调用 `/auth/me`，进入 `/dashboard`。 |
| FE-AUTH-003 | 登录失败 | 输入错误密码 | 表单展示错误，不跳转。 |
| FE-AUTH-004 | 已登录访问登录页 | 打开 `/login` | 自动跳转 `/dashboard`。 |
| FE-AUTH-005 | 401 处理 | 模拟 token 过期 | 清理 token，跳转 `/login`。 |

### 6.2 动态菜单与动态路由

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| FE-MENU-001 | ADMIN 菜单渲染 | ADMIN 登录 | 侧栏展示工作台、项目、任务、用户、角色、权限配置、项目分配、审计日志。 |
| FE-MENU-002 | CONTRIBUTOR 菜单渲染 | CONTRIBUTOR 登录 | 不展示管理类菜单。 |
| FE-MENU-003 | 多级菜单展开 | 点击目录菜单 | 子菜单展开，再次点击收起。 |
| FE-MENU-004 | 当前路由高亮 | 访问 `/projects` | 项目菜单高亮。 |
| FE-MENU-005 | 隐藏路由访问 | 从项目列表进入 `/projects/:id` | 详情页可访问，但不显示为侧栏菜单项。 |
| FE-MENU-006 | 无权限路由 | CONTRIBUTOR 直接输入 `/admin/permissions` | 展示 403。 |
| FE-MENU-007 | 不存在路由 | 输入不存在路径 | 展示 404。 |
| FE-MENU-008 | 图标兜底 | 后端返回未知 icon code | 使用默认图标，不导致页面崩溃。 |

### 6.3 权限按钮

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| FE-PERM-001 | 项目新建按钮 | ADMIN 访问项目列表 | 展示“新增项目”。 |
| FE-PERM-002 | 普通用户项目按钮 | CONTRIBUTOR 访问项目列表 | 不展示“新增项目”。 |
| FE-PERM-003 | `useMenuPerm` 判断 | 在项目页读取 `useMenuPerm("project")` | `perms.has("project:create")` 决定按钮显示。 |
| FE-PERM-004 | 后端 403 | 手动触发无权限写操作 | 展示无权限提示，不继续重试。 |

### 6.4 项目详情与需求池

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| FE-REQ-001 | 已分配提示 | `alice` 访问项目 A 详情 | 展示“已分配，可参与需求池”。 |
| FE-REQ-002 | 未分配提示 | `bob` 访问项目 A 详情 | 展示“未分配，只读查看”。 |
| FE-REQ-003 | 新增需求按钮 | `alice` 访问项目 A 需求池 | 展示“新增需求”。 |
| FE-REQ-004 | 未分配隐藏按钮 | `bob` 访问项目 A 需求池 | 不展示新增、编辑、删除、认领按钮。 |
| FE-REQ-005 | 创建人编辑按钮 | `alice` 查看自己创建且 `OPEN` 的需求 | 展示编辑、删除。 |
| FE-REQ-006 | 非创建人隐藏按钮 | `alice` 查看 `bob` 创建的需求 | 不展示编辑、删除。 |
| FE-REQ-007 | 已认领锁定 | 查看已认领需求 | 普通用户不展示编辑、删除。 |
| FE-REQ-008 | 认领成功刷新 | 点击认领需求 | 需求状态变为 `CLAIMED`，按钮状态刷新。 |

### 6.5 Dashboard

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| FE-DASH-001 | 四个卡片 | 打开 `/dashboard` | 只展示项目、人员、任务、阻塞任务四类卡片。 |
| FE-DASH-002 | 无平均进度 | 检查 Dashboard | 不展示平均进度卡片。 |
| FE-DASH-003 | 无最近操作表格 | 检查 Dashboard | 不展示最近操作记录表格。 |
| FE-DASH-004 | 最近项目动态 | 创建需求或认领需求后刷新 | 最近更新项目出现对应动态。 |
| FE-DASH-005 | 人员更新 | 新增用户或分配项目用户后刷新 | 人员更新出现对应动态。 |

### 6.6 角色授权与权限配置页面

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| FE-ROLE-001 | 授权树加载 | ADMIN 打开角色授权 | 从后端权限树接口加载目录、菜单、权限项。 |
| FE-ROLE-002 | 勾选父节点 | 勾选目录或菜单 | 自动勾选所有子节点。 |
| FE-ROLE-003 | 勾选子节点 | 勾选权限项 | 自动勾选祖先菜单和目录。 |
| FE-ROLE-004 | 半选状态 | 只勾选部分子节点 | 父节点展示半选状态。 |
| FE-PNODE-001 | 新增权限 code 重复 | 输入已存在 code 并提交 | 字段提示重复或处理后端 409。 |
| FE-PNODE-002 | routePath 控制 | 节点类型切换为 `PERMISSION` | `routePath` 禁用或自动清空。 |
| FE-PNODE-003 | 层级控制 | 选择 `PERMISSION` 作为父节点 | 不允许创建子节点。 |

## 7. 端到端验收用例

| ID | 场景 | 步骤 | 期望 |
|---|---|---|---|
| E2E-001 | 管理员完整维护流 | 登录 ADMIN -> 创建用户 alice -> 创建项目 A -> 分配 alice -> 创建任务 -> 更新任务状态和进度 -> 查看审计日志 -> 查看 Dashboard | 所有操作成功，审计日志和 Dashboard 动态正确。 |
| E2E-002 | CONTRIBUTOR 需求池流 | alice 登录 -> 打开项目 A -> 新增需求 -> 编辑需求 -> 认领需求 -> 再尝试编辑或删除 | 认领前可编辑删除，认领后锁定。 |
| E2E-003 | 未分配项目限制 | bob 登录 -> 打开项目 A -> 查看需求池 -> 尝试直接调用新增需求接口 | 页面无写按钮，接口返回 403。 |
| E2E-004 | 动态菜单变更 | ADMIN 修改 CONTRIBUTOR 角色权限 -> alice 重新登录或刷新 `/auth/me` | 侧栏和按钮权限按新权限刷新。 |
| E2E-005 | 用户禁用生效 | ADMIN 禁用 alice -> alice 使用旧 token 访问接口 | 后端拒绝，前端跳转登录或展示失效提示。 |

## 8. 回归测试清单

- 登录态和 token 失效处理。
- `/auth/me` 返回结构和权限 scope。
- 权限 code 全局唯一。
- 动态侧栏、路由守卫、隐藏路由。
- `ADMIN` 全权限。
- `CONTRIBUTOR` 只读项目、任务、人员。
- `CONTRIBUTOR` 仅在被分配项目内操作需求池。
- 已认领需求普通用户不可编辑、不可删除。
- `ADMIN` 可强制编辑、删除已认领需求。
- Dashboard 不展示平均进度和最近操作记录表格。
- Dashboard 展示四个资源卡片、最近项目动态、人员更新。
- 审计日志覆盖关键写操作。

## 9. 通过标准

- 后端自动化测试全部通过。
- 前端 TypeScript build 通过。
- 核心端到端用例 `E2E-001` 到 `E2E-005` 通过。
- 未登录、无权限、禁用用户、重复权限 code、未分配项目写操作均能正确失败。
- 前端按钮隐藏与后端 403 行为一致。
