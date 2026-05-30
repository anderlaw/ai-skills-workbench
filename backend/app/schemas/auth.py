from app.schemas.base import CamelModel


class LoginRequest(CamelModel):
    username: str
    password: str


class LoginResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"
    display_name: str


class CurrentUserInfo(CamelModel):
    id: int
    username: str
    status: str
    display_name: str


class CurrentRole(CamelModel):
    id: int
    code: str
    name: str


class CurrentMenuNode(CamelModel):
    id: int
    parent_id: int | None = None
    node_type: str
    name: str
    code: str
    route_path: str | None = None
    scope: str | None = None
    icon: str | None = None
    sort_order: int
    children: list["CurrentMenuNode"] = []


class CurrentUser(CamelModel):
    user: CurrentUserInfo
    roles: list[CurrentRole]
    menu_tree: list[CurrentMenuNode]
    permission_scopes: dict[str, list[str]]
