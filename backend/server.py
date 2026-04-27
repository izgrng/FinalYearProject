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
import httpx
import json
import io
import math
import re

try:
    from PIL import Image
    from transformers import pipeline
except Exception:
    Image = None
    pipeline = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
MODEL_PATH = ROOT_DIR / "ml" / "model.joblib"
_ml_model = None
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_CHAT_MODEL = os.environ.get("OPENROUTER_CHAT_MODEL", "openrouter/free").strip()
OPENROUTER_CATEGORY_MODEL = os.environ.get("OPENROUTER_CATEGORY_MODEL", "openrouter/free").strip()
OPENROUTER_VISION_MODEL = os.environ.get("OPENROUTER_VISION_MODEL", "openrouter/free").strip()
CLIP_MODEL_NAME = os.environ.get("CLIP_MODEL_NAME", "openai/clip-vit-base-patch32").strip()
OPENROUTER_REFERER = os.environ.get("OPENROUTER_REFERER", "http://localhost:3000").strip()
OPENROUTER_TITLE = os.environ.get("OPENROUTER_TITLE", "Fixify").strip()
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
REPORT_STATUS_OPTIONS = [
    "Needs Review",
    "Open",
    "Under Review",
    "In Progress",
    "Fixed",
]
URGENCY_ORDER = {"high": 3, "medium": 2, "low": 1}
_clip_classifier = None

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
    title: Optional[str] = None
    description: Optional[str] = None
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
    related_report_ids: List[str] = Field(default_factory=list)

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

class CommunityPostCommentCreate(BaseModel):
    text: str

class EventUpdateCreate(BaseModel):
    text: str
    outcome: Optional[str] = None
    image_base64: Optional[str] = None

class ReportStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def to_data_url(image_base64: Optional[str]) -> Optional[str]:
    if not image_base64:
        return None
    return f"data:image/jpeg;base64,{image_base64}"

def ensure_valid_email(email: str) -> str:
    email = email.strip().lower()
    if not email or len(email) > 120:
        raise HTTPException(status_code=400, detail="Please provide a valid email address")
    return email

def ensure_valid_full_name(full_name: str) -> str:
    full_name = " ".join(full_name.strip().split())
    if len(full_name) < 2 or len(full_name) > 80:
        raise HTTPException(status_code=400, detail="Full name must be between 2 and 80 characters")
    if not re.search(r"[A-Za-z]", full_name):
        raise HTTPException(status_code=400, detail="Full name must include letters")
    return full_name

def ensure_valid_password(password: str) -> str:
    if len(password) < 6 or len(password) > 128:
        raise HTTPException(status_code=400, detail="Password must be between 6 and 128 characters")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must include at least one letter and one number")
    return password

def ensure_report_text(value: str, field_name: str, min_len: int, max_len: int) -> str:
    cleaned = " ".join((value or "").strip().split())
    if len(cleaned) < min_len or len(cleaned) > max_len:
        raise HTTPException(status_code=400, detail=f"{field_name} must be between {min_len} and {max_len} characters")
    return cleaned

def ensure_optional_text(value: Optional[str], field_name: str, max_len: int) -> Optional[str]:
    if value is None:
        return None
    cleaned = " ".join(value.strip().split())
    if len(cleaned) > max_len:
        raise HTTPException(status_code=400, detail=f"{field_name} must be at most {max_len} characters")
    return cleaned

def normalize_text(value: Optional[str]) -> str:
    return " ".join((value or "").strip().split())

def ensure_valid_report_status(status: str) -> str:
    cleaned = " ".join((status or "").strip().split())
    if cleaned not in REPORT_STATUS_OPTIONS:
        raise HTTPException(status_code=400, detail="Invalid report status")
    return cleaned

def tokenize_for_similarity(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2}

def similarity_score(a: str, b: str) -> float:
    tokens_a = tokenize_for_similarity(a)
    tokens_b = tokenize_for_similarity(b)
    if not tokens_a or not tokens_b:
        return 0.0
    overlap = len(tokens_a & tokens_b)
    return overlap / max(len(tokens_a), len(tokens_b))

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))

