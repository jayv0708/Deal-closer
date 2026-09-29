import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.security import get_password_hash
from app.models.user import User
from app.core.config import settings

async def create_users():
    engine = create_async_engine(settings.async_sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    users_to_ensure = [
        ("jay0708chauhan@gmail.com", "password123", "Admin User"),
        ("admin@example.com", "admin123", "System Admin")
    ]
    
    async with async_session() as session:
        for email, password, name in users_to_ensure:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            if user:
                user.password_hash = get_password_hash(password)
                print(f"Updated password for {email}")
            else:
                user = User(
                    email=email,
                    password_hash=get_password_hash(password),
                    name=name,
                    role='ADMIN'
                )
                session.add(user)
                print(f"Created user {email}")
        await session.commit()
        print("All users initialized and verified!")

if __name__ == "__main__":
    asyncio.run(create_users())
