# Fixify Deployment Guide

This project is best deployed with:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

That split works well for this repo because the frontend is a React app and the backend includes heavier Python/AI dependencies.

## 1. MongoDB Atlas

1. Create a free MongoDB Atlas cluster.
2. Create a database user.
3. Add network access for `0.0.0.0/0` during testing, or restrict it later.
4. Copy the connection string.

Use a connection string like:

```env
MONGO_URL=mongodb+srv://<username>:<password>@<cluster-url>/?
```

Database name:

```env
DB_NAME=fixify
```

## 2. Backend on Render

This repo includes [render.yaml](./render.yaml), which points Render at the `backend/` directory.

### Render dashboard setup

1. Go to Render.
2. Create a new Blueprint or Web Service from your GitHub repo.
3. If using the blueprint, Render will read `render.yaml`.
4. Add these environment variables in Render:

```env
MONGO_URL=<your atlas connection string>
DB_NAME=fixify
JWT_SECRET=<strong random secret>
CORS_ORIGINS=https://<your-vercel-domain>
OPENROUTER_API_KEY=<your openrouter key>
OPENROUTER_CHAT_MODEL=openrouter/free
OPENROUTER_CATEGORY_MODEL=openrouter/free
OPENROUTER_VISION_MODEL=openrouter/free
CLIP_MODEL_NAME=openai/clip-vit-base-patch32
OPENROUTER_REFERER=https://<your-vercel-domain>
OPENROUTER_TITLE=Fixify
```

### Backend service details

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/health`

After deploy, note your backend URL, for example:

```text
https://fixify-backend.onrender.com
```

## 3. Frontend on Vercel

This repo includes [frontend/vercel.json](./frontend/vercel.json) so React Router routes resolve to `index.html`.

### Vercel project setup

1. Go to Vercel.
2. Import the GitHub repo.
3. Set the **Root Directory** to `frontend`.
4. Confirm:
   - Framework: Create React App / Other static frontend
   - Build Command: `npm run build`
   - Output Directory: `build`

### Frontend environment variable

Add this in Vercel Project Settings:

```env
REACT_APP_BACKEND_URL=https://<your-render-backend-url>
```

Example:

```env
REACT_APP_BACKEND_URL=https://fixify-backend.onrender.com
```

Then redeploy the frontend.

## 4. Final backend CORS update

Once Vercel gives you the real frontend domain, update Render:

```env
CORS_ORIGINS=https://<your-vercel-domain>
OPENROUTER_REFERER=https://<your-vercel-domain>
```

Then redeploy the backend.

## 5. Post-deploy checks

Test these in order:

1. Frontend loads from Vercel
2. Signup works
3. Login works
4. Report submission works
5. Dashboard loads reports
6. Fixi AI chatbot responds
7. Moderator account can open the Moderator Panel

## 6. Moderator account for production/demo

To create a moderator account on the deployed backend, use:

```bash
python backend/create_moderator.py
```

If you need to run it on a deployed host, use that platform's shell/console with the same environment variables available.
