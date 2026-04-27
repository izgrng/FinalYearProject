# Fixify - Community Problem Reporting Platform

## Original Problem Statement
Build "Fixify" - an AI-driven web platform for Nepal communities to report local problems like damaged roads, waste issues, water problems, and safety concerns.

## Architecture
- **Frontend**: React with Tailwind CSS, Radix UI, Leaflet Maps
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenRouter for chat and categorization, CLIP for image understanding, local ML fallback

## Completed Features

### Authentication
- JWT-based login/signup
- User roles (`user`, `moderator`)
- Protected routes

### Report System
- Multi-step report form with text and/or image submission
- AI-powered image validation
- AI triage categorization
- Urgency prediction
- Duplicate detection
- Report comments and upvotes
- Report timeline and moderator status workflow

### Dashboard
- Interactive map with category-colored markers
- Action-oriented stats cards
- Attention queue and AI watchlist
- Category, status, and location filters
- Weekly flow and trend charts

### Community Hub
- Membership request system
- Moderator approval workflow
- Community events with join/leave functionality
- Linked reports, event updates, and post comments

### Fixi AI Chatbot
- OpenRouter-powered chatbot
- Civic guidance and platform help
- Persistent chat sessions

### Moderator Panel
- Approve/reject membership requests
- Create community events
- Review and update report status

## Database Collections
- `users`
- `reports`
- `events`
- `membership_requests`
- `community_posts`
- `notifications`
- `chat_history`

## API Endpoints
- `/api/auth/*` - Authentication
- `/api/reports/*` - Issue reports CRUD and workflow
- `/api/dashboard/stats` - Dashboard statistics
- `/api/community/*` - Membership requests and posts
- `/api/events/*` - Community events
- `/api/chat` - Fixi chatbot

## Next Action Items
1. Add email notifications for membership approval
2. Add before/after resolution proof for completed reports
3. Add export functionality for reports (CSV/PDF)
4. Improve deployment automation
5. Expand report analytics and trends
