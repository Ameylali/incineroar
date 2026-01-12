import pytest
from _pytest.fixtures import FixtureRequest

from src.models.user import User
from src.util.data import load_users


@pytest.fixture
def user(request: FixtureRequest):
    marker = request.node.get_closest_marker("user")

    if marker is None:
        return None

    username = marker.args[0]
    users = load_users()
    return User(username, users[username]["role"], users[username]["password"])
