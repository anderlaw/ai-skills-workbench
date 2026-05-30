# 搭子工坊 MVP 需求文档 v0.2

## 1. 项目定位

搭子工坊是一个面向社群共同开发项目的轻量级协作工作台，用于记录多个开发项目的基本信息、参与成员、任务进展和关键操作记录。

系统不做复杂项目管理，也不做完整协作平台，核心目标是：

> 能录入项目、维护项目进度、记录参与成员、拆分简单任务，并保留基础审计记录，方便后续追踪项目过程。

---

## 2. MVP 核心功能

MVP 包含 4 个核心模块：

1. 项目管理
2. 成员管理
3. 任务管理
4. 统计看板

另外需要保留基础操作记录，用于审计。

---

## 3. 不做范围

MVP 暂不做：

* 复杂权限系统
* 在线聊天
* 群组管理
* 自动 GitHub 权限分配
* 自动验收代码
* 费用管理
* 课程系统
* 支付系统
* 多级组织架构
* 复杂审批流
* 甘特图
* 工时系统

---

# 4. 项目管理

## 4.1 功能说明

项目管理用于记录每个开发项目的基础信息、技术栈、参与人员、发布地址和整体进度。

## 4.2 项目字段

| 字段        | 说明                                 |
| --------- | ---------------------------------- |
| 项目名称      | 项目的名称                              |
| 项目简介      | 说明项目是做什么的                          |
| 项目类型      | AI 应用、全栈项目、工具项目、网站项目等              |
| 技术栈       | React、FastAPI、PostgreSQL、Node.js 等 |
| 功能要点      | 项目的核心功能点                           |
| GitHub 地址 | 项目代码仓库                             |
| 发布地址      | 项目上线访问地址                           |
| 项目状态      | 当前项目阶段                             |
| 进度百分比     | 0 - 100                            |
| 当前进展      | 当前做到哪一步                            |
| 当前问题      | 当前阻塞点                              |
| 下一步计划     | 后续准备做什么                            |
| 开始时间      | 项目开始时间                             |
| 预计完成时间    | 预计完成日期                             |
| 实际完成时间    | 实际完成日期                             |
| 备注        | 其他说明                               |

## 4.3 项目状态

```text
PLANNING：规划中
DEVELOPING：开发中
TESTING：测试中
DEPLOYED：已发布
DONE：完成
PAUSED：暂停
ARCHIVED：归档
```

## 4.4 项目功能

项目负责人可以：

* 新增项目
* 编辑项目
* 查看项目列表
* 查看项目详情
* 修改项目状态
* 修改项目进度
* 记录当前问题
* 记录下一步计划
* 查看项目下的成员
* 查看项目下的任务

---

# 5. 成员管理

## 5.1 功能说明

成员管理用于记录参与项目开发的人。

这里不做复杂用户体系，MVP 只需要知道：

> 谁参与了项目、负责什么方向、当前状态如何。

## 5.2 成员字段

| 字段         | 说明              |
| ---------- | --------------- |
| 姓名 / 昵称    | 成员名称            |
| 联系方式       | 微信、邮箱等          |
| GitHub 用户名 | 用于关联代码提交        |
| 技术方向       | 前端、后端、AI、测试、部署等 |
| 技术水平       | 初级、中级、高级，可选     |
| 状态         | 是否活跃            |
| 备注         | 补充说明            |

## 5.3 成员状态

```text
ACTIVE：活跃
INACTIVE：不活跃
PAUSED：暂停参与
LEFT：已退出
```

## 5.4 成员功能

项目负责人可以：

* 新增成员
* 编辑成员信息
* 查看成员列表
* 查看成员参与的项目
* 查看成员负责的任务
* 修改成员状态

---

# 6. 项目成员关系

## 6.1 功能说明

一个项目可以有多个成员，一个成员也可以参与多个项目。

因此需要记录项目和成员之间的关系。

## 6.2 字段

