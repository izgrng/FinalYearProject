# Fixify - Community Problem Reporting Platform

## Original Problem Statement
Build "Fixify" - an AI-driven web platform for Nepal communities to report local problems like damaged roads, waste issues, water problems, and safety concerns. Features include:
- AI triage system for automatic issue categorization
- AI image validation (detect valid problems vs random photos)
- Interactive map-based reporting and dashboard
- Community Hub with moderator-approved membership
- Fixi AI chatbot for user guidance

## Architecture
- **Frontend**: React with Tailwind CSS, Shadcn UI, Leaflet Maps
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM key

## Completed Features

### Authentication
- JWT-based login/signup
- User roles (user, moderator)
- Protected routes

### Report System
- Multi-step report form with image upload
- AI-powered image validation (rejects selfies/irrelevant images)
- AI triage categorization (Waste, Road, Water, Safety, Infrastructure, Environment)
- Location picker with Leaflet maps
- Upvote system

### Dashboard
- Interactive map with category-colored markers
- Stats cards (total, open, resolved, hotspots)
- Category pie chart
- Filter by category, status, location
- Latest reports list

### Community Hub
- Membership request system
- Moderator approval workflow
- Community events with join/leave functionality

### Fixi AI Chatbot
- GPT-4o powered chatbot
- Civic awareness and guidance
- Persistent chat sessions

### Moderator Panel
- Approve/reject membership requests
- Create community events

## Database Collections
- users, reports, events, membership_requests, chat_history

## API Endpoints
- `/api/auth/*` - Authentication
- `/api/reports/*` - Issue reports CRUD
- `/api/dashboard/stats` - Dashboard statistics
- `/api/community/*` - Membership requests
- `/api/events/*` - Community events
- `/api/chat` - Fixi chatbot

## Next Action Items
1. Add email notifications for membership approval
2. Implement report status updates by moderators
3. Add user comments on reports
4. Implement report image gallery
5. Add export functionality for reports (CSV/PDF)
6. Implement push notifications for new reports in user's area
7. Add Google Maps integration (when API key available)
8. Implement report analytics and trends

## Credentials
- Moderator: moderator@fixify.com / Moderator123!
