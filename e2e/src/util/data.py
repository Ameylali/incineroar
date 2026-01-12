import json
from pathlib import Path

from src.util.constants import USER_PASSWORDS

users_json_path = Path(__file__).resolve().parents[3] / "data" / "users.json"


def load_users():
    users: dict[str, dict[str, str]] = {}
    with open(users_json_path, "r") as file:
        data = json.load(file)
        passwords = json.loads(USER_PASSWORDS)
        for user in data["users"]:
            users[user["username"]] = {
                "role": user["role"],
                "password": passwords[user["username"]],
            }
    return users
