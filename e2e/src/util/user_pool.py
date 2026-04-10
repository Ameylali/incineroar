"""
User pool utility for random user selection in e2e tests.

This module provides functions to randomly select users from a pool,
enabling concurrent test runs without user conflicts.
"""

import random
from typing import Optional

from src.models.user import User
from src.util.data import load_users


_users_cache: Optional[dict[str, dict[str, str]]] = None


def _get_users() -> dict[str, dict[str, str]]:
    """Load and cache users from data file."""
    global _users_cache
    if _users_cache is None:
        _users_cache = load_users()
    return _users_cache


def get_admin_users() -> list[User]:
    """Get all admin users from the pool."""
    users = _get_users()
    return [
        User(username, data["role"], data["password"])
        for username, data in users.items()
        if data["role"] == "admin"
    ]


def get_non_admin_users() -> list[User]:
    """Get all non-admin users from the pool."""
    users = _get_users()
    return [
        User(username, data["role"], data["password"])
        for username, data in users.items()
        if data["role"] == "user"
    ]


def get_random_admin() -> User:
    """
    Get a random admin user from the pool.
    
    Returns:
        User: A randomly selected admin user.
    """
    admins = get_admin_users()
    return random.choice(admins)


def get_random_user() -> User:
    """
    Get a random non-admin user from the pool.
    
    Returns:
        User: A randomly selected non-admin user.
    """
    users = get_non_admin_users()
    return random.choice(users)
