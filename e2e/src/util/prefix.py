"""
Dynamic prefix generator for e2e test isolation.

This module provides a session-scoped prefix that is unique per test run,
preventing name collisions when multiple test runs execute concurrently.
"""

import os
import uuid
from typing import Optional


_session_prefix: Optional[str] = None
_PREFIX_ENV_VAR = "E2E_TEST_PREFIX"


def get_test_prefix() -> str:
    """
    Get the unique test prefix for this session.
    
    The prefix is generated once per session and cached.
    It can also be set via the E2E_TEST_PREFIX environment variable
    for reproducibility or debugging.
    
    Returns:
        str: A 6-character hex prefix (e.g., "a1b2c3")
    """
    global _session_prefix
    
    if _session_prefix is not None:
        return _session_prefix
    
    # Allow override via environment variable
    env_prefix = os.getenv(_PREFIX_ENV_VAR)
    if env_prefix:
        _session_prefix = env_prefix
    else:
        _session_prefix = uuid.uuid4().hex[:6]
    
    return _session_prefix


def reset_prefix() -> None:
    """Reset the cached prefix. Mainly for testing purposes."""
    global _session_prefix
    _session_prefix = None
