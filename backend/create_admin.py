import asyncio
from getpass import getpass
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash
from app.models.user import User
from app.core.config import settings

async def create_user():
    email = input("Admin email: ").strip()
    password = getpass("Admin password: ")
    name = input("Admin name [Admin User]: ").strip() or "Admin User"
    if not email or not password:
        raise ValueError("Admin email and password are required")

    engine = create_async_engine(settings.async_sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            name=name,
            role='ADMIN'
        )
        session.add(user)
        await session.commit()
        print('User created successfully')

if __name__ == "__main__":
    asyncio.run(create_user())