| 字段    | 说明         |
| ----- | ---------- |
| 项目 ID | 所属项目       |
| 成员 ID | 参与成员       |
| 项目角色  | 该成员在项目中的角色 |
| 负责内容  | 该成员主要负责什么  |
| 加入时间  | 加入项目时间     |
| 退出时间  | 退出项目时间，可选  |
| 状态    | 是否仍在参与     |

## 6.3 项目角色

```text
OWNER：负责人
FRONTEND：前端
BACKEND：后端
FULLSTACK：全栈
AI：AI 开发
TEST：测试
DEPLOY：部署
OTHER：其他
```

## 6.4 验收标准

* 一个项目可以添加多个成员
* 一个成员可以参与多个项目
* 可以查看项目下有哪些成员
* 可以查看成员参与了哪些项目
* 可以记录成员在项目中的职责

---

# 7. 任务管理

## 7.1 功能说明

任务管理用于记录项目中的具体开发事项。

MVP 阶段不做复杂任务协作，只做简单任务台账：

> 任务是什么、谁负责、当前状态、提交了什么、是否完成。

## 7.2 任务字段

| 字段              | 说明                 |
| --------------- | ------------------ |
| 项目 ID           | 所属项目               |
| 任务标题            | 任务名称               |
| 任务说明            | 具体要做什么             |
| 任务类型            | 前端、后端、AI、部署、测试、文档等 |
| 负责人             | 对应成员               |
| 优先级             | 低、中、高              |
| 状态              | 当前任务状态             |
| 进度百分比           | 0 - 100            |
| GitHub Issue 地址 | 可选                 |
| PR 地址           | 可选                 |
| 提交说明            | 成员提交的说明            |
| 当前问题            | 当前任务阻塞点            |
| 截止时间            | 预计完成时间             |
| 完成时间            | 实际完成时间             |
| 备注              | 补充说明               |

## 7.3 任务类型

```text
FRONTEND：前端
BACKEND：后端
AI：AI 功能
DATABASE：数据库
DEPLOY：部署
TEST：测试
DOC：文档
OTHER：其他
```

## 7.4 任务状态

```text
TODO：待处理
IN_PROGRESS：进行中
BLOCKED：阻塞
SUBMITTED：已提交
REVIEWING：检查中
DONE：完成
CANCELLED：取消
```

## 7.5 任务功能

项目负责人可以：

* 给项目创建任务
* 给任务分配负责人
* 修改任务状态
* 修改任务进度
* 查看任务列表
* 查看任务详情
* 查看某个项目下的全部任务
* 查看某个成员负责的全部任务

成员可以：

* 查看自己负责的任务
* 修改任务进度
* 填写提交说明
* 填写 PR 地址
* 标记任务为已提交

## 7.6 任务审计要求

任务状态变化需要记录：

* 谁修改的
* 修改前状态
* 修改后状态
* 修改时间
* 修改说明

---

# 8. 操作记录 / 审计日志

## 8.1 功能说明

为了后续审计，需要记录关键操作。

不需要做复杂日志系统，但至少需要记录项目、成员、任务的关键变更。

## 8.2 需要记录的操作

项目相关：

* 新增项目
* 修改项目信息
* 修改项目状态
* 修改项目进度
* 归档项目

成员相关：

* 新增成员
* 修改成员信息
* 修改成员状态
* 将成员加入项目
* 将成员移出项目

任务相关：

* 新增任务
* 修改任务信息
* 修改任务负责人
* 修改任务状态
* 修改任务进度
* 提交任务结果
* 填写 PR 地址

## 8.3 审计日志字段

| 字段    | 说明                                       |
| ----- | ---------------------------------------- |
| 操作人   | 谁做的操作                                    |
| 操作类型  | create / update / delete / status_change |
| 对象类型  | project / member / task                  |
| 对象 ID | 被操作对象                                    |
| 操作前数据 | 修改前内容，可用 JSON                            |
| 操作后数据 | 修改后内容，可用 JSON                            |
| 操作说明  | 补充说明                                     |
| 操作时间  | 创建时间                                     |

