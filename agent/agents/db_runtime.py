"""Per-event-loop SQLAlchemy engine bootstrap.

Jobs in a livekit-agents worker share one process but each job gets a FRESH
asyncio event loop. A module-level engine created on loop #1 holds connections
bound to that loop; when a later job's loop touches them asyncio raises
"Task got Future attached to a different loop".

This module keeps one engine per running loop, created lazily on first use.
"""

from __future__ import annotations

import asyncio
import os
import sys
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from backend.app.core.config import settings  # noqa: E402

_engines: dict[int, AsyncEngine] = {}
_session_factories: dict[int, async_sessionmaker[AsyncSession]] = {}


def _get_factory() -> async_sessionmaker[AsyncSession]:
    loop = asyncio.get_running_loop()
    key = id(loop)
    if key not in _engines:
        engine = create_async_engine(
            settings.async_sqlalchemy_database_uri, pool_pre_ping=True
        )
        _engines[key] = engine
        _session_factories[key] = async_sessionmaker(engine, expire_on_commit=False)
    return _session_factories[key]


@asynccontextmanager
async def session_scope():
    """Short-lived AsyncSession bound to the CURRENT event loop."""
    factory = _get_factory()
    async with factory() as session:
        yield session


async def dispose_current_loop_engine() -> None:
    """Dispose the engine bound to the current loop (call at job shutdown)."""
    loop = asyncio.get_running_loop()
    engine = _engines.pop(id(loop), None)
    if engine is not None:
        await engine.dispose()
