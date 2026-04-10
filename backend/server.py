from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
import joblib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
MODEL_PATH = ROOT_DIR / "ml" / "model.joblib"
_ml_model = None

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fixify_secret_key')
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="Fixify API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_community_member: bool
    created_at: str

class PublicUserResponse(BaseModel):
    id: str
    full_name: str
    role: str
    is_community_member: bool
    created_at: str

class ReportCreate(BaseModel):
    title: str
    description: str
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    image_base64: Optional[str] = None

class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    status: str
    latitude: float
    longitude: float
    location_name: str
    image_url: Optional[str] = None
    user_id: str
    user_name: str
    ai_analysis: Optional[str] = None
    created_at: str
    upvotes: int

class EventCreate(BaseModel):
    title: str
    description: str
    event_date: str
    location: str
    max_participants: int

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    event_date: str
    location: str
    max_participants: int
    participants: List[str]
    created_by: str
    created_at: str

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class MembershipRequest(BaseModel):
    reason: str

class CommentCreate(BaseModel):
    text: str

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    report_id: str
    message: str
    created_at: str
    read: bool

class CommunityPostCreate(BaseModel):
    title: str
    content: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_moderator(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if user.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Moderator access required")
    return user

# ==================== AI SERVICES ====================

async def analyze_image_content(image_base64: str) -> dict:
    """Analyze if image contains a valid community problem.
    AI provider removed; default to accept and mark as unverified.
    """
    return {
        "is_valid": True,
        "reason": "AI analysis disabled.",
        "detected_issue": "Reported issue"
    }

async def categorize_report(title: str, description: str, image_analysis: str = "") -> str:
    """ML-based triage with rule-based fallback."""
    global _ml_model
    if _ml_model is None and MODEL_PATH.exists():
        try:
            _ml_model = joblib.load(MODEL_PATH)
        except Exception as e:
            logger.error(f"ML model load error: {e}")
            _ml_model = None

    if _ml_model is not None:
        try:
            text = f"{title} {description} {image_analysis}".strip()
            pred = _ml_model.predict([text])[0]
            return pred
        except Exception as e:
            logger.error(f"ML categorization error: {e}")

    text = f"{title} {description} {image_analysis}".lower()

    if any(word in text for word in ["streetlight", "street light", "light", "lamp", "electric", "electricity", "power", "wire", "cable"]):
        return "Electricity & Street Facilities"
    if any(word in text for word in ["water", "leak", "pipe", "sewage", "drain", "drainage", "flood", "tap"]):
        return "Water & Drainage"
    if any(word in text for word in ["garbage", "waste", "litter", "dump", "trash", "bin", "sanitation", "clean"]):
        return "Waste & Sanitation"
    if any(word in text for word in ["road", "street", "pothole", "traffic", "bridge", "footpath", "sidewalk", "transport"]):
        return "Road & Transport"
    if any(word in text for word in ["unsafe", "danger", "harass", "abuse", "crime", "attack", "security"]):
        return "Public Safety"
    if any(word in text for word in ["pollution", "burn", "smoke", "tree", "forest", "environment", "river"]):
        return "Environment"
    if any(word in text for word in ["park", "toilet", "school", "community", "facility", "building", "playground"]):
        return "Public Facilities"
    return "Other / Unclassified"

async def fixi_chat(message: str, session_id: str) -> str:
    """Fixi chatbot for user guidance (rule-based)."""
    text = message.lower().strip()

    if any(greet in text for greet in ["hi", "hello", "hey", "namaste"]):
        return "Hi! I’m Fixi. I can help you report issues, explain categories, and guide you around Fixify."

    if "report" in text or "issue" in text:
        return (
            "To report an issue: go to Report Issue, add a title and description, "
            "drop a pin on the map, and submit. You can optionally add a photo."
        )

    if "category" in text or "type" in text:
        return (
            "Categories include Waste, Road, Water, Safety, Infrastructure, Environment, and Other. "
            "Pick the closest match to your issue."
        )

    if "community" in text or "event" in text:
        return (
            "Community Hub lets you view events and request membership. "
            "A moderator approves membership requests."
        )

    if "location" in text or "map" in text:
        return (
            "Use the map to select the exact location. You can also click 'Use My Location' "
            "to auto-set your current position."
        )

    if "moderator" in text:
        return (
            "Moderators can approve membership requests and create events. "
            "Use the Moderator Panel after logging in as a moderator."
        )

    if "login" in text or "sign in" in text or "signup" in text:
        return (
            "You can create an account on the Sign Up page, then log in from the Login page. "
            "After logging in, you can submit reports and access the dashboard."
        )

    return (
        "I can help with reporting issues, categories, maps, community hub, and moderator actions. "
        "Tell me what you’d like to do."
    )

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "role": "user",
        "is_community_member": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, "user")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": "user",
            "is_community_member": False
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "is_community_member": user.get("is_community_member", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "is_community_member": user.get("is_community_member", False)
    }