def determine_urgency(category: str, title: str, description: str, image_analysis: str = "") -> dict:
    combined = f"{title} {description} {image_analysis}".lower()
    score = 0.25
    reasons = []

    category_weights = {
        "Public Safety": 0.82,
        "Electricity & Street Facilities": 0.78,
        "Water & Drainage": 0.6,
        "Road & Transport": 0.58,
        "Waste & Sanitation": 0.52,
        "Environment": 0.48,
        "Public Facilities": 0.46,
        "Other / Unclassified": 0.4,
    }
    score = max(score, category_weights.get(category, 0.4))
    reasons.append(f"Base urgency from {category.lower()} category")

    high_keywords = [
        "danger", "hazard", "fire", "flood", "collapsed", "collapse", "electrical",
        "exposed wire", "accident", "injury", "unsafe", "blocked emergency", "sinkhole",
        "burst pipe", "sewage", "sparking", "live wire", "landslide",
    ]
    medium_keywords = [
        "leak", "overflow", "pothole", "broken", "cracked", "traffic", "blocked road",
        "streetlight", "garbage", "waste", "smell", "drain", "waterlogging",
    ]

    if any(keyword in combined for keyword in high_keywords):
        score = max(score, 0.86)
        reasons.append("Description includes high-risk safety indicators")
    elif any(keyword in combined for keyword in medium_keywords):
        score = max(score, 0.62)
        reasons.append("Description suggests an issue affecting daily access or hygiene")

    if "school" in combined or "hospital" in combined or "main road" in combined:
        score = max(score, 0.8)
        reasons.append("Reported near a sensitive or high-traffic public area")

    if score >= 0.8:
        level = "high"
    elif score >= 0.55:
        level = "medium"
    else:
        level = "low"

    return {
        "level": level,
        "score": round(score, 2),
        "reason": reasons[-1] if reasons else "Standard issue triage",
    }

def create_timeline_entry(event_type: str, title: str, description: str, actor_id: str, actor_name: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "title": title,
        "description": description,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

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

def _extract_json_object(text: str) -> Optional[dict]:
    if not text:
        return None
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except Exception:
        return None

def _normalize_category(category: Optional[str]) -> str:
    if not category:
        return "Other / Unclassified"

    normalized = category.strip().lower()
    for option in CATEGORY_OPTIONS:
        if normalized == option.lower():
            return option

    if "electric" in normalized or "street" in normalized or "light" in normalized:
        return "Electricity & Street Facilities"
    if "water" in normalized or "drain" in normalized or "leak" in normalized:
        return "Water & Drainage"
    if "waste" in normalized or "garbage" in normalized or "trash" in normalized:
        return "Waste & Sanitation"
    if "road" in normalized or "transport" in normalized or "pothole" in normalized:
        return "Road & Transport"
    if "safety" in normalized or "crime" in normalized or "danger" in normalized:
        return "Public Safety"
    if "environment" in normalized or "pollution" in normalized or "tree" in normalized:
        return "Environment"
    if "facility" in normalized or "park" in normalized or "toilet" in normalized or "school" in normalized:
        return "Public Facilities"
    return "Other / Unclassified"

def _fallback_category(title: str, description: str, image_analysis: str = "") -> str:
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

async def call_openrouter_completion(messages: List[dict], model: str, temperature: float = 0.2) -> Optional[dict]:
    if not OPENROUTER_API_KEY:
        return None

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": OPENROUTER_TITLE,
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"OpenRouter completion error: {e}")
        return None

def get_clip_classifier():
    global _clip_classifier
    if _clip_classifier is not None:
        return _clip_classifier
    if pipeline is None:
        return None
    try:
        _clip_classifier = pipeline(
            "zero-shot-image-classification",
            model=CLIP_MODEL_NAME,
        )
        return _clip_classifier
    except Exception as e:
        logger.error(f"CLIP pipeline load error: {e}")
        _clip_classifier = None
        return None

