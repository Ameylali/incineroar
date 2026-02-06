from typing import Any, Callable, Generator

import pytest

from src.models.team import Team
from src.models.tournament import Tournament
from src.models.training import Battle, Training
from src.models.user import User
from src.util.api import IncineroarAPI, create_authenticated_api
from src.util.constants import VERCEL_AUTOMATION_BYPASS_SECRET
from src.util.data import load_users


def pytest_configure(config: pytest.Config):
    config.addinivalue_line("markers", "user: existing test user")


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "extra_http_headers": {
            "x-vercel-protection-bypass": VERCEL_AUTOMATION_BYPASS_SECRET,
        },
    }


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


@pytest.fixture(scope="module")
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


MakeTournament = Callable[[User, Tournament], Tournament]


@pytest.fixture(scope="module")
def make_tournament() -> Generator[MakeTournament, Any, None]:
    tournaments: list[tuple[IncineroarAPI, Tournament]] = []

    def _make_tournament(user: User, tournament: Tournament):
        api = create_authenticated_api(user.username, user.password)
        created_tournament = api.create_tournament_from_model(tournament)
        tournaments.append((api, created_tournament))
        return created_tournament

    yield _make_tournament

    for api, tournament in tournaments:
        if tournament.id is not None:
            api.delete_tournament(tournament.id)


MakeTraining = Callable[[User, Training], Training]


@pytest.fixture(scope="module")
def make_training() -> Generator[MakeTraining, Any, None]:
    trainings: list[tuple[IncineroarAPI, Training]] = []

    def _make_training(user: User, training: Training):
        api = create_authenticated_api(user.username, user.password)
        created_training = api.create_training_from_model(training)
        trainings.append((api, created_training))
        return created_training

    yield _make_training

    for api, training in trainings:
        if training.id is not None:
            api.delete_training(training.id)


MakeBattle = Callable[[User, str, Battle], Battle]


@pytest.fixture(scope="module")
def make_battle() -> Generator[MakeBattle, Any, None]:
    battles: list[tuple[IncineroarAPI, str, Battle]] = []

    def _make_battle(user: User, training_id: str, battle: Battle):
        api = create_authenticated_api(user.username, user.password)
        created_battle = api.create_training_battle_from_model(training_id, battle)
        battles.append((api, training_id, created_battle))
        return created_battle

    yield _make_battle

    for api, training_id, battle in battles:
        if battle.id is not None:
            api.delete_battle(training_id, battle.id)
