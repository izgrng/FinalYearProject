import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

DEFAULT_EMAIL = os.environ.get("FIXIFY_MODERATOR_EMAIL", "moderator@fixify.com").strip().lower()
DEFAULT_PASSWORD = os.environ.get("FIXIFY_MODERATOR_PASSWORD", "Moderator123").strip()
DEFAULT_NAME = os.environ.get("FIXIFY_MODERATOR_NAME", "Fixify Moderator").strip()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def main():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "fixify")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    existing = await db.users.find_one({"email": DEFAULT_EMAIL}, {"_id": 0, "id": 1})
    user_id = existing["id"] if existing else str(uuid.uuid4())

    await db.users.update_one(
        {"email": DEFAULT_EMAIL},
        {
            "$set": {
                "id": user_id,
                "email": DEFAULT_EMAIL,
                "password": hash_password(DEFAULT_PASSWORD),
                "full_name": DEFAULT_NAME,
                "role": "moderator",
                "is_community_member": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )

    print("Moderator account ready.")
    print(f"Database: {db_name}")
    print(f"Email: {DEFAULT_EMAIL}")
    print(f"Password: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