def classify_image_with_clip(image_base64: str) -> Optional[dict]:
    if Image is None:
        return None

    classifier = get_clip_classifier()
    if classifier is None:
        return None

    labels = [
        "a photo of a pothole or damaged road",
        "a photo of water leakage or drainage overflow",
        "a photo of garbage, waste, or trash on the street",
        "a photo of a broken streetlight, electric wire, or public lighting issue",
        "a photo of an unsafe public area or safety hazard",
        "a photo of pollution, smoke, river contamination, or environmental damage",
        "a photo of a damaged public toilet, park, school, or facility",
        "a normal photo with no visible civic issue",
    ]
    label_to_category = {
        "a photo of a pothole or damaged road": "Road & Transport",
        "a photo of water leakage or drainage overflow": "Water & Drainage",
        "a photo of garbage, waste, or trash on the street": "Waste & Sanitation",
        "a photo of a broken streetlight, electric wire, or public lighting issue": "Electricity & Street Facilities",
        "a photo of an unsafe public area or safety hazard": "Public Safety",
        "a photo of pollution, smoke, river contamination, or environmental damage": "Environment",
        "a photo of a damaged public toilet, park, school, or facility": "Public Facilities",
        "a normal photo with no visible civic issue": "Other / Unclassified",
    }

    try:
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        predictions = classifier(image, candidate_labels=labels)
        if not predictions:
            return None
        best = predictions[0]
        best_label = best.get("label", "a normal photo with no visible civic issue")
        score = float(best.get("score", 0.0))
        category = label_to_category.get(best_label, "Other / Unclassified")
        is_valid = category != "Other / Unclassified" and score >= 0.20
        return {
            "is_valid": is_valid,
            "reason": f"CLIP matched the image to '{best_label}' with confidence {score:.2f}.",
            "detected_issue": best_label.replace("a photo of ", "").strip(),
            "category": category,
            "confidence": score,
            "source": "clip",
        }
    except Exception as e:
        logger.error(f"CLIP image classification error: {e}")
        return None