---

# 9. 统计看板

## 9.1 功能说明

统计看板用于查看所有项目的整体情况。

## 9.2 核心指标

| 指标     | 说明                     |
| ------ | ---------------------- |
| 项目总数   | 当前项目数量                 |
| 开发中项目数 | 状态为 DEVELOPING         |
| 已发布项目数 | 状态为 DEPLOYED           |
| 已完成项目数 | 状态为 DONE               |
| 暂停项目数  | 状态为 PAUSED             |
| 成员总数   | 当前录入成员数量               |
| 活跃成员数  | 状态为 ACTIVE             |
| 任务总数   | 当前任务数量                 |
| 进行中任务数 | 状态为 IN_PROGRESS        |
| 阻塞任务数  | 状态为 BLOCKED            |
| 已完成任务数 | 状态为 DONE               |
| 待提交任务数 | 状态为 TODO / IN_PROGRESS |
| 平均项目进度 | 所有项目 progress 平均值      |

## 9.3 看板展示内容

首页建议展示：

1. 项目统计卡片
2. 成员统计卡片
3. 任务统计卡片
4. 项目状态分布
5. 任务状态分布
6. 最近更新项目
7. 阻塞任务列表
8. 待提交任务列表
9. 最近操作记录

---

# 10. 页面需求

## 10.1 页面列表

MVP 需要以下页面：

```text
/dashboard              统计首页
/projects               项目列表
/projects/new           新增项目
/projects/:id           项目详情
/projects/:id/edit      编辑项目

/members                成员列表
/members/new            新增成员
/members/:id            成员详情
/members/:id/edit       编辑成员

/tasks                  任务列表
/tasks/new              新增任务
/tasks/:id              任务详情
/tasks/:id/edit         编辑任务

/audit-logs             操作记录
```

---

# 11. 数据库设计

MVP 建议使用 5 张核心表：

1. projects
2. members
3. project_members
4. tasks
5. audit_logs

---

## 11.1 projects 表

| 字段                   | 类型            | 说明        |
| -------------------- | ------------- | --------- |
| id                   | bigint / uuid | 项目 ID     |
| name                 | varchar       | 项目名称      |
| description          | text          | 项目简介      |
| project_type         | varchar       | 项目类型      |
| tech_stack           | jsonb         | 技术栈       |
| feature_points       | text          | 功能要点      |
| github_url           | varchar       | GitHub 地址 |
| deploy_url           | varchar       | 发布地址      |
| status               | varchar       | 项目状态      |
| progress             | int           | 进度百分比     |
| current_progress     | text          | 当前进展      |
| current_issues       | text          | 当前问题      |
| next_steps           | text          | 下一步计划     |
| start_date           | date          | 开始时间      |
| expected_finish_date | date          | 预计完成时间    |
| actual_finish_date   | date          | 实际完成时间    |
| remark               | text          | 备注        |
| created_at           | datetime      | 创建时间      |
| updated_at           | datetime      | 更新时间      |

---

## 11.2 members 表

| 字段              | 类型            | 说明         |
| --------------- | ------------- | ---------- |
| id              | bigint / uuid | 成员 ID      |
| name            | varchar       | 姓名 / 昵称    |
| contact         | varchar       | 联系方式       |
| github_username | varchar       | GitHub 用户名 |
| email           | varchar       | 邮箱         |
| skill_direction | varchar       | 技术方向       |
| skill_level     | varchar       | 技术水平       |
| status          | varchar       | 成员状态       |
| remark          | text          | 备注         |
| created_at      | datetime      | 创建时间       |
| updated_at      | datetime      | 更新时间       |

---

## 11.3 project_members 表

| 字段             | 类型            | 说明    |
| -------------- | ------------- | ----- |
| id             | bigint / uuid | 记录 ID |
| project_id     | bigint / uuid | 项目 ID |
| member_id      | bigint / uuid | 成员 ID |
| role           | varchar       | 项目角色  |
| responsibility | text          | 负责内容  |
| joined_at      | datetime      | 加入时间  |
| left_at        | datetime      | 退出时间  |
| status         | varchar       | 状态    |
| created_at     | datetime      | 创建时间  |
| updated_at     | datetime      | 更新时间  |

