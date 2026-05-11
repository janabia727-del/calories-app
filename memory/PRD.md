# Qalam.ai — Product Requirements Document

## Original Problem Statement
A professional AI-powered educational SaaS platform for teachers and schools with full Arabic and English language support, modern responsive UI, strong security, and scalable architecture. The platform helps teachers save time by automatically generating educational content, quizzes, worksheets, lesson plans, grading systems, and interactive classroom activities using AI — strictly grounded in their uploaded curriculum.

## User Choices (Feb 2026)
- AI Model: **GPT-5.2** via Emergent LLM Universal Key
- Auth: **JWT (email/password) + Emergent Google Auth**
- File Storage: **Emergent Object Storage**
- Default language: **Auto-detect (Arabic / English)**

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) on port 8001, prefixed `/api`
  - `server.py` — all endpoints (auth, documents, generation, quizzes, classes, grading, live, assistant, reports)
  - `auth.py` — bcrypt + PyJWT, Emergent session exchange, `get_current_user` dependency (Bearer JWT or session_token cookie)
  - `ai_service.py` — GPT-5.2 calls via `emergentintegrations.llm.chat`
  - `storage.py` — Emergent Object Storage for PDF persistence
  - `pdf_extract.py` — pypdf text extraction
- **Frontend**: React 19 + Tailwind + shadcn/ui + Recharts + qrcode.react
  - LanguageContext (RTL/LTR + AR/EN translations)
  - AuthContext (JWT in localStorage + cookie for Google session)
  - 16 pages: Landing, Login, Signup, AuthCallback, Dashboard, Documents, QuestionBank, Quizzes, Worksheets, LessonPlans, Grading, Classes, Reports, Assistant, LiveHub, LivePresenter, StudentJoin, StudentPlay
- **Design**: Ink (#0B132B) + Amber (#F5A623) Swiss High-Contrast aesthetic. IBM Plex Sans (LTR) / Tajawal (RTL).

## User Personas
1. **Teacher** — primary user. Uploads curriculum PDFs, generates content, runs live quizzes.
2. **Admin** — school-level role, same UI for now.
3. **Student** — public student-facing pages only (`/join`, `/play/:code`). No account needed.

## Core Requirements (Static)
- Multilingual AR/EN with RTL/LTR switching
- Role-based access (teacher data is private)
- AI grounded only in uploaded curriculum (no fabrication)
- PDF upload + text extraction
- Generate: questions (6 types), quizzes, lesson plans, worksheets
- AI essay grading with teacher final review
- Live classroom quiz mode (Kahoot-like) with QR code
- Student join via 6-digit code or QR
- Reports & analytics
- AI assistant chat

## What's Been Implemented (Feb 2026)
- ✅ Backend: 38/38 endpoint tests passing
- ✅ JWT signup/login/logout + Emergent Google Auth flow
- ✅ Document upload to Emergent Object Storage (with pypdf text extraction)
- ✅ AI generation: questions / quiz / lesson plan / worksheet (GPT-5.2)
- ✅ Essay grading with rubric + AI score + teacher override
- ✅ Classes & students CRUD
- ✅ AI Assistant chat with session memory
- ✅ Live classroom quiz: create, lobby, start/next/reveal/end, QR code, leaderboard, student join + answer
- ✅ Reports overview (totals, 14-day timeline, generations by type)
- ✅ Frontend: 16 pages, language switcher, RTL Arabic typography, premium Ink+Amber theme
- ✅ Privacy: teachers only see their own data (verified in tests)
- ✅ Landing page (marketing)

## Backlog
### P1
- Onboarding wizard (set default country/curriculum/grade/subject)
- Export quiz to real PDF (currently print-dialog)
- Word document export
- Quiz versions A/B (randomization scaffolding exists but not wired)
- Student attendance tracking
- Per-student progress reports / weakness analysis

### P2
- Parent portal
- Student portal (long-term accounts)
- Voice-to-text answers in live quizzes
- Video lessons / embed
- Team competitions (group leaderboards)
- AI-generated hints during live quiz
- Live polls (separate from quiz)
- School management tools (multi-teacher admin)
- PWA install prompt + offline mode
- WebSocket-based live sessions (currently 1.5s polling)

### Known limitations
- Live quiz polling uses 1.5s interval — fine for classroom scale but should move to WebSocket later
- `requests.get` in `google_session` is sync — fine for now, can move to httpx for higher concurrency
- No rate limiting on AI endpoints — relies on Emergent LLM key budget
- Soft delete only for documents (Emergent Object Storage has no delete API)

## Test Credentials
See `/app/memory/test_credentials.md`. Test account: `teacher@qalam.ai` / `Test1234!`.
