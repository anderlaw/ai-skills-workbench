import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def login(client: TestClient, username: str = "admin", password: str = "secret") -> str:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["accessToken"]


def auth_headers(client: TestClient, username: str = "admin", password: str = "secret") -> dict[str, str]:
    return {"Authorization": f"Bearer {login(client, username, password)}"}


def test_auth_me_returns_roles_menu_tree_and_permission_scopes(client):
    response = client.get("/api/v1/auth/me", headers=auth_headers(client))

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["username"] == "admin"
    assert body["user"]["status"] == "ACTIVE"
    assert body["roles"][0]["code"] == "ADMIN"
    assert isinstance(body["menuTree"], list)
    assert "project" in body["permissionScopes"]
    assert "project:create" in body["permissionScopes"]["project"]
    assert "member:create" in body["permissionScopes"]["member"]
    assert "task:create" in body["permissionScopes"]["task"]
    assert "role" in body["permissionScopes"]
    assert "role:update-permissions" in body["permissionScopes"]["role"]
    assert "permission-node" in body["permissionScopes"]
    assert "project-assignment" in body["permissionScopes"]
    assert "user:assign-roles" in body["permissionScopes"]["user"]


def test_contributor_menu_has_people_directory_but_not_admin_menus(client):
    admin_headers = auth_headers(client)
    create_contributor(client, admin_headers, "alice", "alice-pass")

    response = client.get("/api/v1/auth/me", headers=auth_headers(client, "alice", "alice-pass"))

    assert response.status_code == 200
    scopes = response.json()["permissionScopes"]
    assert "member" in scopes
    assert "member:list" in scopes["member"]
    assert "member:create" not in scopes["member"]
    assert "task:create" not in scopes["task"]
    assert "user" not in scopes
    assert "audit-log" not in scopes