---

## 11.4 tasks 表

| 字段               | 类型            | 说明              |
| ---------------- | ------------- | --------------- |
| id               | bigint / uuid | 任务 ID           |
| project_id       | bigint / uuid | 项目 ID           |
| assignee_id      | bigint / uuid | 负责人 ID          |
| title            | varchar       | 任务标题            |
| description      | text          | 任务说明            |
| task_type        | varchar       | 任务类型            |
| priority         | varchar       | 优先级             |
| status           | varchar       | 任务状态            |
| progress         | int           | 进度百分比           |
| github_issue_url | varchar       | GitHub Issue 地址 |
| pr_url           | varchar       | PR 地址           |
| submission_note  | text          | 提交说明            |
| current_issues   | text          | 当前问题            |
| due_date         | date          | 截止时间            |
| completed_at     | datetime      | 完成时间            |
| remark           | text          | 备注              |
| created_at       | datetime      | 创建时间            |
| updated_at       | datetime      | 更新时间            |

---

## 11.5 audit_logs 表

| 字段          | 类型            | 说明        |
| ----------- | ------------- | --------- |
| id          | bigint / uuid | 日志 ID     |
| actor_name  | varchar       | 操作人名称     |
| actor_id    | bigint / uuid | 操作人 ID，可选 |
| action      | varchar       | 操作类型      |
| target_type | varchar       | 对象类型      |
| target_id   | bigint / uuid | 对象 ID     |
| before_data | jsonb         | 修改前数据     |
| after_data  | jsonb         | 修改后数据     |
| description | text          | 操作说明      |
| created_at  | datetime      | 操作时间      |

---

# 12. API 需求

## 12.1 项目接口

```http
GET /api/v1/projects
POST /api/v1/projects
GET /api/v1/projects/{id}
PUT /api/v1/projects/{id}
PATCH /api/v1/projects/{id}/progress
PATCH /api/v1/projects/{id}/status
```

---

## 12.2 成员接口

```http
GET /api/v1/members
POST /api/v1/members
GET /api/v1/members/{id}
PUT /api/v1/members/{id}
PATCH /api/v1/members/{id}/status
```

---

## 12.3 项目成员接口

```http
GET /api/v1/projects/{project_id}/members
POST /api/v1/projects/{project_id}/members
DELETE /api/v1/projects/{project_id}/members/{member_id}
```

---

## 12.4 任务接口

```http
GET /api/v1/tasks
POST /api/v1/tasks
GET /api/v1/tasks/{id}
PUT /api/v1/tasks/{id}
PATCH /api/v1/tasks/{id}/progress
PATCH /api/v1/tasks/{id}/status
PATCH /api/v1/tasks/{id}/submit
```

---

## 12.5 统计接口

```http
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/project-status
GET /api/v1/dashboard/task-status
GET /api/v1/dashboard/recent-projects
GET /api/v1/dashboard/blocked-tasks
GET /api/v1/dashboard/recent-audit-logs
```

---

## 12.6 审计日志接口

```http
GET /api/v1/audit-logs
GET /api/v1/audit-logs/{id}
```

---

# 13. 前端页面结构建议

```text
src/
  pages/
    dashboard/
      DashboardPage.tsx

    projects/
      ProjectListPage.tsx
      ProjectDetailPage.tsx
      ProjectFormPage.tsx

    members/
      MemberListPage.tsx
      MemberDetailPage.tsx
      MemberFormPage.tsx

    tasks/
      TaskListPage.tsx
      TaskDetailPage.tsx
      TaskFormPage.tsx

    audit-logs/
      AuditLogListPage.tsx

  components/
    ProjectStatusBadge.tsx
    TaskStatusBadge.tsx
    ProgressBar.tsx
    StatCard.tsx

  api/
    projectApi.ts
    memberApi.ts
    taskApi.ts
    dashboardApi.ts
    auditLogApi.ts

  types/
    project.ts
    member.ts
    task.ts
    auditLog.ts
```