@api_router.get("/users/{user_id}")
async def get_public_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "email": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "role": user.get("role", "user"),
        "is_community_member": user.get("is_community_member", False),
        "created_at": user.get("created_at")
    }

# ==================== REPORTS ENDPOINTS ====================

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, user: dict = Depends(get_current_user)):
    image_analysis = ""
    image_url = None
    
    # Analyze image if provided
    if report_data.image_base64:
        analysis = await analyze_image_content(report_data.image_base64)
        if not analysis.get("is_valid", True):
            raise HTTPException(status_code=400, detail=f"Image rejected: {analysis.get('reason', 'Not a valid problem report')}")
        image_analysis = analysis.get("detected_issue", "")
        # Store base64 as data URL for simplicity
        image_url = f"data:image/jpeg;base64,{report_data.image_base64[:100]}..."  # Truncate for storage
    
    # AI categorization
    category = await categorize_report(report_data.title, report_data.description, image_analysis)
    
    report_id = str(uuid.uuid4())
    report_doc = {
        "id": report_id,
        "title": report_data.title,
        "description": report_data.description,
        "category": category,
        "status": "Open",
        "latitude": report_data.latitude,
        "longitude": report_data.longitude,
        "location_name": report_data.location_name or "Pinned location",
        "image_base64": report_data.image_base64,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "ai_analysis": image_analysis,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "upvotes": 0,
        "upvoted_by": [],
        "comments": [],
        "comments_count": 0
    }
    await db.reports.insert_one(report_doc)
    
    return {
        "id": report_id,
        "title": report_data.title,
        "description": report_data.description,
        "category": category,
        "status": "Open",
        "latitude": report_data.latitude,
        "longitude": report_data.longitude,
        "location_name": report_data.location_name,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "ai_analysis": image_analysis,
        "created_at": report_doc["created_at"],
        "upvotes": 0,
        "message": f"Report categorized as '{category}' by AI"
    }

@api_router.get("/reports")
async def get_reports(
    category: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 50
):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if location:
        query["location_name"] = {"$regex": location, "$options": "i"}
    
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return reports

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@api_router.put("/reports/{report_id}")
async def update_report(report_id: str, update: ReportUpdate, user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.get("user_id") != user["id"] and user.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Not allowed to edit this report")

    updates = {}
    if update.title is not None:
        updates["title"] = update.title
    if update.description is not None:
        updates["description"] = update.description

    if updates:
        # Re-categorize if text changes
        category = await categorize_report(
            updates.get("title", report.get("title", "")),
            updates.get("description", report.get("description", "")),
            report.get("ai_analysis", "")
        )
        updates["category"] = category
        await db.reports.update_one({"id": report_id}, {"$set": updates})

    updated = await db.reports.find_one({"id": report_id}, {"_id": 0})
    return updated

@api_router.delete("/reports/{report_id}")
async def delete_report(report_id: str, user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.get("user_id") != user["id"] and user.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Not allowed to delete this report")

    await db.reports.delete_one({"id": report_id})
    return {"message": "Report deleted"}

@api_router.get("/reports/{report_id}/comments")
async def get_comments(report_id: str):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0, "comments": 1})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report.get("comments", [])

