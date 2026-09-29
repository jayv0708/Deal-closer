# AI Real Estate Sales Consultant Platform

A production-oriented, modular, and scalable SaaS platform that features a LiveKit-powered voice AI to act as a professional real estate sales consultant. 

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Redis
- **Voice Agent**: LiveKit Agents Framework + OpenAI
- **RAG Engine**: pgvector
- **Infrastructure**: Docker Compose

## Development Setup

1. **Environment Variables**
   - Copy `.env.example` to `.env` and fill in your keys (OpenAI, LiveKit).

2. **Docker Compose (Database + Redis)**
   - Start the required databases:
     ```bash
     docker-compose up -d
     ```
   - Ensure Docker Desktop is running.

3. **Backend Setup**
   - Create a virtual environment:
     ```bash
     python -m venv backend/venv
     backend/venv/Scripts/Activate.ps1
     ```
   - Install dependencies:
     ```bash
     pip install -r backend/requirements.txt
     ```
   - Run Database Migrations:
     ```bash
     cd backend
     alembic upgrade head
     ```
   - Start Backend from the repository root (this makes the shared `ingestion`
     package available to the API):
     ```bash
     backend/venv/Scripts/python -m uvicorn app.main:app --app-dir backend --reload
     ```

4. **Frontend Setup**
   - Go to `frontend` and install dependencies:
     ```bash
     cd frontend
     npm install
     npm run dev
     ```

5. **Start the Priya realtime Hinglish sales agent** (recommended)
   - The voice agent is a LiveKit worker on the Gemini Live API with DB-backed
     tools (property search, EMI, lead capture, site-visit booking) and CRM
     persistence at call end. Seed demo inventory first, then run it:
     ```bash
     backend/venv/Scripts/python backend/scripts/seed_demo_data.py
     backend/venv/Scripts/python agent/voice/livekit_agent.py console   # terminal test call
     backend/venv/Scripts/python agent/voice/livekit_agent.py dev       # LiveKit Cloud worker
     ```
   - Requires `LLM_API_KEY` (Google Gemini) and the `LIVEKIT_*` variables from
     `.env.example`; see the `GEMINI_*` / `DEFAULT_PROJECT_ID` settings there.

6. **Legacy Whisper/Edge-TTS voice pipeline** (optional)
   - The older local pipeline (Sarvam LLM server + custom STT/TTS) is still
     available:
     ```bash
     backend/venv/Scripts/python -m pip install -r agent/requirements.txt
     backend/venv/Scripts/python -m uvicorn agent.voice.local_llm_server:app --host 127.0.0.1 --port 8001
     backend/venv/Scripts/python -m agent.main dev
     ```

## Project Phases Completed
- Phase 1: Repository structure and DB models
- Phase 2: FastAPI and Authentication
- Phase 3: Project and Property CRUD
- Phase 4: Document Uploads
- Phase 5: Document Ingestion Pipeline
- Phase 6: pgvector RAG
- Phase 7: Deterministic Finance Tools
- Phase 8: Property Search Engine
- Phase 9: Sales Conversation Engine
- Phase 10: Browser Voice with LiveKit
- Phase 11: Conversation State
- Phase 12: CRM APIs
- Phase 13/14: Call Summaries & Handoff (CRM Tools)
- Phase 16: Analytics endpoints
- Phase 17: Evaluation framework
- Phase 18: Dockerfile

*(SIP Inbound Telephony is configured on LiveKit's end).*
