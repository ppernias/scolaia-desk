import asyncio
from app.db.session import AsyncSessionLocal
from app.crud import user

async def get_users():
    async with AsyncSessionLocal() as db:
        users = await user.get_multi(db)
        for u in users:
            print(f'Email: {u.email}, Active: {u.is_active}, Admin: {u.is_admin}')

asyncio.run(get_users())
