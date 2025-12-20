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
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fixify_secret_key')
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

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

class ReportCreate(BaseModel):
    title: str
    description: str
    latitude: float
    longitude: float
    location_name: str
    image_base64: Optional[str] = None

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
    """Analyze if image contains a valid community problem"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"img-{uuid.uuid4()}",
            system_message="You are an image analyzer for a civic reporting platform. Analyze images to determine if they show legitimate community problems (road damage, waste, water issues, safety hazards, etc.) or inappropriate content (selfies, random photos, unrelated images)."
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(image_base64=image_base64)
        message = UserMessage(
            text="Analyze this image. Is it a valid community problem report? Respond with JSON: {\"is_valid\": true/false, \"reason\": \"explanation\", \"detected_issue\": \"brief description of issue if valid\"}",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(message)
        
        # Parse response
        import json
        try:
            # Clean response
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            result = json.loads(clean_response)
            return result
        except:
            return {"is_valid": True, "reason": "Unable to fully analyze", "detected_issue": "Reported issue"}
    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        return {"is_valid": True, "reason": "Analysis unavailable", "detected_issue": "Reported issue"}

async def categorize_report(title: str, description: str, image_analysis: str = "") -> str:
    """AI triage to categorize the report"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"triage-{uuid.uuid4()}",
            system_message="You are an AI triage system for categorizing civic issues. Categories: Waste (garbage, litter, dumping), Road (potholes, damaged roads, traffic issues), Water (leaks, flooding, contamination), Safety (crime, harassment, abuse, dangerous areas), Infrastructure (electricity, buildings, bridges), Environment (pollution, deforestation), Other. Respond with ONLY the category name."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"Title: {title}\nDescription: {description}\n{f'Image shows: {image_analysis}' if image_analysis else ''}\n\nCategory:"
        response = await chat.send_message(UserMessage(text=prompt))
        
        category = response.strip()
        valid_categories = ["Waste", "Road", "Water", "Safety", "Infrastructure", "Environment", "Other"]
        for cat in valid_categories:
            if cat.lower() in category.lower():
                return cat
        return "Other"
    except Exception as e:
        logger.error(f"Categorization error: {e}")
        return "Other"

async def fixi_chat(message: str, session_id: str) -> str:
    """Fixi AI chatbot for user guidance"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="""You are Fixi, a friendly AI assistant for Fixify - a civic problem reporting platform in Nepal. 
Your role is to:
1. Guide users on how to report community issues
2. Explain how the platform works
3. Share civic awareness messages
4. Encourage community participation
5. Answer questions about categories (Waste, Road, Water, Safety, Infrastructure, Environment)

Be helpful, friendly, and encourage users to report problems in their community. Keep responses concise but informative.
Start by welcoming them if they say hi/hello. Always be positive and supportive."""
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=message))
        return response
    except Exception as e:
        logger.error(f"Fixi chat error: {e}")
        return "I'm having trouble responding right now. Please try again later!"

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
        "location_name": report_data.location_name,
        "image_base64": report_data.image_base64,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "ai_analysis": image_analysis,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "upvotes": 0,
        "upvoted_by": []
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
    
    reports = await db.reports.find(query, {"_id": 0, "image_base64": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return reports

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

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
        return {"message": "Upvoted", "upvotes": report["upvotes"] + 1}

@api_router.get("/reports/user/mine")
async def get_my_reports(user: dict = Depends(get_current_user)):
    reports = await db.reports.find({"user_id": user["id"]}, {"_id": 0, "image_base64": 0}).sort("created_at", -1).to_list(100)
    return reports

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
    return {"message": "Membership approved"}

@api_router.post("/community/membership-requests/{request_id}/reject")
async def reject_membership(request_id: str, user: dict = Depends(get_moderator)):
    await db.membership_requests.update_one({"id": request_id}, {"$set": {"status": "rejected"}})
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

# ==================== SEED MODERATOR ====================

@api_router.post("/seed/moderator")
async def seed_moderator():
    """Create a default moderator account"""
    existing = await db.users.find_one({"email": "moderator@fixify.com"})
    if existing:
        return {"message": "Moderator already exists", "email": "moderator@fixify.com"}
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": "moderator@fixify.com",
        "password": hash_password("Moderator123!"),
        "full_name": "Fixify Moderator",
        "role": "moderator",
        "is_community_member": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return {"message": "Moderator created", "email": "moderator@fixify.com", "password": "Moderator123!"}

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