---

# 14. 后端模块结构建议

```text
app/
  api/
    routes/
      projects.py
      members.py
      tasks.py
      dashboard.py
      audit_logs.py

  models/
    project.py
    member.py
    project_member.py
    task.py
    audit_log.py

  schemas/
    project.py
    member.py
    task.py
    dashboard.py
    audit_log.py

  services/
    project_service.py
    member_service.py
    task_service.py
    dashboard_service.py
    audit_log_service.py

  db/
    session.py
    base.py
```

---

# 15. 最小开发顺序

## 第一阶段：项目台账

目标：能录入项目、查看项目、修改项目进度。

开发内容：

1. projects 表
2. 项目 CRUD 接口
3. 项目列表页
4. 项目详情页
5. 项目表单页
6. 修改项目状态和进度

---

## 第二阶段：成员管理

目标：能记录参与人员，并关联到项目。

开发内容：

1. members 表
2. project_members 表
3. 成员 CRUD 接口
4. 成员列表页
5. 成员详情页
6. 项目详情页展示参与成员
7. 给项目添加成员

---

## 第三阶段：任务管理

目标：能给项目创建任务，并分配给成员。

开发内容：

1. tasks 表
2. 任务 CRUD 接口
3. 任务列表页
4. 任务详情页
5. 给任务分配负责人
6. 修改任务状态和进度
7. 任务提交 PR 地址和说明

---

## 第四阶段：审计日志

目标：能追踪关键操作。

开发内容：

1. audit_logs 表
2. 记录项目变更日志
3. 记录成员变更日志
4. 记录任务变更日志
5. 操作记录列表页

---

## 第五阶段：统计首页

目标：能查看整体项目情况。

开发内容：

1. 项目数量统计
2. 成员数量统计
3. 任务数量统计
4. 项目状态分布
5. 任务状态分布
6. 阻塞任务列表
7. 最近操作记录

---

# 16. MVP 验收标准

MVP 完成后，需要满足以下标准：

1. 可以新增、编辑、查看项目。
2. 可以修改项目状态和进度。
3. 可以新增、编辑、查看成员。
4. 可以把成员加入项目。
5. 可以查看项目参与人员。
6. 可以给项目创建任务。
7. 可以把任务分配给成员。
8. 可以修改任务状态和进度。
9. 可以提交任务结果、PR 地址和说明。
10. 可以查看项目下的任务。
11. 可以查看成员负责的任务。
12. 可以记录关键操作日志。
13. 可以查看最近操作记录。
14. 可以统计项目、成员、任务的基本数据。
15. 可以看到阻塞任务和最近更新项目。

---

# 17. 当前最小闭环

第一版最小闭环如下：

```text
新增成员
  ↓
新增项目
  ↓
把成员加入项目
  ↓
给项目创建任务
  ↓
把任务分配给成员
  ↓
成员更新任务进度
  ↓
成员提交 PR 地址 / 说明
  ↓
项目负责人更新项目进度
  ↓
系统记录操作日志
  ↓
统计首页展示整体情况
```

---

# 18. 设计原则

MVP 阶段保持简单，但不能丢审计能力。

核心原则：

1. 项目是主线。
2. 成员是参与人。
3. 任务是可追踪事项。
4. 审计日志记录关键变化。
5. 不做复杂协作，但要能追溯责任。
6. 不做复杂权限，但要记录操作人。
7. 不做复杂验收，但任务提交和状态变化必须可查。

这样就比较合理了：
**不是复杂管理平台，但也不是单表玩具系统。**

我建议你最终就按这 5 张表开始：

```text
projects
members
project_members
tasks
audit_logs
```

这已经能满足你说的“后续可审计”，而且不会把 MVP 搞得太重。
