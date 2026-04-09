# Fixify

An AI‑powered civic issue reporting platform for Nepal.

**Stack**
- Frontend: React (CRA + CRACO), Tailwind, Radix UI
- Backend: FastAPI (Python), MongoDB
- AI: Optional (rule-based fallback enabled by default)
- Maps: Google Maps JavaScript API
- Infra: Docker + Docker Compose

## Setup (Local)
1. Create your backend env file at `backend/.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=fixify
JWT_SECRET=replace-me
CORS_ORIGINS=http://localhost:3000
```

2. Create your frontend env file at `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=replace-me
```

3. Start the app with Docker:
```
docker-compose up --build
```

Frontend runs at `http://localhost:3000` and backend at `http://localhost:5000`.

## Setup (Without Docker)
Backend:
```
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 5000
```

Frontend:
```
cd frontend
yarn
yarn start
```
