# 前端页面功能设计文档

日期：2026-05-30

## 1. 文档目的

本文档以页面为单位描述目标态前端功能设计，包括页面目标、访问权限、核心模块、交互行为、表单字段、按钮权限和状态处理。

本文档配合以下文档使用：

- [需求文档](../requirement.md)
- [后端系统设计文档](./2026-05-30-system-design.md)
- [测试用例文档](./2026-05-30-test-cases.md)

## 2. 前端设计原则

- 未登录用户只能访问 `/login`。
- 登录后菜单从 `/auth/me` 返回的权限树生成，不再完全写死。
- 页面访问由菜单权限控制。
- 按钮和操作入口由权限 code 控制。
- `permission_nodes.code` 必须全局唯一；scope 用于按页面/菜单分组权限，不允许作为重复 code 的边界。
- 需求池按钮还需要结合项目分配、资源归属和需求状态控制展示。
- 后端接口仍是最终权限裁决方，前端权限只负责体验和防误操作。
- 前端不能把“按钮不可见”当作安全控制，接口 403 需要正常提示。
- `CONTRIBUTOR` 可以查看所有项目、人员、任务和进度信息。
- `CONTRIBUTOR` 被分配项目后，只能在该项目需求池中操作，不能编辑项目进度，不能编辑任务。
- `ADMIN` 拥有全部权限。

## 3. 布局与导航

### 3.1 登录布局

适用页面：

- `/login`

布局特点：

- 不显示侧栏。
- 不显示站内顶部工具条。
- 页面中心展示登录表单。
- 登录失败在表单内展示错误提示。

### 3.2 工作台布局

适用页面：

- `/dashboard`
- `/projects`
- `/projects/:id`
- `/tasks`
- `/users` 或 `/members`

布局特点：

- 左侧侧栏菜单。
- 侧栏支持展开和收起。
- 侧栏菜单由权限树生成。
- 顶部展示当前用户显示名、角色、退出按钮。
- 主内容区按页面展示卡片、表格、tabs 或表单。

### 3.3 管理布局

适用页面：

- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/project-assignments`
- `/audit-logs`

布局特点：

- 与工作台布局一致。
- 仅具备对应菜单权限的用户可见。
- 默认仅 `ADMIN` 可见。

### 3.4 动态菜单与路由实现要求

参考 `/Users/freeant/accounts-matrix/frontend` 的实现后，目标态采用“前端静态路由注册表 + 后端动态权限树”的方式：

- 前端维护 `routeRegistry`，集中声明所有可渲染页面的 `routeKey`、`path`、`component`、`scope`、`layout`、`hidden`。
- `routeKey` 默认使用菜单节点 `code`，例如菜单 `project` 对应项目列表页；同一页面有多个子路由时用 `project.new`、`project.detail`、`project.edit` 这类前端内部 key。
- 后端 `/auth/me` 返回当前用户可见的 `menuTree` 和按 scope 分组的权限 code，不返回 React 组件名。
- 前端根据 `menuTree` 和 `routeRegistry` 生成侧栏菜单、可访问路由和面包屑。
- 详情页、新增页、编辑页这类不直接出现在菜单里的页面设置 `hidden: true`，但仍必须在 `routeRegistry` 中注册并经过权限守卫。
- 页面组件只能从 `routeRegistry` 映射，不能根据后端字符串动态 import 任意组件。
- 菜单图标由后端返回图标 code，前端通过白名单映射到 lucide 图标；未知图标使用默认图标。
- 外链菜单 MVP 默认不开放。后续如需要外链，必须做域名白名单并使用 `target="_blank"`、`rel="noopener noreferrer"`。

建议类型：

```ts
type RouteRegistryItem = {
  routeKey: string;
  path: string;
  component: React.ComponentType;
  scope: string;
  menuCode?: string;
  requiredCode?: string;
  hidden?: boolean;
  layout: "app" | "auth";
};

type MenuNode = {
  id: number;
  parentId?: number;
  nodeType: "DIRECTORY" | "MENU" | "PERMISSION";
  name: string;
  code: string;
  routePath?: string;
  scope?: string;
  icon?: string;
  sortOrder: number;
  children?: MenuNode[];
};

