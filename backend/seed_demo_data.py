import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SEED_TAG = "fixify_demo_v2"
CATEGORY_OPTIONS = [
    "Electricity & Street Facilities",
    "Water & Drainage",
    "Waste & Sanitation",
    "Road & Transport",
    "Public Safety",
    "Environment",
    "Public Facilities",
    "Other / Unclassified",
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_timeline_entry(event_type: str, title: str, description: str, actor_id: str, actor_name: str, created_at: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "title": title,
        "description": description,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "created_at": created_at,
    }


def determine_urgency(category: str, title: str, description: str) -> dict:
    combined = f"{title} {description}".lower()
    score = {
        "Public Safety": 0.82,
        "Electricity & Street Facilities": 0.78,
        "Water & Drainage": 0.60,
        "Road & Transport": 0.58,
        "Waste & Sanitation": 0.52,
        "Environment": 0.48,
        "Public Facilities": 0.46,
        "Other / Unclassified": 0.40,
    }.get(category, 0.4)

    if any(word in combined for word in ["danger", "hazard", "flood", "exposed wire", "unsafe", "collapsed"]):
        score = max(score, 0.86)
        reason = "Description includes high-risk safety indicators"
    elif any(word in combined for word in ["pothole", "leak", "overflow", "garbage", "broken", "streetlight"]):
        score = max(score, 0.62)
        reason = "Description suggests an issue affecting daily access or hygiene"
    else:
        reason = f"Base urgency from {category.lower()} category"

    if score >= 0.8:
        level = "high"
    elif score >= 0.55:
        level = "medium"
    else:
        level = "low"

    return {"level": level, "score": round(score, 2), "reason": reason}


async def main():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    await db.reports.delete_many({"seed_tag": SEED_TAG})
    await db.events.delete_many({"seed_tag": SEED_TAG})
    await db.community_posts.delete_many({"seed_tag": SEED_TAG})
    await db.notifications.delete_many({"seed_tag": SEED_TAG})

    users = [
        {
            "email": "moderator@fixify.demo",
            "full_name": "Moderator Demo",
            "role": "moderator",
            "is_community_member": True,
        },
        {
            "email": "aarya@fixify.demo",
            "full_name": "Aarya Sharma",
            "role": "user",
            "is_community_member": True,
        },
        {
            "email": "sabin@fixify.demo",
            "full_name": "Sabin Rai",
            "role": "user",
            "is_community_member": True,
        },
        {
            "email": "nisha@fixify.demo",
            "full_name": "Nisha Karki",
            "role": "user",
            "is_community_member": False,
        },
    ]

    password_hash = hash_password("Fixify123")
    user_ids = {}
    for user in users:
      existing = await db.users.find_one({"email": user["email"]}, {"_id": 0, "id": 1})
      user_id = existing["id"] if existing else str(uuid.uuid4())
      user_ids[user["email"]] = user_id
      await db.users.update_one(
          {"email": user["email"]},
          {
              "$set": {
                  "id": user_id,
                  "email": user["email"],
                  "password": password_hash,
                  "full_name": user["full_name"],
                  "role": user["role"],
                  "is_community_member": user["is_community_member"],
                  "created_at": datetime.now(timezone.utc).isoformat(),
                  "seed_tag": SEED_TAG,
              }
          },
          upsert=True,
      )

    now = datetime.now(timezone.utc)
    report_templates = [
        {
            "title": "Large pothole blocking scooter lane",
            "description": "A deep pothole has opened near the bus stop and smaller vehicles are swerving into traffic to avoid it.",
            "category": "Road & Transport",
            "status": "Needs Review",
            "location_name": "Pulchowk, Lalitpur",
            "latitude": 27.6780,
            "longitude": 85.3160,
            "user_email": "aarya@fixify.demo",
            "created_days_ago": 1,
            "ai_confidence": 0.58,
            "ai_source": "openrouter/free",
            "ai_reason": "Mentions pothole, traffic disruption, and road damage.",
            "duplicate_of": None,
        },
        {
            "title": "Water leakage from roadside supply pipe",
            "description": "Clean water has been leaking continuously since morning and the road edge is becoming slippery.",
            "category": "Water & Drainage",
            "status": "Under Review",
            "location_name": "Baneshwor, Kathmandu",
            "latitude": 27.6922,
            "longitude": 85.3420,
            "user_email": "sabin@fixify.demo",
            "created_days_ago": 2,
            "ai_confidence": 0.86,
            "ai_source": "openrouter/free",
            "ai_reason": "The description clearly points to pipe leakage and drainage impact.",
            "duplicate_of": None,
        },
        {
            "title": "Streetlight not working near school gate",
            "description": "The streetlight has been off for three nights and the area near the school gate feels unsafe after dark.",
            "category": "Electricity & Street Facilities",
            "status": "In Progress",
            "location_name": "Jawalakhel, Lalitpur",
            "latitude": 27.6711,
            "longitude": 85.3125,
            "user_email": "nisha@fixify.demo",
            "created_days_ago": 3,
            "ai_confidence": 0.82,
            "ai_source": "openrouter/free",
            "ai_reason": "Mentions non-functioning streetlight affecting safety in a public area.",
            "duplicate_of": None,
        },
        {
            "title": "Overflowing waste pile beside market lane",
            "description": "Garbage has piled up beside the vegetable market and the smell is getting worse every day.",
            "category": "Waste & Sanitation",
            "status": "Open",
            "location_name": "Asan, Kathmandu",
            "latitude": 27.7049,
            "longitude": 85.3095,
            "user_email": "aarya@fixify.demo",
            "created_days_ago": 1,
            "ai_confidence": 0.91,
            "ai_source": "openrouter/free",
            "ai_reason": "Strong waste-management cues with sanitation impact.",
            "duplicate_of": None,
        },
        {
            "title": "Broken public tap in community square",
            "description": "The tap handle is missing, so water keeps spilling into the square and no one can close it fully.",
            "category": "Public Facilities",
            "status": "Fixed",
            "location_name": "Patan Durbar Square, Lalitpur",
            "latitude": 27.6734,
            "longitude": 85.3256,
            "user_email": "sabin@fixify.demo",
            "created_days_ago": 6,
            "ai_confidence": 0.79,
            "ai_source": "local-ml-fallback",
            "ai_reason": "Civic infrastructure damage affecting public access.",
            "duplicate_of": None,
        },
        {
            "title": "Another pothole report near Pulchowk bus stop",
            "description": "The same road depression near the bus stop is getting wider and looks dangerous for bikes during rain.",
            "category": "Road & Transport",
            "status": "Needs Review",
            "location_name": "Pulchowk, Lalitpur",
            "latitude": 27.6781,
            "longitude": 85.3162,
            "user_email": "nisha@fixify.demo",
            "created_days_ago": 0,
            "ai_confidence": 0.54,
            "ai_source": "openrouter/free",
            "ai_reason": "Matches pothole and transport damage language, but overlaps with an existing report.",
            "duplicate_of": "seed-pothole-main",
        },
    ]

    inserted_reports = []
    for template in report_templates:
        created_at_dt = now - timedelta(days=template["created_days_ago"])
        created_at = created_at_dt.isoformat()
        urgency = determine_urgency(template["category"], template["title"], template["description"])
        report_id = str(uuid.uuid4())
        if template["duplicate_of"] == "seed-pothole-main" and inserted_reports:
            duplicate_of = inserted_reports[0]["id"]
        else:
            duplicate_of = None

        timeline = [
            create_timeline_entry(
                "submitted",
                "Report submitted",
                "The issue was submitted by the reporting user.",
                user_ids[template["user_email"]],
                next(user["full_name"] for user in users if user["email"] == template["user_email"]),
                created_at,
            ),
            create_timeline_entry(
                "ai_triage",
                "AI triage completed",
                f"Categorized as {template['category']} with {urgency['level']} urgency.",
                "fixify-ai",
                "Fixify AI",
                (created_at_dt + timedelta(minutes=2)).isoformat(),
            ),
        ]

        if template["status"] in {"Under Review", "In Progress", "Fixed"}:
            timeline.append(
                create_timeline_entry(
                    "status_update",
                    f"Status changed to {template['status']}",
                    {
                        "Under Review": "A moderator verified the issue details.",
                        "In Progress": "The case has been handed off for action.",
                        "Fixed": "The issue has been resolved and closed.",
                    }[template["status"]],
                    user_ids["moderator@fixify.demo"],
                    "Moderator Demo",
                    (created_at_dt + timedelta(hours=5)).isoformat(),
                )
            )

        report_doc = {
            "id": report_id,
            "title": template["title"],
            "description": template["description"],
            "category": template["category"],
            "status": template["status"],
            "latitude": template["latitude"],
            "longitude": template["longitude"],
            "location_name": template["location_name"],
            "image_base64": None,
            "user_id": user_ids[template["user_email"]],
            "user_name": next(user["full_name"] for user in users if user["email"] == template["user_email"]),
            "ai_analysis": "",
            "ai_reason": template["ai_reason"],
            "ai_confidence": template["ai_confidence"],
            "ai_source": template["ai_source"],
            "urgency": urgency["level"],
            "urgency_score": urgency["score"],
            "urgency_reason": urgency["reason"],
            "duplicate_of": duplicate_of,
            "duplicate_score": 0.78 if duplicate_of else None,
            "created_at": created_at,
            "updated_at": created_at,
            "resolved_at": (created_at_dt + timedelta(days=1)).isoformat() if template["status"] == "Fixed" else None,
            "timeline": timeline,
            "upvotes": 2 if template["status"] != "Fixed" else 4,
            "upvoted_by": [],
            "comments": [
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_ids["moderator@fixify.demo"],
                    "user_name": "Moderator Demo",
                    "text": "Thanks for reporting this. We are tracking it in the queue.",
                    "created_at": (created_at_dt + timedelta(hours=3)).isoformat(),
                }
            ],
            "comments_count": 1,
            "seed_tag": SEED_TAG,
        }
        inserted_reports.append(report_doc)

    await db.reports.insert_many(inserted_reports)

    event_doc = {
        "id": str(uuid.uuid4()),
        "title": "Market Lane Clean-up Drive",
        "description": "Volunteer clean-up linked to recurring waste reports in the market area.",
        "event_date": (now + timedelta(days=3)).date().isoformat(),
        "location": "Asan, Kathmandu",
        "max_participants": 25,
        "participants": [user_ids["aarya@fixify.demo"], user_ids["sabin@fixify.demo"]],
        "created_by": user_ids["moderator@fixify.demo"],
        "created_at": now.isoformat(),
        "related_report_ids": [inserted_reports[3]["id"]],
        "updates": [
            {
                "id": str(uuid.uuid4()),
                "user_id": user_ids["moderator@fixify.demo"],
                "user_name": "Moderator Demo",
                "text": "Local members have confirmed the lane is still blocked by waste sacks.",
                "outcome": "Pre-event verification completed.",
                "image_base64": None,
                "created_at": now.isoformat(),
            }
        ],
        "seed_tag": SEED_TAG,
    }
    await db.events.insert_one(event_doc)

    post_doc = {
        "id": str(uuid.uuid4()),
        "title": "Community volunteers needed for market sanitation push",
        "content": "We are coordinating a neighborhood response around repeated waste complaints. Join if you can help with clean-up or awareness.",
        "status": "approved",
        "user_id": user_ids["aarya@fixify.demo"],
        "user_name": "Aarya Sharma",
        "created_at": now.isoformat(),
        "comments": [
            {
                "id": str(uuid.uuid4()),
                "user_id": user_ids["sabin@fixify.demo"],
                "user_name": "Sabin Rai",
                "text": "Count me in for the weekend shift.",
                "created_at": now.isoformat(),
            }
        ],
        "seed_tag": SEED_TAG,
    }
    await db.community_posts.insert_one(post_doc)

    print("Seeded demo data successfully.")
    print("Demo accounts:")
    print("  moderator@fixify.demo / Fixify123")
    print("  aarya@fixify.demo / Fixify123")
    print("  sabin@fixify.demo / Fixify123")
    print("  nisha@fixify.demo / Fixify123")


if __name__ == "__main__":
    asyncio.run(main())