def test_business_reads_require_login(client):
    response = client.get("/api/v1/projects")

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_contributor_without_project_assignment_cannot_create_requirement(client):
    admin_headers = auth_headers(client)
    user_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "username": "alice",
            "password": "alice-pass",
            "displayName": "Alice",
            "roleCodes": ["CONTRIBUTOR"],
            "status": "ACTIVE",
        },
    )
    assert user_response.status_code == 201
    project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={"name": "项目 A", "status": "DEVELOPING"},
    )
    assert project_response.status_code == 201

    response = client.post(
        f"/api/v1/projects/{project_response.json()['id']}/requirements",
        headers=auth_headers(client, "alice", "alice-pass"),
        json={"title": "新增需求", "priority": "MEDIUM"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "PROJECT_ASSIGNMENT_REQUIRED"


def test_permission_node_code_must_be_globally_unique(client):
    headers = auth_headers(client)
    payload = {
        "parentId": None,
        "nodeType": "DIRECTORY",
        "name": "重复目录",
        "code": "project",
        "routePath": "duplicated-project",
        "operationLevel": "GET",
        "sortOrder": 99,
        "status": "ACTIVE",
    }

    response = client.post("/api/v1/permission-nodes", headers=headers, json=payload)

    assert response.status_code == 409
    assert response.json()["code"] == "PERMISSION_NODE_CODE_EXISTS"


def test_permission_node_create_generates_audit_log(client):
    headers = auth_headers(client)
    tree_response = client.get("/api/v1/permission-nodes/tree", headers=headers)
    nodes = flatten_nodes(tree_response.json()["items"])
    dashboard_menu = next(node for node in nodes if node["code"] == "dashboard")

    create_response = client.post(
        "/api/v1/permission-nodes",
        headers=headers,
        json={
            "parentId": dashboard_menu["id"],
            "nodeType": "PERMISSION",
            "name": "测试权限",
            "code": "dashboard:test-permission",
            "operationLevel": "POST",
            "sortOrder": 99,
            "status": "ACTIVE",
        },
    )

    assert create_response.status_code == 201
    logs_response = client.get("/api/v1/audit-logs", headers=headers)
    assert any(
        item["targetType"] == "PERMISSION_NODE" and item["targetId"] == create_response.json()["id"]
        for item in logs_response.json()["items"]
    )


def test_admin_can_list_users_but_contributor_cannot(client):
    admin_headers = auth_headers(client)
    create_contributor(client, admin_headers, "alice", "alice-pass")

    admin_response = client.get("/api/v1/users", headers=admin_headers)
    assert admin_response.status_code == 200
    body = admin_response.json()
    assert body["total"] >= 2
    assert {item["username"] for item in body["items"]} >= {"admin", "alice"}

    contributor_response = client.get("/api/v1/users", headers=auth_headers(client, "alice", "alice-pass"))
    assert contributor_response.status_code == 403


def test_admin_can_update_user_roles_and_existing_token_sees_new_roles(client):
    admin_headers = auth_headers(client)
    alice = create_contributor(client, admin_headers, "alice", "alice-pass")
    bob = create_contributor(client, admin_headers, "bob", "bob-pass")
    alice_headers = auth_headers(client, "alice", "alice-pass")

    before_response = client.get("/api/v1/auth/me", headers=alice_headers)
    assert before_response.status_code == 200
    assert [role["code"] for role in before_response.json()["roles"]] == ["CONTRIBUTOR"]
    roles_before_response = client.get(f"/api/v1/users/{alice['id']}/roles", headers=admin_headers)
    assert roles_before_response.status_code == 200
    assert roles_before_response.json()["roleCodes"] == ["CONTRIBUTOR"]

    update_response = client.put(
        f"/api/v1/users/{alice['id']}/roles",
        headers=admin_headers,
        json={"roleCodes": ["CONTRIBUTOR", "ADMIN"]},
    )
    assert update_response.status_code == 200
    assert set(update_response.json()["roleCodes"]) == {"CONTRIBUTOR", "ADMIN"}

    after_response = client.get("/api/v1/auth/me", headers=alice_headers)
    assert after_response.status_code == 200
    assert {role["code"] for role in after_response.json()["roles"]} == {"CONTRIBUTOR", "ADMIN"}
    assert client.get("/api/v1/users", headers=alice_headers).status_code == 200

    forbidden_response = client.put(
        f"/api/v1/users/{bob['id']}/roles",
        headers=auth_headers(client, "bob", "bob-pass"),
        json={"roleCodes": ["CONTRIBUTOR"]},
    )
    assert forbidden_response.status_code == 403


def test_admin_can_read_permission_tree_and_update_role_permissions(client):
    admin_headers = auth_headers(client)
    create_contributor(client, admin_headers, "alice", "alice-pass")

    tree_response = client.get("/api/v1/permission-nodes/tree", headers=admin_headers)
    assert tree_response.status_code == 200
    nodes = flatten_nodes(tree_response.json()["items"])
    dashboard_node_ids = [node["id"] for node in nodes if node["code"] in {"workspace", "dashboard", "dashboard:view"}]
    assert dashboard_node_ids

    roles_response = client.get("/api/v1/roles", headers=admin_headers)
    assert roles_response.status_code == 200
    contributor_role = next(item for item in roles_response.json()["items"] if item["code"] == "CONTRIBUTOR")
    assert "project" in get_scopes(client, "alice", "alice-pass")

    update_response = client.put(
        f"/api/v1/roles/{contributor_role['id']}/permission-nodes",
        headers=admin_headers,
        json={"permissionNodeIds": dashboard_node_ids},
    )
    assert update_response.status_code == 200
    assert sorted(update_response.json()["permissionNodeIds"]) == sorted(dashboard_node_ids)

    scopes_after_update = get_scopes(client, "alice", "alice-pass")
    assert "dashboard" in scopes_after_update
    assert "project" not in scopes_after_update

    contributor_headers = auth_headers(client, "alice", "alice-pass")
    assert client.get("/api/v1/roles", headers=contributor_headers).status_code == 403
    assert client.get("/api/v1/permission-nodes/tree", headers=contributor_headers).status_code == 403

    admin_role = next(item for item in roles_response.json()["items"] if item["code"] == "ADMIN")
    admin_update_response = client.put(
        f"/api/v1/roles/{admin_role['id']}/permission-nodes",
        headers=admin_headers,
        json={"permissionNodeIds": dashboard_node_ids},
    )
    assert admin_update_response.status_code == 400
    assert admin_update_response.json()["code"] == "ADMIN_ROLE_IMMUTABLE"


def test_contributor_cannot_mutate_projects_members_or_tasks(client):
    admin_headers = auth_headers(client)
    create_contributor(client, admin_headers, "alice", "alice-pass")
    project = create_project(client, admin_headers, "项目 A")

    member_response = client.post(
        "/api/v1/members",
        headers=admin_headers,
        json={"name": "张三", "status": "ACTIVE"},
    )
    assert member_response.status_code == 201
    member = member_response.json()

    contributor_headers = auth_headers(client, "alice", "alice-pass")

    forbidden_responses = [
        client.post("/api/v1/projects", headers=contributor_headers, json={"name": "贡献者项目"}),
        client.patch(
            f"/api/v1/projects/{project['id']}/progress",
            headers=contributor_headers,
            json={"progress": 50},
        ),
        client.post("/api/v1/members", headers=contributor_headers, json={"name": "李四", "status": "ACTIVE"}),
        client.post(
            f"/api/v1/projects/{project['id']}/members",
            headers=contributor_headers,
            json={"memberId": member["id"], "role": "BACKEND", "status": "ACTIVE"},
        ),
        client.post(
            "/api/v1/tasks",
            headers=contributor_headers,
            json={"projectId": project["id"], "title": "普通用户任务", "taskType": "BACKEND"},
        ),
    ]

    assert [response.status_code for response in forbidden_responses] == [403, 403, 403, 403, 403]


def test_project_assignment_enables_requirement_flow_and_enforces_ownership(client):
    admin_headers = auth_headers(client)
    alice = create_contributor(client, admin_headers, "alice", "alice-pass")
    bob = create_contributor(client, admin_headers, "bob", "bob-pass")
    project = create_project(client, admin_headers, "项目 A")

    assign_response = client.post(
        f"/api/v1/projects/{project['id']}/users",
        headers=admin_headers,
        json={"userId": alice["id"], "responsibility": "需求整理"},
    )
    assert assign_response.status_code == 201
    assert assign_response.json()["status"] == "ACTIVE"

    alice_headers = auth_headers(client, "alice", "alice-pass")
    bob_headers = auth_headers(client, "bob", "bob-pass")

    create_response = client.post(
        f"/api/v1/projects/{project['id']}/requirements",
        headers=alice_headers,
        json={"title": "需求 A1", "description": "第一条需求", "priority": "HIGH"},
    )
    assert create_response.status_code == 201
    requirement = create_response.json()
    assert requirement["createdByUserId"] == alice["id"]

    bob_update_response = client.put(
        f"/api/v1/requirements/{requirement['id']}",
        headers=bob_headers,
        json={"title": "Bob 修改", "description": "不应该成功", "priority": "LOW"},
    )
    assert bob_update_response.status_code == 403

    alice_update_response = client.put(
        f"/api/v1/requirements/{requirement['id']}",
        headers=alice_headers,
        json={"title": "需求 A1 更新", "description": "创建人可修改", "priority": "MEDIUM"},
    )
    assert alice_update_response.status_code == 200
    assert alice_update_response.json()["title"] == "需求 A1 更新"

    claim_response = client.post(f"/api/v1/requirements/{requirement['id']}/claim", headers=alice_headers)
    assert claim_response.status_code == 200
    assert claim_response.json()["status"] == "CLAIMED"
    assert claim_response.json()["claimedByUserId"] == alice["id"]

    locked_update_response = client.put(
        f"/api/v1/requirements/{requirement['id']}",
        headers=alice_headers,
        json={"title": "认领后修改", "priority": "LOW"},
    )
    assert locked_update_response.status_code == 403
    assert locked_update_response.json()["code"] == "REQUIREMENT_LOCKED"

    admin_update_response = client.put(
        f"/api/v1/requirements/{requirement['id']}",
        headers=admin_headers,
        json={"title": "管理员强制修改", "priority": "LOW"},
    )
    assert admin_update_response.status_code == 200
    assert admin_update_response.json()["title"] == "管理员强制修改"

    admin_delete_response = client.delete(f"/api/v1/requirements/{requirement['id']}", headers=admin_headers)
    assert admin_delete_response.status_code == 204


def test_removed_project_assignment_revokes_requirement_write_access(client):
    admin_headers = auth_headers(client)
    alice = create_contributor(client, admin_headers, "alice", "alice-pass")
    project = create_project(client, admin_headers, "项目 A")
    assign_response = client.post(
        f"/api/v1/projects/{project['id']}/users",
        headers=admin_headers,
        json={"userId": alice["id"], "responsibility": "需求整理"},
    )
    assert assign_response.status_code == 201
    remove_response = client.delete(
        f"/api/v1/projects/{project['id']}/users/{alice['id']}",
        headers=admin_headers,
    )
    assert remove_response.status_code == 204

    response = client.post(
        f"/api/v1/projects/{project['id']}/requirements",
        headers=auth_headers(client, "alice", "alice-pass"),
        json={"title": "移除后需求", "priority": "MEDIUM"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "PROJECT_ASSIGNMENT_REQUIRED"


def create_contributor(client: TestClient, headers: dict[str, str], username: str, password: str) -> dict:
    response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "username": username,
            "password": password,
            "displayName": username.title(),
            "roleCodes": ["CONTRIBUTOR"],
            "status": "ACTIVE",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_project(client: TestClient, headers: dict[str, str], name: str) -> dict:
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": name, "status": "DEVELOPING"},
    )
    assert response.status_code == 201
    return response.json()


def get_scopes(client: TestClient, username: str, password: str) -> dict:
    response = client.get("/api/v1/auth/me", headers=auth_headers(client, username, password))
    assert response.status_code == 200
    return response.json()["permissionScopes"]


def flatten_nodes(nodes: list[dict]) -> list[dict]:
    flattened = []
    for node in nodes:
        flattened.append(node)
        flattened.extend(flatten_nodes(node.get("children", [])))
    return flattened