async def analyze_image_content_openrouter(image_base64: str) -> dict:
    """Analyze uploaded issue image using OpenRouter vision with safe fallback."""
    data_url = f"data:image/jpeg;base64,{image_base64}"
    messages = [
        {
            "role": "system",
            "content": (
                "You analyze civic issue images for Fixify. "
                "Return only valid JSON with keys: is_valid, reason, detected_issue. "
                "is_valid must be true if the image plausibly shows a real community issue such as potholes, garbage, "
                "water leakage, damaged infrastructure, unsafe public areas, pollution, or public facility problems. "
                "Keep detected_issue short and specific."
            ),
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Analyze this civic issue image and respond in JSON only."},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        },
    ]

    response = await call_openrouter_completion(messages, OPENROUTER_VISION_MODEL, temperature=0.1)
    if response:
        content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        parsed = _extract_json_object(content)
        if parsed:
            return {
                "is_valid": bool(parsed.get("is_valid", True)),
                "reason": str(parsed.get("reason", "Image analyzed by AI.")),
                "detected_issue": str(parsed.get("detected_issue", "Reported issue")),
                "category": _normalize_category(parsed.get("category")),
                "confidence": float(parsed.get("confidence", 0.7)) if parsed.get("confidence") is not None else 0.7,
                "source": "openrouter-vision",
            }

    return {
        "is_valid": True,
        "reason": "AI image analysis unavailable; accepted with fallback.",
        "detected_issue": "Reported issue",
        "category": "Other / Unclassified",
        "confidence": 0.0,
        "source": "fallback",
    }

async def analyze_image_content(image_base64: str) -> dict:
    """Analyze uploaded image with CLIP first, then OpenRouter vision fallback."""
    clip_result = classify_image_with_clip(image_base64)
    if clip_result:
        return clip_result
    return await analyze_image_content_openrouter(image_base64)

async def categorize_report(title: str, description: str, image_analysis: str = "") -> dict:
    """AI-first categorization with local ML and keyword fallback."""
    global _ml_model
    messages = [
        {
            "role": "system",
            "content": (
                "You categorize civic issue reports for Fixify. "
                f"Allowed categories: {', '.join(CATEGORY_OPTIONS)}. "
                "Return JSON only with keys: category, confidence, reason. "
                "confidence must be a number between 0 and 1. "
                "reason must be one short sentence."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Title: {title}\n"
                f"Description: {description}\n"
                f"Image analysis: {image_analysis or 'None'}\n\n"
                "Choose the single best category."
            ),
        },
    ]

    response = await call_openrouter_completion(messages, OPENROUTER_CATEGORY_MODEL, temperature=0.1)
    if response:
        content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        parsed = _extract_json_object(content)
        if parsed:
            category = _normalize_category(parsed.get("category"))
            try:
                confidence = float(parsed.get("confidence", 0.85))
            except Exception:
                confidence = 0.85
            confidence = max(0.0, min(confidence, 1.0))
            return {
                "category": category,
                "confidence": confidence,
                "reason": str(parsed.get("reason", "Categorized by AI based on the report details.")),
                "source": "openrouter",
            }

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
            return {
                "category": _normalize_category(pred),
                "confidence": 0.78,
                "reason": "Categorized by the local ML fallback model.",
                "source": "local-ml",
            }
        except Exception as e:
            logger.error(f"ML categorization error: {e}")

    return {
        "category": _fallback_category(title, description, image_analysis),
        "confidence": 0.62,
        "reason": "Categorized by keyword-based fallback rules.",
        "source": "rules",
    }

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

async def call_openrouter_chat(messages: List[dict]) -> Optional[str]:
    """Call OpenRouter chat completions API and return the first text response."""
    if not OPENROUTER_API_KEY:
        return None

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": OPENROUTER_TITLE,
    }
    payload = {
        "model": OPENROUTER_CHAT_MODEL,
        "messages": messages,
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                return None
            return choices[0].get("message", {}).get("content")
    except Exception as e:
        logger.error(f"OpenRouter chat error: {e}")
        return None

async def fixi_chat_ai(message: str, session_id: str, user: dict) -> str:
    """Professional Fixi assistant powered by OpenRouter with rule fallback."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are Fixi, the professional civic issue assistant for the Fixify platform. "
                "Help users report local issues, understand categories, use the map, understand the dashboard, "
                "and navigate community and moderator-related features. "
                "Be clear, practical, concise, and professional. "
                "Do not invent features the platform does not support."
            ),
        },
        {
            "role": "system",
            "content": (
                f"User name: {user.get('full_name', 'Unknown')}. "
                f"User role: {user.get('role', 'user')}. "
                f"Community member: {user.get('is_community_member', False)}. "
                f"Session id: {session_id}."
            ),
        },
        {"role": "user", "content": message},
    ]

    ai_response = await call_openrouter_chat(messages)
    if ai_response:
        return ai_response.strip()

    return await fixi_chat(message, session_id)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    email = ensure_valid_email(user_data.email)
    password = ensure_valid_password(user_data.password)
    full_name = ensure_valid_full_name(user_data.full_name)
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "password": hash_password(password),
        "full_name": full_name,
        "role": "user",
        "is_community_member": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, email, "user")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": "user",
            "is_community_member": False
        }
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    email = ensure_valid_email(user_data.email)
    if not user_data.password:
        raise HTTPException(status_code=400, detail="Password is required")
    user = await db.users.find_one({"email": email}, {"_id": 0})
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
    raw_title = normalize_text(report_data.title)
    raw_description = normalize_text(report_data.description)
    location_name = ensure_optional_text(report_data.location_name or "Pinned location", "Location name", 160) or "Pinned location"
    if not (-90 <= report_data.latitude <= 90) or not (-180 <= report_data.longitude <= 180):
        raise HTTPException(status_code=400, detail="Please provide a valid map location")
    if not report_data.image_base64 and (not raw_title or not raw_description):
        raise HTTPException(
            status_code=400,
            detail="Please provide both title and description, or upload an image to report the issue.",
        )

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
    category_result = await categorize_report(raw_title, raw_description, image_analysis)
    category = category_result["category"]
    fallback_issue = image_analysis or category.lower()
    title = raw_title if len(raw_title) >= 5 else f"Reported {fallback_issue}".strip().capitalize()
    if len(title) > 120:
        title = title[:117].rstrip() + "..."
    description = (
        raw_description
        if len(raw_description) >= 10
        else f"Issue reported from uploaded image showing {fallback_issue}."
    )
    title = ensure_report_text(title, "Title", 5, 120)
    description = ensure_report_text(description, "Description", 10, 1000)
    urgency = determine_urgency(category, title, description, image_analysis)

    duplicate_candidates = await db.reports.find(
        {"status": {"$ne": "Fixed"}, "category": category},
        {"_id": 0, "id": 1, "title": 1, "description": 1, "latitude": 1, "longitude": 1}
    ).sort("created_at", -1).limit(50).to_list(50)

    duplicate_of = None
    duplicate_score = 0.0
    combined_text = f"{title} {description} {image_analysis}".strip()
    for candidate in duplicate_candidates:
        distance = haversine_km(
            report_data.latitude,
            report_data.longitude,
            candidate.get("latitude", 0),
            candidate.get("longitude", 0),
        )
        text_score = similarity_score(combined_text, f"{candidate.get('title', '')} {candidate.get('description', '')}")
        if distance <= 0.35 and text_score >= 0.35:
            duplicate_of = candidate["id"]
            duplicate_score = max(text_score, 1 - min(distance / 0.35, 1))
            break
    
    report_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    timeline = [
        create_timeline_entry(
            "submitted",
            "Report submitted",
            "The issue was submitted by the reporting user.",
            user["id"],
            user["full_name"],
        ),
        create_timeline_entry(
            "ai_triage",
            "AI triage completed",
            f"Categorized as {category} with {urgency['level']} urgency.",
            "fixify-ai",
            "Fixify AI",
        ),
    ]
    if duplicate_of:
        timeline.append(
            create_timeline_entry(
                "duplicate_flag",
                "Possible duplicate flagged",
                f"The report appears similar to report {duplicate_of} and was sent for moderator review.",
                "fixify-ai",
                "Fixify AI",
            )
        )
    report_doc = {
        "id": report_id,
        "title": title,
        "description": description,
        "category": category,
        "status": "Needs Review" if duplicate_of else "Open",
        "latitude": report_data.latitude,
        "longitude": report_data.longitude,
        "location_name": location_name,
        "image_base64": report_data.image_base64,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "ai_analysis": image_analysis,
        "ai_reason": category_result.get("reason"),
        "ai_confidence": category_result.get("confidence"),
        "ai_source": category_result.get("source"),
        "urgency": urgency["level"],
        "urgency_score": urgency["score"],
        "urgency_reason": urgency["reason"],
        "duplicate_of": duplicate_of,
        "duplicate_score": duplicate_score if duplicate_of else None,
        "created_at": created_at,
        "updated_at": created_at,
        "resolved_at": None,
        "timeline": timeline,
        "upvotes": 0,
        "upvoted_by": [],
        "comments": [],
        "comments_count": 0
    }
    await db.reports.insert_one(report_doc)
    
    return {
        "id": report_id,
        "title": title,
        "description": description,
        "category": category,
        "status": report_doc["status"],
        "latitude": report_data.latitude,
        "longitude": report_data.longitude,
        "location_name": location_name,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "ai_analysis": image_analysis,
        "ai_reason": category_result.get("reason"),
        "ai_confidence": category_result.get("confidence"),
        "ai_source": category_result.get("source"),
        "urgency": urgency["level"],
        "urgency_score": urgency["score"],
        "urgency_reason": urgency["reason"],
        "duplicate_of": duplicate_of,
        "duplicate_score": duplicate_score if duplicate_of else None,
        "created_at": created_at,
        "timeline": timeline,
        "upvotes": 0,
        "message": (
            f"Report categorized as '{category}' by AI"
            + (f" and flagged as a possible duplicate of report {duplicate_of}" if duplicate_of else "")
        )
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
        updates["title"] = ensure_report_text(update.title, "Title", 5, 120)
    if update.description is not None:
        updates["description"] = ensure_report_text(update.description, "Description", 10, 1000)

    if updates:
        # Re-categorize if text changes
        category_result = await categorize_report(
            updates.get("title", report.get("title", "")),
            updates.get("description", report.get("description", "")),
            report.get("ai_analysis", "")
        )
        urgency = determine_urgency(
            category_result["category"],
            updates.get("title", report.get("title", "")),
            updates.get("description", report.get("description", "")),
            report.get("ai_analysis", "")
        )
        timeline = report.get("timeline", [])
        timeline.append(
            create_timeline_entry(
                "report_updated",
                "Report details updated",
                "The report text changed and AI triage was recalculated.",
                user["id"],
                user["full_name"],
            )
        )
        updates["category"] = category_result["category"]
        updates["ai_reason"] = category_result.get("reason")
        updates["ai_confidence"] = category_result.get("confidence")
        updates["ai_source"] = category_result.get("source")
        updates["urgency"] = urgency["level"]
        updates["urgency_score"] = urgency["score"]
        updates["urgency_reason"] = urgency["reason"]
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["timeline"] = timeline
        await db.reports.update_one({"id": report_id}, {"$set": updates})

    updated = await db.reports.find_one({"id": report_id}, {"_id": 0})
    return updated

@api_router.post("/reports/{report_id}/status")
async def update_report_status(
    report_id: str,
    status_update: ReportStatusUpdate,
    user: dict = Depends(get_moderator),
):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    next_status = ensure_valid_report_status(status_update.status)
    note = ensure_optional_text(status_update.note, "Status note", 280)
    timeline = report.get("timeline", [])
    default_descriptions = {
        "Needs Review": "The report needs moderator verification before further action.",
        "Open": "The report is visible and awaiting action.",
        "Under Review": "A moderator is reviewing the issue details.",
        "In Progress": "Action has started on this issue.",
        "Fixed": "The issue has been marked as resolved.",
    }
    timeline.append(
        create_timeline_entry(
            "status_update",
            f"Status changed to {next_status}",
            note or default_descriptions[next_status],
            user["id"],
            user["full_name"],
        )
    )

    updates = {
        "status": next_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "timeline": timeline,
    }
    updates["resolved_at"] = updates["updated_at"] if next_status == "Fixed" else None
    await db.reports.update_one({"id": report_id}, {"$set": updates})

    if report.get("user_id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": report["user_id"],
            "type": "status_update",
            "report_id": report_id,
            "message": f"Your report '{report.get('title', 'Untitled report')}' is now {next_status}",
            "created_at": updates["updated_at"],
            "read": False,
        })

    return await db.reports.find_one({"id": report_id}, {"_id": 0})

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
    comment_text = ensure_report_text(comment.text, "Comment", 2, 500)
    comment_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["full_name"],
        "text": comment_text,
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
    
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts_raw = await db.reports.aggregate(status_pipeline).to_list(20)
    status_counts = {item["_id"]: item["count"] for item in status_counts_raw}

    urgency_pipeline = [
        {"$group": {"_id": "$urgency", "count": {"$sum": 1}}}
    ]
    urgency_counts_raw = await db.reports.aggregate(urgency_pipeline).to_list(10)
    urgency_counts = {item["_id"]: item["count"] for item in urgency_counts_raw if item.get("_id")}

    open_count = sum(
        status_counts.get(status, 0)
        for status in ["Open", "Under Review", "In Progress"]
    )
    fixed_count = status_counts.get("Fixed", 0)
    needs_review_count = status_counts.get("Needs Review", 0)
    duplicate_count = await db.reports.count_documents({"duplicate_of": {"$ne": None}})
    low_confidence_count = await db.reports.count_documents({"ai_confidence": {"$lt": 0.6}})
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    resolved_this_week = await db.reports.count_documents({
        "status": "Fixed",
        "resolved_at": {"$gte": week_ago},
    })

    queue_docs = await db.reports.find(
        {"status": {"$in": ["Needs Review", "Open", "Under Review", "In Progress"]}},
        {
            "_id": 0,
            "id": 1,
            "title": 1,
            "status": 1,
            "category": 1,
            "location_name": 1,
            "created_at": 1,
            "urgency": 1,
            "urgency_score": 1,
            "ai_confidence": 1,
            "duplicate_of": 1,
        },
    ).sort("created_at", -1).limit(20).to_list(20)
    review_queue = sorted(
        queue_docs,
        key=lambda item: (
            -URGENCY_ORDER.get(item.get("urgency", "low"), 1),
            item.get("ai_confidence", 1),
            item.get("created_at", ""),
        ),
    )[:6]

    last_seven_days = [
        (datetime.now(timezone.utc) - timedelta(days=offset)).date().isoformat()
        for offset in range(6, -1, -1)
    ]
    created_trend_raw = await db.reports.aggregate([
        {"$project": {"day": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
    ]).to_list(50)
    fixed_trend_raw = await db.reports.aggregate([
        {"$match": {"resolved_at": {"$ne": None}}},
        {"$project": {"day": {"$substr": ["$resolved_at", 0, 10]}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
    ]).to_list(50)
    created_lookup = {item["_id"]: item["count"] for item in created_trend_raw}
    fixed_lookup = {item["_id"]: item["count"] for item in fixed_trend_raw}
    trend = [
        {
            "date": day,
            "submitted": created_lookup.get(day, 0),
            "resolved": fixed_lookup.get(day, 0),
        }
        for day in last_seven_days
    ]

    return {
        "total_reports": total,
        "open_reports": open_count,
        "fixed_reports": fixed_count,
        "needs_review_reports": needs_review_count,
        "duplicates_count": duplicate_count,
        "resolved_this_week": resolved_this_week,
        "low_confidence_count": low_confidence_count,
        "categories": categories,
        "status_counts": status_counts,
        "urgency_counts": urgency_counts,
        "hotspots": [{"location": h["_id"], "count": h["count"]} for h in hotspots],
        "review_queue": review_queue,
        "trend": trend,
    }

# ==================== COMMUNITY HUB ====================

@api_router.post("/community/request-membership")
async def request_membership(request: MembershipRequest, user: dict = Depends(get_current_user)):
    existing = await db.membership_requests.find_one({"user_id": user["id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request")
    
    if user.get("is_community_member"):
        raise HTTPException(status_code=400, detail="You are already a community member")
    
    reason = ensure_report_text(request.reason, "Reason", 10, 500)
    request_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["full_name"],
        "user_email": user["email"],
        "reason": reason,
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
    title = ensure_report_text(event_data.title, "Event title", 5, 120)
    description = ensure_report_text(event_data.description, "Event description", 10, 1000)
    location = ensure_report_text(event_data.location, "Event location", 3, 160)
    if event_data.max_participants < 1 or event_data.max_participants > 1000:
        raise HTTPException(status_code=400, detail="Max participants must be between 1 and 1000")
    related_report_ids = [report_id for report_id in event_data.related_report_ids if report_id]
    event_id = str(uuid.uuid4())
    event_doc = {
        "id": event_id,
        "title": title,
        "description": description,
        "event_date": event_data.event_date,
        "location": location,
        "max_participants": event_data.max_participants,
        "related_report_ids": related_report_ids,
        "participants": [],
        "updates": [],
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

@api_router.post("/events/{event_id}/updates")
async def add_event_update(event_id: str, update_data: EventUpdateCreate, user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.get("role") != "moderator" and user["id"] not in event.get("participants", []):
        raise HTTPException(status_code=403, detail="Join the event or use a moderator account to post updates")

    text = ensure_report_text(update_data.text, "Event update", 5, 1000)
    outcome = ensure_optional_text(update_data.outcome, "Outcome", 240)
    update_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["full_name"],
        "text": text,
        "outcome": outcome,
        "image_base64": update_data.image_base64,
        "image_url": to_data_url(update_data.image_base64),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.events.update_one({"id": event_id}, {"$push": {"updates": update_doc}})
    return update_doc

# ==================== COMMUNITY POSTS ====================

@api_router.post("/community/posts")
async def create_community_post(post: CommunityPostCreate, user: dict = Depends(get_current_user)):
    if not user.get("is_community_member"):
        raise HTTPException(status_code=403, detail="Community membership required")
    title = ensure_report_text(post.title, "Post title", 5, 120)
    content = ensure_report_text(post.content, "Post content", 10, 2000)
    post_doc = {
        "id": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "status": "pending",
        "comments": [],
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

@api_router.post("/community/posts/{post_id}/comments")
async def add_community_post_comment(post_id: str, comment: CommunityPostCommentCreate, user: dict = Depends(get_current_user)):
    post = await db.community_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved posts can receive comments")
    if not user.get("is_community_member") and user.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Community membership required to comment")

    comment_text = ensure_report_text(comment.text, "Comment", 2, 500)
    comment_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["full_name"],
        "text": comment_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.community_posts.update_one({"id": post_id}, {"$push": {"comments": comment_doc}})
    if post.get("user_id") and post.get("user_id") != user["id"]:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": post["user_id"],
            "type": "community_post_comment",
            "report_id": post_id,
            "message": f"{user['full_name']} commented on your community post",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read": False
        })
    return comment_doc

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
    response = await fixi_chat_ai(chat_data.message, session_id, user)
    
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

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "service": "fixify-api"}

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