@api_router.post("/reports/{report_id}/comments")
async def add_comment(report_id: str, comment: CommentCreate, user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    comment_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["full_name"],
        "text": comment.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reports.update_one(
        {"id": report_id},
        {"$push": {"comments": comment_doc}, "$inc": {"comments_count": 1}}
    )
    if report.get("user_id") and report.get("user_id") != user["id"]:
        notif_doc = {
            "id": str(uuid.uuid4()),
            "user_id": report["user_id"],
            "type": "comment",
            "report_id": report_id,
            "message": f"{user['full_name']} commented on your report",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read": False
        }
        await db.notifications.insert_one(notif_doc)
    return comment_doc

@api_router.post("/reports/{report_id}/upvote")
async def upvote_report(report_id: str, user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    upvoted_by = report.get("upvoted_by", [])
    if user["id"] in upvoted_by:
        # Remove upvote
        await db.reports.update_one(
            {"id": report_id},
            {"$pull": {"upvoted_by": user["id"]}, "$inc": {"upvotes": -1}}
        )
        return {"message": "Upvote removed", "upvotes": report["upvotes"] - 1}
    else:
        # Add upvote
        await db.reports.update_one(
            {"id": report_id},
            {"$push": {"upvoted_by": user["id"]}, "$inc": {"upvotes": 1}}
        )
        if report.get("user_id") and report.get("user_id") != user["id"]:
            notif_doc = {
                "id": str(uuid.uuid4()),
                "user_id": report["user_id"],
                "type": "like",
                "report_id": report_id,
                "message": f"{user['full_name']} liked your report",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "read": False
            }
            await db.notifications.insert_one(notif_doc)
        return {"message": "Upvoted", "upvotes": report["upvotes"] + 1}

@api_router.get("/reports/user/mine")
async def get_my_reports(user: dict = Depends(get_current_user)):
    reports = await db.reports.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reports

@api_router.get("/reports/user/{user_id}")
async def get_user_reports(user_id: str):
    reports = await db.reports.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reports

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    user_key = user["id"]
    if user.get("role") == "moderator":
        user_key = "moderator"
    notifications = await db.notifications.find(
        {"user_id": user_key},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return notifications

@api_router.post("/notifications/mark-read")
async def mark_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Notifications marked as read"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total = await db.reports.count_documents({})
    
    # Category counts
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    category_counts = await db.reports.aggregate(pipeline).to_list(20)
    categories = {item["_id"]: item["count"] for item in category_counts}
    
    # Location hotspots
    location_pipeline = [
        {"$group": {"_id": "$location_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    hotspots = await db.reports.aggregate(location_pipeline).to_list(5)
    
    # Status counts
    open_count = await db.reports.count_documents({"status": "Open"})
    fixed_count = await db.reports.count_documents({"status": "Fixed"})
    
    return {
        "total_reports": total,
        "open_reports": open_count,
        "fixed_reports": fixed_count,
        "categories": categories,
        "hotspots": [{"location": h["_id"], "count": h["count"]} for h in hotspots]
    }

# ==================== COMMUNITY HUB ====================

@api_router.post("/community/request-membership")
async def request_membership(request: MembershipRequest, user: dict = Depends(get_current_user)):
    existing = await db.membership_requests.find_one({"user_id": user["id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request")
    
    if user.get("is_community_member"):
        raise HTTPException(status_code=400, detail="You are already a community member")
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["full_name"],
        "user_email": user["email"],
        "reason": request.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.membership_requests.insert_one(request_doc)
    # Notify moderators
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": "moderator",
        "type": "membership_request",
        "report_id": request_doc["id"],
        "message": f"{user['full_name']} requested to join the community",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    })
    return {"message": "Membership request submitted", "status": "pending"}

@api_router.get("/community/membership-requests")
async def get_membership_requests(user: dict = Depends(get_moderator)):
    requests = await db.membership_requests.find({"status": "pending"}, {"_id": 0}).to_list(100)
    return requests

@api_router.post("/community/membership-requests/{request_id}/approve")
async def approve_membership(request_id: str, user: dict = Depends(get_moderator)):
    request = await db.membership_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.membership_requests.update_one({"id": request_id}, {"$set": {"status": "approved"}})
    await db.users.update_one({"id": request["user_id"]}, {"$set": {"is_community_member": True}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": request["user_id"],
        "type": "membership_approved",
        "report_id": request_id,
        "message": "Your community membership was approved",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    })
    return {"message": "Membership approved"}

@api_router.post("/community/membership-requests/{request_id}/reject")
async def reject_membership(request_id: str, user: dict = Depends(get_moderator)):
    req = await db.membership_requests.find_one({"id": request_id})
    await db.membership_requests.update_one({"id": request_id}, {"$set": {"status": "rejected"}})
    if req:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": req["user_id"],
            "type": "membership_rejected",
            "report_id": request_id,
            "message": "Your community membership was rejected",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read": False
        })
    return {"message": "Membership rejected"}

# ==================== EVENTS ====================

@api_router.post("/events")
async def create_event(event_data: EventCreate, user: dict = Depends(get_moderator)):
    event_id = str(uuid.uuid4())
    event_doc = {
        "id": event_id,
        "title": event_data.title,
        "description": event_data.description,
        "event_date": event_data.event_date,
        "location": event_data.location,
        "max_participants": event_data.max_participants,
        "participants": [],
        "created_by": user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(event_doc)
    return event_doc

@api_router.get("/events")
async def get_events():
    events = await db.events.find({}, {"_id": 0}).sort("event_date", 1).to_list(50)
    return events

@api_router.post("/events/{event_id}/join")
async def join_event(event_id: str, user: dict = Depends(get_current_user)):
    if not user.get("is_community_member"):
        raise HTTPException(status_code=403, detail="You must be a community member to join events")
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if user["id"] in event.get("participants", []):
        raise HTTPException(status_code=400, detail="Already joined this event")
    
    if len(event.get("participants", [])) >= event.get("max_participants", 0):
        raise HTTPException(status_code=400, detail="Event is full")
    
    await db.events.update_one({"id": event_id}, {"$push": {"participants": user["id"]}})
    return {"message": "Successfully joined event"}

@api_router.post("/events/{event_id}/leave")
async def leave_event(event_id: str, user: dict = Depends(get_current_user)):
    await db.events.update_one({"id": event_id}, {"$pull": {"participants": user["id"]}})
    return {"message": "Left event"}

# ==================== COMMUNITY POSTS ====================

@api_router.post("/community/posts")
async def create_community_post(post: CommunityPostCreate, user: dict = Depends(get_current_user)):
    if not user.get("is_community_member"):
        raise HTTPException(status_code=403, detail="Community membership required")
    post_doc = {
        "id": str(uuid.uuid4()),
        "title": post.title,
        "content": post.content,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.community_posts.insert_one(post_doc)
    # Notify moderators
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": "moderator",
        "type": "community_post",
        "report_id": post_doc["id"],
        "message": f"{user['full_name']} submitted a community post",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    })
    return {"message": "Post submitted for approval"}

@api_router.get("/community/posts")
async def get_community_posts(status: Optional[str] = "approved"):
    query = {}
    if status:
        query["status"] = status
    posts = await db.community_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return posts

@api_router.get("/community/posts/pending")
async def get_pending_posts(user: dict = Depends(get_moderator)):
    posts = await db.community_posts.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return posts

@api_router.post("/community/posts/{post_id}/approve")
async def approve_post(post_id: str, user: dict = Depends(get_moderator)):
    post = await db.community_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.community_posts.update_one({"id": post_id}, {"$set": {"status": "approved"}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": post["user_id"],
        "type": "post_approved",
        "report_id": post_id,
        "message": "Your community post was approved",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    })
    return {"message": "Post approved"}

@api_router.post("/community/posts/{post_id}/reject")
async def reject_post(post_id: str, user: dict = Depends(get_moderator)):
    post = await db.community_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.community_posts.update_one({"id": post_id}, {"$set": {"status": "rejected"}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": post["user_id"],
        "type": "post_rejected",
        "report_id": post_id,
        "message": "Your community post was rejected",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    })
    return {"message": "Post rejected"}

# ==================== FIXI CHATBOT ====================

@api_router.post("/chat")
async def chat_with_fixi(chat_data: ChatMessage, user: dict = Depends(get_current_user)):
    session_id = chat_data.session_id or f"fixi-{user['id']}"
    response = await fixi_chat(chat_data.message, session_id)
    
    # Store chat history
    chat_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "user_message": chat_data.message,
        "bot_response": response,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_history.insert_one(chat_doc)
    
    return {"response": response, "session_id": session_id}

@api_router.get("/chat/history")
async def get_chat_history(user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return history

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "Fixify API - See it. Say it. Report it."}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