type PermissionScopes = Record<string, string[]>;
```

### 3.5 可参考与改进点

从 `accounts-matrix` 参考：

- 保留集中式路由表，避免路由散落在页面组件里。
- 保留递归侧栏渲染，支持多级目录、展开/折叠、当前路由高亮。
- 保留角色授权树的父子级联体验：勾选父节点自动勾选子节点，勾选子节点自动补齐祖先节点。
- 保留侧栏折叠能力，折叠时只显示图标，并通过 `title` 或 tooltip 提示菜单名。

需要改进：

- 不使用前端写死的 `menuConfig` 作为权限来源，菜单来源必须是 `/auth/me`。
- 不使用 `allowedPaths` 静态白名单控制路由，路由访问由 `menuTree + routeRegistry + permissionScopes` 计算。
- 不使用菜单标题作为 React key，统一使用后端节点 `id` 或稳定 `code`。
- 不只用 `user.menus.includes(permission)` 判断权限，按钮权限通过 `useMenuPerm(scope)` 获取当前菜单权限集合后判断全局唯一 code。
- 不让前端 `hidden` 成为权限控制。`hidden` 只表示是否显示在菜单中，路由访问仍要走权限守卫。

### 3.6 前端权限与路由守卫

- `AuthProvider` 启动时读取 token，调用 `/auth/me` 获取用户、角色、菜单树和权限 scope。
- 未登录访问站内页面时跳转 `/login`。
- 已登录但没有菜单权限时展示 403 页面。
- 路由不存在时展示 404 页面。
- `ADMIN` 仍通过后端返回的角色和权限树获得全部菜单和权限，不在前端硬编码绕过所有判断。
- `useMenuPerm(scope)` 返回该 scope 下的权限 code 集合，按钮示例：`const perms = useMenuPerm("project"); perms.has("project:create")`。
- 后端 401 时清理 token 并跳转登录；后端 403 时展示无权限提示并停止写操作重试。

## 4. 页面清单

| 页面 | 建议路由 | 页面类型 | 默认可见角色 |
|---|---|---|---|
| 登录页 | `/login` | 登录 | 未登录用户 |
| Dashboard | `/dashboard` | 工作台首页 | `ADMIN`、`CONTRIBUTOR` |
| 项目列表 | `/projects` | 列表 | `ADMIN`、`CONTRIBUTOR` |
| 项目详情 | `/projects/:id` | 工作台详情 | `ADMIN`、`CONTRIBUTOR` |
| 项目新增/编辑 | `/projects/new`、`/projects/:id/edit` | 表单 | `ADMIN` |
| 任务列表 | `/tasks` | 列表 | `ADMIN`、`CONTRIBUTOR` |
| 任务详情 | `/tasks/:id` | 详情 | `ADMIN`、`CONTRIBUTOR` |
| 任务新增/编辑 | `/tasks/new`、`/tasks/:id/edit` | 表单 | `ADMIN` |
| 人员列表 | `/users` | 列表 | `ADMIN`、`CONTRIBUTOR` |
| 人员详情 | `/users/:id` | 详情 | `ADMIN`、`CONTRIBUTOR` |
| 用户管理 | `/admin/users` | 管理列表 | `ADMIN` |
| 角色管理 | `/admin/roles` | 管理列表 | `ADMIN` |
| 权限配置 | `/admin/permissions` | 权限树管理 | `ADMIN` |
| 项目分配 | `/admin/project-assignments` | 分配管理 | `ADMIN` |
| 审计日志 | `/audit-logs` | 日志列表 | `ADMIN` |

说明：

- 当前 MVP 中存在 `/members`。目标态建议统一为 `/users`。
- 如果短期不改路由，可以保留 `/members` 作为 `/users` 的兼容别名。

## 5. 登录页

### 5.1 页面信息

路由：`/login`

页面目标：

- 让用户输入账号密码完成登录。
- 登录成功后进入 `/dashboard`。
- 登录失败给出明确错误。

访问权限：

- 未登录用户可访问。
- 已登录用户访问时自动跳转 `/dashboard`。

### 5.2 页面模块

- 系统名称。
- 登录说明。
- 登录表单。
- 错误提示。

### 5.3 表单字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `username` | 输入框 | 是 | 非空 | 登录账号。 |
| `password` | 密码输入框 | 是 | 非空 | 登录密码，当前系统按明文密码校验。 |

### 5.4 操作按钮

| 按钮 | 权限 code | 行为 |
|---|---|---|
| 登录 | 无 | 调用 `POST /api/v1/auth/login`。 |

### 5.5 交互规则

- 提交中禁用登录按钮。
- 登录成功后保存 token。
- 登录成功后请求 `/auth/me` 获取用户、角色、菜单树和权限列表。
- 登录失败展示错误信息。
- 用户状态不是 `ACTIVE` 时，后端拒绝登录或拒绝后续 token 校验。

## 6. Dashboard 页面

### 6.1 页面信息

路由：`/dashboard`

页面目标：

- 作为登录后的工作动态入口。
- 展示系统核心资源概况。
- 展示最近项目动态和人员更新。

访问权限：

- `dashboard:view`

### 6.2 页面模块

1. 四个核心资源卡片。
2. 最近更新的项目。
3. 人员更新。

不展示：

- 平均进度。
- 最近操作记录表格。
- 项目状态分布图。
- 任务状态分布图。

### 6.3 四个核心卡片

#### 项目卡片

字段：

- 项目总数。
- 开发中项目数。
- 已部署项目数。
- 暂停项目数。

交互：

- 点击卡片进入 `/projects`。

#### 人员卡片

字段：

- 用户总数。
- 活跃用户数。
- 最近新增用户显示名。

交互：

- 点击卡片进入 `/users`。

#### 任务卡片

字段：

- 任务总数。
- 进行中任务数。
- 待提交任务数。

交互：

- 点击卡片进入 `/tasks`。

#### 阻塞任务卡片

字段：

- 阻塞任务数。
- 最近阻塞任务标题。
- 所属项目。

交互：

- 点击卡片进入 `/tasks?status=BLOCKED`。MVP 可以先进入 `/tasks`。

### 6.4 最近更新的项目

数据来源：

- 项目分配事件。
- 需求创建事件。
- 需求认领事件。
- 项目进度更新事件。

展示字段：

- 动作人显示名。
- 项目名称。
- 动作类型。
- 动作对象。
- 发生时间。

示例文案：

- 张三加入了「项目 A」。
- 李四在「项目 B」增加了需求「支持导出」。
- 王五领取了「项目 C」的需求「权限配置」。

交互：

- 点击动态进入对应项目详情。
- 如果动态关联需求，进入项目详情并定位需求池 tab。

### 6.5 人员更新

数据来源：

- 用户创建。
- 用户状态变更。
- 项目分配。

展示字段：

- 用户显示名。
- 动作类型。
- 关联项目。
- 发生时间。

示例文案：

- 张三加入系统。
- 李四被分配到「项目 A」。
- 王五被禁用。

交互：

- 点击用户名称进入人员详情。
- 点击项目名称进入项目详情。

### 6.6 空状态

- 没有项目动态时展示“暂无项目动态”。
- 没有人员更新时展示“暂无人员更新”。

## 7. 项目列表页面

### 7.1 页面信息

路由：`/projects`

页面目标：

- 展示所有项目。
- 支持按状态、类型、关键词筛选。
- 作为进入项目工作台的入口。

访问权限：

- `project:list`

### 7.2 页面模块

- 页面标题和说明。
- 筛选区。
- 项目表格。
- 新增项目按钮，只有 `ADMIN` 可见。

### 7.3 筛选字段

| 字段 | 控件 | 说明 |
|---|---|---|
| `keyword` | 输入框 | 按项目名称、技术栈模糊搜索。 |
| `status` | 下拉框 | 按项目状态筛选。 |
| `projectType` | 下拉框/输入框 | 按项目类型筛选。 |

### 7.4 表格字段

| 列 | 说明 |
|---|---|
| 项目名称 | 点击进入项目详情。 |
| 类型 | 项目类型。 |
| 状态 | 项目状态 badge。 |
| 进度 | 进度条，只读。 |
| 当前进展 | 项目当前进展摘要。 |
| 下一步 | 下一步计划摘要。 |
| 更新时间 | 最近更新时间。 |
| 操作 | `ADMIN` 显示编辑入口。 |

### 7.5 操作按钮

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 新增项目 | `project:create` | `ADMIN` |
| 编辑项目 | `project:update` | `ADMIN` |

## 8. 项目新增/编辑页面

### 8.1 页面信息

路由：

- `/projects/new`
- `/projects/:id/edit`

页面目标：

- 创建项目。
- 编辑项目基础信息、状态、进度和链接。

访问权限：

- 新增：`project:create`
- 编辑：`project:update`

默认可见角色：

- `ADMIN`

### 8.2 表单分区

1. 基础信息。
2. 状态与时间。
3. 进展记录。
4. 链接与备注。

### 8.3 基础信息字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `name` | 输入框 | 是 | 非空，最长 200 | 项目名称。 |
| `projectType` | 输入框/下拉框 | 否 | 最长 100 | 项目类型。 |
| `techStackText` | 输入框 | 否 | 逗号分隔 | 前端输入字符串，提交时转为数组。 |
| `description` | 多行文本 | 否 | 无 | 项目简介。 |
| `featurePoints` | 多行文本 | 否 | 无 | 功能要点。 |

### 8.4 状态与时间字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `status` | 下拉框 | 是 | 项目状态枚举 | 项目状态。 |
| `progress` | 数字输入 | 是 | 0 到 100 | 项目进度，只有 `ADMIN` 可编辑。 |
| `startDate` | 日期选择 | 否 | 日期格式 | 项目开始时间。 |
| `expectedFinishDate` | 日期选择 | 否 | 日期格式 | 预计完成时间。 |
| `actualFinishDate` | 日期选择 | 否 | 日期格式 | 实际完成时间。 |

### 8.5 进展记录字段

| 字段 | 控件 | 必填 | 说明 |
|---|---|---:|---|
| `currentProgress` | 多行文本 | 否 | 当前进展。 |
| `currentIssues` | 多行文本 | 否 | 当前问题。 |
| `nextSteps` | 多行文本 | 否 | 下一步计划。 |

### 8.6 链接与备注字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `githubUrl` | 输入框 | 否 | URL | GitHub 地址。 |
| `deployUrl` | 输入框 | 否 | URL | 发布地址。 |
| `remark` | 多行文本 | 否 | 无 | 备注。 |

### 8.7 交互规则

- 保存成功后跳转项目详情页。
- 保存失败展示接口错误。
- 编辑页加载失败展示错误状态。
- `CONTRIBUTOR` 不能进入该页面。

## 9. 项目详情页面

### 9.1 页面信息

路由：`/projects/:id`

页面目标：

- 展示项目完整信息。
- 作为项目工作台承载成员、任务、需求池和动态。

访问权限：

- `project:view`

### 9.2 页面结构

项目详情页使用 tabs：

- 概览
- 成员与权限
- 任务
- 需求池
- 动态记录

### 9.3 顶部信息区

展示字段：

- 项目名称。
- 项目简介。
- 项目状态。
- 项目进度。
- 当前用户在该项目的权限提示。
- 当前用户是否被分配到该项目。

交互：

- `ADMIN` 显示“编辑项目”按钮。
- `ADMIN` 显示“更新状态”“更新进度”入口。
- `CONTRIBUTOR` 不显示项目编辑、状态更新、进度更新入口。
- `CONTRIBUTOR` 根据 `currentUserProjectAccess.assigned` 展示“已分配，可参与需求池”或“未分配，只读查看”。

### 9.4 概览 tab

展示字段：

- 项目类型。
- 技术栈。
- GitHub 地址。
- 发布地址。
- 开始时间。
- 预计完成时间。
- 实际完成时间。
- 当前进展。
- 当前问题。
- 下一步计划。

操作：

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 编辑项目 | `project:update` | `ADMIN` |
| 更新状态 | `project:update-status` | `ADMIN` |
| 更新进度 | `project:update-progress` | `ADMIN` |

### 9.5 成员与权限 tab

展示字段：

- 用户显示名。
- 用户账号。
- 项目责任。
- 分配状态。
- 分配时间。

操作：

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 添加项目用户 | `project-user:assign` | `ADMIN` |
| 移除项目用户 | `project-user:remove` | `ADMIN` |

添加项目用户表单字段：

| 字段 | 控件 | 必填 | 说明 |
|---|---|---:|---|
| `userId` | 用户下拉选择 | 是 | 选择要分配的用户。 |
| `responsibility` | 输入框 | 否 | 用户在项目中的责任。 |

### 9.6 任务 tab

展示字段：

- 任务标题。
- 负责人。
- 类型。
- 优先级。
- 状态。
- 进度。
- 截止时间。

操作：

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 新建任务 | `task:create` | `ADMIN` |
| 编辑任务 | `task:update` | `ADMIN` |

交互规则：

- `CONTRIBUTOR` 只读任务。
- `CONTRIBUTOR` 即使被分配到项目，也不能编辑任务。

### 9.7 需求池 tab

展示字段：

- 需求标题。
- 描述摘要。
- 状态。
- 优先级。
- 创建人。
- 认领人。
- 创建时间。
- 更新时间。

筛选字段：

| 字段 | 控件 | 说明 |
|---|---|---|
| `status` | 下拉框 | 按需求状态筛选。 |
| `keyword` | 输入框 | 按标题、描述搜索。 |
| `claimedBy` | 下拉框 | 按认领人筛选。 |

需求新增/编辑表单字段：

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `title` | 输入框 | 是 | 非空，最长 200 | 需求标题。 |
| `description` | 多行文本 | 否 | 无 | 需求说明。 |
| `priority` | 下拉框 | 是 | 优先级枚举 | 默认 `MEDIUM`。 |
| `remark` | 多行文本 | 否 | 无 | 备注。 |

操作：

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 新增需求 | `requirement:create` | `ADMIN` 或已分配到项目的 `CONTRIBUTOR` |
| 编辑需求 | `requirement:update-own` / `requirement:admin-update` | `ADMIN` 任意需求；`CONTRIBUTOR` 仅自己创建且未认领需求 |
| 删除需求 | `requirement:delete-own` / `requirement:admin-delete` | `ADMIN` 任意需求；`CONTRIBUTOR` 仅自己创建且未认领需求 |
| 认领需求 | `requirement:claim` | 已分配到项目且需求未认领 |

按钮可见性计算：

- `const requirementPerms = useMenuPerm("requirement")`。
- `canCreateRequirement = isAdmin || (requirementPerms.has("requirement:create") && currentUserProjectAccess.assigned)`。
- `canUpdateRequirement = isAdmin || (requirementPerms.has("requirement:update-own") && currentUserProjectAccess.assigned && createdByCurrentUser && requirement.status === "OPEN" && !requirement.claimedByUserId)`。
- `canDeleteRequirement = isAdmin || (requirementPerms.has("requirement:delete-own") && currentUserProjectAccess.assigned && createdByCurrentUser && requirement.status === "OPEN" && !requirement.claimedByUserId)`。
- `canClaimRequirement = isAdmin || (requirementPerms.has("requirement:claim") && currentUserProjectAccess.assigned && requirement.status === "OPEN" && !requirement.claimedByUserId)`。

交互规则：

- 未被分配项目的 `CONTRIBUTOR` 只能查看需求。
- 已认领需求对普通用户锁定，不能编辑、不能删除。
- 普通用户不能编辑、删除其他人创建的需求。
- `ADMIN` 可以强制编辑、删除已认领需求。
- 认领成功后需求状态变为 `CLAIMED`。
- 接口返回 403 时，刷新当前项目详情并提示权限或项目分配已变化。

### 9.8 动态记录 tab

展示字段：

- 时间。
- 操作人。
- 动作。
- 对象。
- 描述。

交互：

- 默认展示当前项目相关动态。
- 可点击对象名称跳转对应详情或定位对应 tab。

## 10. 任务列表页面

### 10.1 页面信息

路由：`/tasks`

页面目标：

- 展示所有任务。
- 支持按项目、负责人、状态、优先级筛选。

访问权限：

- `task:list`

### 10.2 筛选字段

| 字段 | 控件 | 说明 |
|---|---|---|
| `keyword` | 输入框 | 按任务标题、说明搜索。 |
| `projectId` | 项目下拉 | 按项目筛选。 |
| `assigneeUserId` | 用户下拉 | 按负责人筛选。 |
| `status` | 下拉框 | 按状态筛选。 |
| `priority` | 下拉框 | 按优先级筛选。 |

### 10.3 表格字段

| 列 | 说明 |
|---|---|
| 任务标题 | 点击进入任务详情。 |
| 项目 | 所属项目。 |
| 负责人 | 任务负责人。 |
| 类型 | 任务类型。 |
| 优先级 | 优先级 badge。 |
| 状态 | 状态 badge。 |
| 进度 | 进度条。 |
| 更新时间 | 最近更新时间。 |
| 操作 | `ADMIN` 显示编辑入口。 |

### 10.4 操作按钮

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 新建任务 | `task:create` | `ADMIN` |
| 编辑任务 | `task:update` | `ADMIN` |

## 11. 任务新增/编辑页面

### 11.1 页面信息

路由：

- `/tasks/new`
- `/tasks/:id/edit`

访问权限：

- 新增：`task:create`
- 编辑：`task:update`

默认可见角色：

- `ADMIN`

### 11.2 表单分区

1. 任务归属。
2. 状态与排期。
3. 提交与备注。

### 11.3 任务归属字段

| 字段 | 控件 | 必填 | 说明 |
|---|---|---:|---|
| `projectId` | 项目下拉 | 是 | 所属项目。 |
| `assigneeUserId` | 用户下拉 | 否 | 任务负责人。 |
| `requirementId` | 需求下拉 | 否 | 来源需求。 |
| `title` | 输入框 | 是 | 任务标题。 |
| `taskType` | 下拉框 | 是 | 任务类型。 |
| `description` | 多行文本 | 否 | 任务说明。 |

### 11.4 状态与排期字段

| 字段 | 控件 | 必填 | 说明 |
|---|---|---:|---|
| `priority` | 下拉框 | 是 | 优先级。 |
| `status` | 下拉框 | 是 | 任务状态。 |
| `progress` | 数字输入 | 是 | 任务进度。 |
| `dueDate` | 日期选择 | 否 | 截止日期。 |
| `currentIssues` | 多行文本 | 否 | 当前问题。 |

### 11.5 提交与备注字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `githubIssueUrl` | 输入框 | 否 | URL | GitHub Issue 地址。 |
| `prUrl` | 输入框 | 否 | URL | PR 地址。 |
| `submissionNote` | 多行文本 | 否 | 无 | 提交说明。 |
| `remark` | 多行文本 | 否 | 无 | 备注。 |

## 12. 任务详情页面

### 12.1 页面信息

路由：`/tasks/:id`

访问权限：

- `task:view`

### 12.2 展示字段

- 任务标题。
- 所属项目。
- 负责人。
- 来源需求。
- 类型。
- 优先级。
- 状态。
- 进度。
- Issue 地址。
- PR 地址。
- 提交说明。
- 当前问题。
- 截止日期。
- 完成时间。

### 12.3 操作按钮

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 编辑任务 | `task:update` | `ADMIN` |
| 更新状态 | `task:update-status` | `ADMIN` |
| 更新进度 | `task:update-progress` | `ADMIN` |
| 提交任务结果 | `task:submit` | `ADMIN` |

说明：

- `CONTRIBUTOR` 只读。
- `CONTRIBUTOR` 即使被分配到任务所属项目，也不能编辑任务。

## 13. 人员列表页面

### 13.1 页面信息

建议路由：`/users`

兼容路由：`/members`

页面目标：

- 展示系统用户和人员信息。
- 支持查看用户状态、技术方向、联系方式。

访问权限：

- `user:list`

### 13.2 筛选字段

| 字段 | 控件 | 说明 |
|---|---|---|
| `keyword` | 输入框 | 按用户名、显示名、GitHub 搜索。 |
| `status` | 下拉框 | 按用户状态筛选。 |
| `role` | 下拉框 | 按角色筛选。 |
| `skillDirection` | 下拉框/输入框 | 按技术方向筛选。 |

### 13.3 表格字段

| 列 | 说明 |
|---|---|
| 显示名 | 点击进入人员详情。 |
| 用户名 | 登录账号。 |
| 角色 | 用户拥有的角色。 |
| 技术方向 | 技术方向。 |
| GitHub | GitHub 用户名。 |
| 联系方式 | 邮箱或电话。 |
| 状态 | 用户状态。 |
| 操作 | `ADMIN` 显示编辑入口。 |

### 13.4 操作按钮

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 新增用户 | `user:create` | `ADMIN` |
| 编辑用户 | `user:update` | `ADMIN` |
| 禁用/启用用户 | `user:disable` | `ADMIN` |

## 14. 人员详情页面

### 14.1 页面信息

建议路由：`/users/:id`

兼容路由：`/members/:id`

访问权限：

- `user:list` 或 `user:view`

### 14.2 展示模块

- 基础资料。
- 角色信息。
- 参与项目。
- 负责任务。
- 最近动态。

### 14.3 基础资料字段

- 显示名。
- 用户名。
- 邮箱。
- 电话。
- GitHub。
- 技术方向。
- 技术水平。
- 状态。
- 创建时间。
- 最近登录时间。

### 14.4 参与项目字段

- 项目名称。
- 项目状态。
- 分配责任。
- 分配时间。

### 14.5 操作按钮

| 按钮 | 权限 code | 可见规则 |
|---|---|---|
| 编辑用户 | `user:update` | `ADMIN` |
| 禁用/启用用户 | `user:disable` | `ADMIN` |

## 15. 用户管理页面

### 15.1 页面信息

路由：`/admin/users`

页面目标：

- 管理可登录用户。
- 分配用户角色。
- 启用或禁用用户。

访问权限：

- `user:list`
- 默认仅 `ADMIN`。

### 15.2 用户表格字段

| 列 | 说明 |
|---|---|
| 用户名 | 登录账号。 |
| 显示名 | 页面展示名称。 |
| 角色 | 用户拥有的角色。 |
| 状态 | `ACTIVE` / `DISABLED`。 |
| 邮箱 | 邮箱。 |
| 最近登录 | 最近登录时间。 |
| 操作 | 编辑、启用、禁用。 |

### 15.3 新增/编辑用户表单字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `username` | 输入框 | 是 | 唯一、非空 | 登录账号。 |
| `password` | 输入框/密码框 | 新增必填 | 非空 | 明文密码。编辑时为空表示不修改。 |
| `displayName` | 输入框 | 是 | 非空 | 显示名。 |
| `roleIds` | 多选框/穿梭框 | 是 | 至少一个 | 用户角色。 |
| `status` | 下拉框 | 是 | 用户状态枚举 | 用户状态。 |
| `email` | 输入框 | 否 | 邮箱格式 | 邮箱。 |
| `phone` | 输入框 | 否 | 无 | 电话。 |
| `githubUsername` | 输入框 | 否 | 无 | GitHub 用户名。 |
| `skillDirection` | 输入框 | 否 | 无 | 技术方向。 |
| `skillLevel` | 输入框 | 否 | 无 | 技术水平。 |
| `remark` | 多行文本 | 否 | 无 | 备注。 |

### 15.4 交互规则

- 新增用户成功后刷新列表。
- 禁用用户需要确认弹窗。
- 禁用用户后该用户下次 token 校验失败。
- 用户不能删除，只能禁用。

## 16. 角色管理页面

### 16.1 页面信息

路由：`/admin/roles`

页面目标：

- 管理角色。
- 为角色分配菜单和权限项。

访问权限：

- `role:list`
- 默认仅 `ADMIN`。

### 16.2 角色表格字段

| 列 | 说明 |
|---|---|
| 角色名称 | 角色展示名。 |
| 角色编码 | 角色 code。 |
| 状态 | 启用或禁用。 |
| 描述 | 角色说明。 |
| 操作 | 编辑、授权、禁用。 |

### 16.3 角色表单字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `code` | 输入框 | 是 | 唯一、建议大写 | 角色编码。 |
| `name` | 输入框 | 是 | 非空 | 角色名称。 |
| `description` | 多行文本 | 否 | 无 | 角色说明。 |
| `status` | 下拉框 | 是 | 角色状态枚举 | 角色状态。 |

### 16.4 角色授权交互

- 点击“授权”打开权限树弹窗或进入授权页。
- 权限树支持勾选目录、菜单、权限项。
- 勾选菜单时，可展示该菜单。
- 勾选权限项时，可展示按钮并允许接口调用。
- 勾选目录或菜单时，默认级联勾选其所有子节点。
- 勾选权限项时，自动勾选其祖先菜单和目录，避免出现“有按钮权限但没有页面菜单”的孤立状态。
- 取消勾选目录或菜单时，默认取消其所有子节点。
- 当部分子节点被选中时，父节点展示半选状态。
- 授权数据来自后端权限树接口，不允许在角色表单内写死菜单树。
- 保存后更新 `role_permission_nodes`。

## 17. 权限配置页面

### 17.1 页面信息

路由：`/admin/permissions`

页面目标：

- 维护权限树。
- 管理目录、菜单和权限项。

访问权限：

- `permission-node:list`
- 默认仅 `ADMIN`。

### 17.2 页面结构

- 左侧权限树。
- 右侧节点详情。
- 节点新增/编辑表单。

### 17.3 节点表单字段

| 字段 | 控件 | 必填 | 校验 | 说明 |
|---|---|---:|---|---|
| `parentId` | 树选择 | 否 | 节点层级规则 | 父节点。 |
| `nodeType` | 单选/下拉 | 是 | `DIRECTORY` / `MENU` / `PERMISSION` | 节点类型。 |
| `name` | 输入框 | 是 | 非空 | 节点展示名。 |
| `code` | 输入框 | 是 | 全局唯一 | 权限编码。新建和编辑时必须检查重复 code。 |
| `routePath` | 输入框 | 目录/菜单按需 | 路由片段 | 目录和菜单使用，权限项为空。 |
| `operationLevel` | 下拉框 | 是 | `GET` / `POST` / `BOTH` | 操作级别。 |
| `sortOrder` | 数字输入 | 是 | 整数 | 排序。 |
| `icon` | 输入框/图标选择 | 否 | 无 | 菜单图标。 |
| `status` | 下拉框 | 是 | 状态枚举 | 节点状态。 |

### 17.4 routePath 规则

- `DIRECTORY.routePath` 是路由分组片段，可以为空。
- `MENU.routePath` 是页面路由片段，必须填写。
- `PERMISSION.routePath` 为空。
- 最终页面路由由祖先目录和菜单片段拼接。
- 示例：目录 `business-admin` + 菜单 `project` = `/business-admin/project`。

### 17.5 scope 与 code 规则

- scope 来自菜单节点，用于前端按页面获取权限集合。
- code 是全局唯一权限编码，不能因为 scope 不同而重复。
- 新建权限节点时，前端先调用重复校验或在提交后处理 409；后端必须做最终唯一性校验。
- 页面按钮使用 `useMenuPerm(scope)` 获取当前菜单权限集合，再用唯一 code 判断，例如 `{perms.has("project:create") && <Button>新建</Button>}`。
- 菜单节点的 scope 建议直接使用菜单 code，例如 `project`、`requirement`。
- 权限项必须挂在菜单节点下，不能挂在目录节点下。
- 权限项可以继承最近祖先菜单的 scope，但自身 code 必须仍是全局唯一。

### 17.6 节点创建规则

- 目录下可以创建子目录和菜单。
- 菜单下只能创建权限项。
- 权限项下不能创建子节点。
- 删除节点前需要确认。
- 有子节点的目录或菜单不能直接删除，需先处理子节点。

## 18. 项目分配页面

### 18.1 页面信息

路由：`/admin/project-assignments`

页面目标：

- 管理项目和用户的分配关系。
- 让 `CONTRIBUTOR` 获得项目需求池贡献权限。

访问权限：

- `project-user:list`
- 默认仅 `ADMIN`。

### 18.2 页面结构

- 项目列表或项目选择器。
- 已分配用户表格。
- 添加用户表单。

### 18.3 筛选字段

| 字段 | 控件 | 说明 |
|---|---|---|
| `projectId` | 项目下拉 | 选择项目。 |
| `keyword` | 输入框 | 搜索用户。 |
| `status` | 下拉框 | 分配状态。 |

### 18.4 分配表格字段

| 列 | 说明 |
|---|---|
| 用户显示名 | 被分配用户。 |
| 用户名 | 登录账号。 |
| 角色 | 用户角色。 |
| 责任 | 项目责任说明。 |
| 状态 | 分配状态。 |
| 分配时间 | 分配创建时间。 |
| 操作 | 移除。 |

### 18.5 添加分配表单字段

| 字段 | 控件 | 必填 | 说明 |
|---|---|---:|---|
| `projectId` | 项目下拉 | 是 | 目标项目。 |
| `userId` | 用户下拉 | 是 | 被分配用户。 |
| `responsibility` | 输入框 | 否 | 责任说明。 |

### 18.6 交互规则

- 同一用户不能重复分配到同一项目。
- 移除分配需要确认。
- 移除后用户失去该项目需求池新增、编辑、删除、认领权限。
- 用户分配变化后，项目详情页重新获取 `currentUserProjectAccess`，并立即更新需求池按钮状态。

## 19. 审计日志页面

### 19.1 页面信息

路由：`/audit-logs`

页面目标：

- 查看系统关键操作记录。

访问权限：

- `audit-log:list`
- 默认仅 `ADMIN`。

### 19.2 筛选字段

| 字段 | 控件 | 说明 |
|---|---|---|
| `actorName` | 输入框 | 按操作人搜索。 |
| `action` | 下拉框 | 按动作筛选。 |
| `targetType` | 下拉框 | 按对象类型筛选。 |
| `projectId` | 项目下拉 | 按项目筛选。 |
| `dateRange` | 日期范围 | 按时间筛选。 |

### 19.3 表格字段

| 列 | 说明 |
|---|---|
| 时间 | 操作发生时间。 |
| 操作人 | actorName。 |
| 动作 | action。 |
| 对象类型 | targetType。 |
| 对象 ID | targetId。 |
| 项目 | projectId 对应项目。 |
| 说明 | description。 |

### 19.4 交互规则

- 点击记录可展开查看 `beforeData` 和 `afterData`。
- 默认按时间倒序。
- 支持分页。

## 20. 全局状态与反馈

### 20.1 加载状态

- 页面首次加载展示骨架屏或加载占位。
- 表格加载时保留表头，内容区展示 loading。
- 表单提交时禁用提交按钮。

### 20.2 空状态

- 列表无数据时展示空状态。
- 空状态文案需要说明下一步动作。
- 如果用户无权限新增，只展示只读空状态。

### 20.3 错误状态

- 接口 401：清理 token 并跳转 `/login`。
- 接口 403：展示无权限提示。
- 接口 404：展示资源不存在。
- 表单校验错误展示在字段下方。
- 系统错误展示统一 toast 或页面错误块。

### 20.4 权限状态

- 没有菜单权限时不展示菜单。
- 没有按钮权限时默认不展示按钮。
- 用户直接输入无权限路由时展示 403 页面。
- 后端返回 403 时前端不得继续重试写操作。

## 21. 权限 scope 与 code 映射

| 页面/操作 | scope | 全局唯一 code |
|---|---|---|
| Dashboard | `dashboard` | `dashboard:view` |
| 项目列表 | `project` | `project:list` |
| 项目详情 | `project` | `project:view` |
| 新增项目 | `project` | `project:create` |
| 编辑项目 | `project` | `project:update` |
| 更新项目状态 | `project` | `project:update-status` |
| 更新项目进度 | `project` | `project:update-progress` |
| 项目用户列表 | `project-user` | `project-user:list` |
| 分配项目用户 | `project-user` | `project-user:assign` |
| 移除项目用户 | `project-user` | `project-user:remove` |
| 需求列表 | `requirement` | `requirement:list` |
| 新增需求 | `requirement` | `requirement:create` |
| 编辑自己的需求 | `requirement` | `requirement:update-own` |
| 删除自己的需求 | `requirement` | `requirement:delete-own` |
| 认领需求 | `requirement` | `requirement:claim` |
| 管理员编辑需求 | `requirement` | `requirement:admin-update` |
| 管理员删除需求 | `requirement` | `requirement:admin-delete` |
| 任务列表 | `task` | `task:list` |
| 任务详情 | `task` | `task:view` |
| 新增任务 | `task` | `task:create` |
| 编辑任务 | `task` | `task:update` |
| 更新任务状态 | `task` | `task:update-status` |
| 更新任务进度 | `task` | `task:update-progress` |
| 提交任务结果 | `task` | `task:submit` |
| 用户列表 | `user` | `user:list` |
| 新增用户 | `user` | `user:create` |
| 编辑用户 | `user` | `user:update` |
| 禁用用户 | `user` | `user:disable` |
| 角色列表 | `role` | `role:list` |
| 新增角色 | `role` | `role:create` |
| 编辑角色 | `role` | `role:update` |
| 权限树列表 | `permission-node` | `permission-node:list` |
| 新增权限节点 | `permission-node` | `permission-node:create` |
| 编辑权限节点 | `permission-node` | `permission-node:update` |
| 删除权限节点 | `permission-node` | `permission-node:delete` |
| 角色授权 | `role-permission` | `role-permission:update` |
| 审计日志 | `audit-log` | `audit-log:list` |

## 22. 验收标准

- 未登录访问任意站内页面会跳转 `/login`。
- 登录成功后根据 `/auth/me` 渲染菜单。
- 侧栏菜单支持展开和收起。
- `ADMIN` 可以看到管理分区。
- `CONTRIBUTOR` 看不到用户管理、角色管理、权限配置、项目分配和审计日志入口。
- Dashboard 只展示四个资源卡片、最近项目动态、人员更新。
- Dashboard 不展示平均进度和最近操作记录表格。
- 项目详情页使用 tabs 分层展示。
- `CONTRIBUTOR` 可以查看所有项目详情。
- `CONTRIBUTOR` 被分配项目后，只能操作该项目需求池。
- `CONTRIBUTOR` 未被分配项目时，即使拥有需求权限 code，也看不到该项目需求新增、编辑、删除、认领按钮。
- `CONTRIBUTOR` 只能编辑、删除自己创建、未被认领且状态为 `OPEN` 的需求。
- `CONTRIBUTOR` 不能编辑、删除其他人创建的需求。
- `CONTRIBUTOR` 不能编辑项目进度。
- `CONTRIBUTOR` 不能编辑任务。
- 已认领需求对普通用户锁定。
- `ADMIN` 可以强制编辑、删除已认领需求。
- 按钮展示受权限 code 控制。
- 直接访问无权限页面展示 403。
