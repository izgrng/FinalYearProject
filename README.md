# Fixify

Fixify is an AI-assisted civic reporting platform for communities to report, review, and track local issues such as road damage, waste, drainage, public safety concerns, and broken public facilities.

## Features

- User accounts with JWT authentication
- Civic issue reporting with location, category, urgency, status, comments, and upvotes
- AI-assisted report categorization and image/report analysis
- Fixi AI chatbot for user support and civic guidance
- Dashboard with report status, category trends, hotspots, review queues, and Fixi chat activity
- Community posts, membership requests, events, and notifications
- Leaflet/OpenStreetMap based maps with no Google Maps API key required

## Stack

- Frontend: React, CRACO, Tailwind CSS, Radix UI, Leaflet
- Backend: FastAPI, Motor, MongoDB
- AI: OpenRouter, OpenAI fallback for chat, CLIP/local fallback for image analysis
- Database: MongoDB Atlas or local MongoDB
- Deployment: Vercel frontend, Render backend

## Local Setup

### Backend

Copy the example environment file:

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=fixify
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=replace-with-a-strong-secret

OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_CHAT_MODEL=openrouter/free
OPENROUTER_CATEGORY_MODEL=openrouter/free
OPENROUTER_VISION_MODEL=openrouter/free

OPENAI_API_KEY=your_openai_api_key_here
OPENAI_CHAT_MODEL=gpt-4o-mini
CHAT_MAX_TOKENS=500
CHAT_PROVIDER_ORDER=openrouter,openai

CLIP_MODEL_NAME=openai/clip-vit-base-patch32
ENABLE_CLIP_IMAGE_ANALYSIS=true
OPENROUTER_REFERER=http://localhost:3000
OPENROUTER_TITLE=Fixify
```

Run the backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 5000
```

### Frontend

Copy the example environment file:

```bash
cp frontend/.env.example frontend/.env
```

Fill in `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

Run the frontend:

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`.
Backend runs at `http://localhost:5000`.

## Docker

You can also run the project with Docker Compose:

```bash
docker compose up --build
```

## Deployment

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

Frontend environment variable:

```env
REACT_APP_BACKEND_URL=https://your-backend-url
```

Backend environment variables should be configured in the hosting platform. Do not commit real `.env` files or API keys.

## Notes

- This project does not use Google Maps. Do not add `REACT_APP_GOOGLE_MAPS_API_KEY`.
- Maps are powered by Leaflet and OpenStreetMap.
- Fixi AI uses OpenRouter first and OpenAI as a fallback for chat responses.
- Report categorization uses OpenRouter first, then local fallback rules if the AI service is unavailable.
