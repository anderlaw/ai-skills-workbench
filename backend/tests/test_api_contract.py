from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def login(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["accessToken"]


def auth_headers(client: TestClient) -> dict[str, str]:
    return {"Authorization": f"Bearer {login(client)}"}


def test_business_reads_and_writes_require_login(client):
    response = client.get("/api/v1/projects")

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"

    for path in ["/api/v1/members", "/api/v1/tasks", "/api/v1/dashboard/summary", "/api/v1/audit-logs"]:
        read_response = client.get(path)
        assert read_response.status_code == 401, path
        assert read_response.json()["code"] == "UNAUTHORIZED"

    write_response = client.post("/api/v1/projects", json={"name": "未授权项目"})

    assert write_response.status_code == 401
    assert write_response.json()["code"] == "UNAUTHORIZED"

    assert client.get("/api/v1/projects", headers=auth_headers(client)).status_code == 200


def test_project_member_task_audit_dashboard_flow(client):
    headers = auth_headers(client)
    user_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "username": "zhangsan",
            "password": "zhangsan-pass",
            "displayName": "张三",
            "roleCodes": ["CONTRIBUTOR"],
            "status": "ACTIVE",
        },
    )
    assert user_response.status_code == 201
    user = user_response.json()

    member_response = client.post(
        "/api/v1/members",
        headers=headers,
        json={
            "userId": user["id"],
            "name": "张三",
            "contact": "wechat-zhangsan",
            "githubUsername": "zhangsan",
            "email": "zhangsan@example.com",
            "skillDirection": "后端",
            "skillLevel": "中级",
            "status": "ACTIVE",
            "remark": "MVP 开发",
        },
    )
    assert member_response.status_code == 201
    member = member_response.json()

    project_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": "AI 项目跟踪系统",
            "description": "记录项目、成员和任务进展",
            "projectType": "全栈项目",
            "techStack": ["React", "FastAPI", "PostgreSQL"],
            "featurePoints": "项目、成员、任务、审计、看板",
            "githubUrl": "https://github.com/example/project-tracker",
            "deployUrl": "",
            "status": "DEVELOPING",
            "progress": 20,
            "currentProgress": "完成需求设计",
            "currentIssues": "",
            "nextSteps": "实现 MVP",
            "startDate": date.today().isoformat(),
            "expectedFinishDate": date.today().isoformat(),
            "actualFinishDate": None,
            "remark": "",
        },
    )
    assert project_response.status_code == 201
    project = project_response.json()
    assert project["name"] == "AI 项目跟踪系统"
    assert project["techStack"] == ["React", "FastAPI", "PostgreSQL"]

    relation_response = client.post(
        f"/api/v1/projects/{project['id']}/members",
        headers=headers,
        json={
            "memberId": member["id"],
            "role": "BACKEND",
            "responsibility": "后端 API 和数据库",
            "status": "ACTIVE",
        },
    )
    assert relation_response.status_code == 201

    task_response = client.post(
        "/api/v1/tasks",
        headers=headers,
        json={
            "projectId": project["id"],
            "assigneeId": member["id"],
            "title": "实现项目 CRUD",
            "description": "完成项目接口和页面",
            "taskType": "BACKEND",
            "priority": "HIGH",
            "status": "TODO",
            "progress": 0,
            "githubIssueUrl": "",
            "prUrl": "",
            "submissionNote": "",
            "currentIssues": "",
            "dueDate": date.today().isoformat(),
            "completedAt": None,
            "remark": "",
        },
    )
    assert task_response.status_code == 201
    task = task_response.json()

    submit_response = client.patch(
        f"/api/v1/tasks/{task['id']}/submit",
        headers=headers,
        json={
            "prUrl": "https://github.com/example/project-tracker/pull/1",
            "submissionNote": "已提交 CRUD 初版",
        },
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["status"] == "SUBMITTED"

    progress_response = client.patch(
        f"/api/v1/projects/{project['id']}/progress",
        headers=headers,
        json={"progress": 60, "currentProgress": "接口和页面联调中"},
    )
    assert progress_response.status_code == 200
    assert progress_response.json()["progress"] == 60

    project_members = client.get(f"/api/v1/projects/{project['id']}/members", headers=headers).json()
    assert project_members["total"] == 1
    assert project_members["items"][0]["member"]["name"] == "张三"

    member_tasks = client.get(f"/api/v1/tasks?assigneeId={member['id']}", headers=headers).json()
    assert member_tasks["total"] == 1
    assert member_tasks["items"][0]["title"] == "实现项目 CRUD"

    dashboard = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert dashboard["projectTotal"] == 1
    assert dashboard["memberTotal"] == 1
    assert dashboard["taskTotal"] == 1
    assert dashboard["requirementTotal"] == 0
    assert dashboard["submittedTaskTotal"] == 1

    audit_logs = client.get("/api/v1/audit-logs", headers=headers).json()
    actions = [item["action"] for item in audit_logs["items"]]
    assert "CREATE" in actions
    assert "SUBMIT" in actions
    assert "PROGRESS_CHANGE" in actions


def test_progress_must_be_between_zero_and_one_hundred(client):
    headers = auth_headers(client)

    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "非法进度项目", "progress": 101},
    )

    assert response.status_code == 422
