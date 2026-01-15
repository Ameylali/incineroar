from ast import Tuple
from typing import Any, Callable, Generator

import pytest

from src.models.team import Team
from src.models.user import User
from src.util.api import IncineroarAPI, create_authenticated_api
from src.util.data import load_users


def pytest_configure(config: pytest.Config):
    config.addinivalue_line("markers", "user: existing test user")


@pytest.fixture
def user(request: pytest.FixtureRequest):
    marker = request.node.get_closest_marker("user")

    if marker is None:
        return None

    username = marker.args[0]
    users = load_users()
    return User(username, users[username]["role"], users[username]["password"])


GetUser = Callable[[str], User]


@pytest.fixture(scope="module")
def get_user() -> GetUser:
    users = load_users()

    def _get_user(username: str):
        return User(username, users[username]["role"], users[username]["password"])

    return _get_user


MakeTeam = Callable[[User, Team], Team]


@pytest.fixture(scope="class")
def make_team() -> Generator[MakeTeam, Any, None]:
    teams: list[tuple[IncineroarAPI, Team]] = []

    def _make_team(user: User, team: Team):
        api = create_authenticated_api(user.username, user.password)
        created_team = api.create_team_from_model(team)
        teams.append((api, created_team))
        return created_team

    yield _make_team

    for api, team in teams:
        if team.id is not None:
            api.delete_team(team.id)
