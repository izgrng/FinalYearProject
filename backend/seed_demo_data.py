import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SEED_TAG = "fixify_demo_v2"


async def main():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "fixify")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    reports_result = await db.reports.delete_many({"seed_tag": SEED_TAG})
    events_result = await db.events.delete_many({"seed_tag": SEED_TAG})
    posts_result = await db.community_posts.delete_many({"seed_tag": SEED_TAG})
    notifications_result = await db.notifications.delete_many({"seed_tag": SEED_TAG})
    users_result = await db.users.delete_many({"seed_tag": SEED_TAG})

    print("Fixify demo-data cleanup complete.")
    print(f"Database: {db_name}")
    print(f"Removed reports: {reports_result.deleted_count}")
    print(f"Removed events: {events_result.deleted_count}")
    print(f"Removed community posts: {posts_result.deleted_count}")
    print(f"Removed notifications: {notifications_result.deleted_count}")
    print(f"Removed users: {users_result.deleted_count}")
    print("No new demo data was inserted.")


if __name__ == "__main__":
    asyncio.run(main())
