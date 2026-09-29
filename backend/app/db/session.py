from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Async engine for FastAPI requests
engine_async = create_async_engine(
    settings.async_sqlalchemy_database_uri,
    pool_pre_ping=True,
    echo=False,
)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine_async)

# Sync engine for Alembic and scripts
engine_sync = create_engine(
    settings.sqlalchemy_database_uri,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sync)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
