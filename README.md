# Fixify

An AI-powered civic issue reporting platform for Nepal.

**Stack**
- Frontend: React (CRA + CRACO), Tailwind, Radix UI
- Backend: FastAPI (Python), MongoDB
- AI: OpenRouter, CLIP, and local ML fallback
- Maps: Leaflet / OpenStreetMap
- Infra: Docker + Docker Compose

## Local Setup

1. Copy `backend/.env.example` to `backend/.env` and fill in your secrets:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=fixify
JWT_SECRET=replace-me
CORS_ORIGINS=http://localhost:3000
OPENROUTER_API_KEY=replace-me
```

2. Copy `frontend/.env.example` to `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

3. Start the app with Docker:

```bash
docker compose up --build
```

Frontend runs at `http://localhost:3000` and backend at `http://localhost:5000`.

## Local Setup Without Docker

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 5000
```

Frontend:

```bash
cd frontend
npm install
npm start
```

## Deployment

Recommended production setup:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

Set the frontend environment variable on Vercel:

```env
REACT_APP_BACKEND_URL=https://your-backend-url
```

Set backend environment variables on your host platform instead of committing `.env` files.
