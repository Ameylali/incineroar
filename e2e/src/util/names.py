"""
Name builder utilities for e2e tests.

These helpers add a unique prefix to entity names to prevent
collisions between concurrent test runs.
"""

from typing import Optional

from src.util.prefix import get_test_prefix


def prefixed_name(base: str, prefix: Optional[str] = None) -> str:
    """
    Create a prefixed name for any entity.
    
    Args:
        base: The base name (e.g., "team 1")
        prefix: The unique prefix (e.g., "a1b2c3"). Defaults to session prefix.
    
    Returns:
        str: The prefixed name (e.g., "a1b2c3_team 1")
    """
    if prefix is None:
        prefix = get_test_prefix()
    return f"{prefix}_{base}"
