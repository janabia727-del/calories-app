"""Qalam.ai - FastAPI server."""
import os
import uuid
import logging
import secrets
import string
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Any, Dict

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from models import (
    RegisterRequest, LoginRequest, UserPublic, AuthResponse,
    DocumentMeta, GenerateQuestionsRequest, GenerateQuizRequest,
    GenerateLessonPlanRequest, GenerateWorksheetRequest,
    Question, Quiz, ClassRoom, ClassCreate, StudentCreate, Student,
    GradeEssayRequest, LiveSessionCreate, LiveJoinRequest, LiveAnswerRequest,
    AssistantMessage, new_id, now_iso,
)
from auth import (
    hash_password, verify_password, create_jwt, fetch_emergent_session,
    get_current_user, new_user_id,
)
from storage import init_storage, put_object, get_object, APP_NAME
from pdf_extract import extract_text
from ai_service import (
    generate_questions, generate_lesson_plan, generate_worksheet,
    grade_essay, assistant_chat,
)

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

# Logging
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("qalam")

app = FastAPI(title="Qalam.ai API")
app.state.db = db

api = APIRouter(prefix="/api")


# ---------------- Startup ----------------
@app.on_event("startup")
async def on_startup():
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init failed at startup: {e}")
    # Indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.live_sessions.create_index("code", unique=True)
    except Exception as e:
        logger.warning(f"Index setup warning: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()


# ---------------- Helpers ----------------
def _gen_code(n: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(n))


async def _resolve_source_text(owner_id: str, document_id: Optional[str],
                               raw_text: Optional[str]) -> Optional[str]:
    if raw_text and raw_text.strip():
        return raw_text
    if not document_id:
        return None
    doc = await db.documents.find_one(
        {"id": document_id, "owner_id": owner_id, "is_deleted": {"$ne": True}},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc.get("full_text") or doc.get("excerpt")


def _public_user(u: dict) -> UserPublic:
    return UserPublic(
        user_id=u["user_id"],
        email=u["email"],
        name=u.get("name", ""),
        role=u.get("role", "teacher"),
        picture=u.get("picture"),
        locale=u.get("locale"),
        created_at=u.get("created_at", now_iso()),
    )


# ==================== AUTH ====================
@api.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_user_id()
    role = "admin" if req.role == "admin" else "teacher"
    doc = {
        "user_id": user_id,
        "email": req.email.lower(),
        "name": req.name.strip() or req.email.split("@")[0],
        "password_hash": hash_password(req.password),
        "role": role,
        "picture": None,
        "locale": None,
        "auth_provider": "password",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    return AuthResponse(token=token, user=_public_user(doc))


@api.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["user_id"])
    return AuthResponse(token=token, user=_public_user(user))


@api.post("/auth/google/session")
async def google_session(payload: dict, response: Response):
    """Exchange session_id for session_token and create/update user."""
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    data = fetch_emergent_session(session_id)
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data.get("name") or existing.get("name"),
                "picture": data.get("picture") or existing.get("picture"),
            }}
        )
    else:
        user_id = new_user_id()
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "role": "teacher",
            "auth_provider": "google",
            "created_at": now_iso(),
        })
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": now_iso(),
        }},
        upsert=True,
    )
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"token": session_token, "user": _public_user(user).model_dump()}


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = None
    auth_header = request.headers.get("Authorization") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    if not token:
        token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ==================== DOCUMENTS ====================
@api.post("/documents/upload", response_model=DocumentMeta)
async def upload_document(
    file: UploadFile = File(...),
    country: Optional[str] = Form(None),
    curriculum: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin").lower()
    content_type = file.content_type or ("application/pdf" if ext == "pdf" else "application/octet-stream")
    doc_id = new_id("doc_")
    storage_path = f"{APP_NAME}/uploads/{user['user_id']}/{doc_id}.{ext}"
    try:
        result = put_object(storage_path, data, content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=502, detail="Storage upload failed")
    # Extract text
    text, pages = extract_text(data, content_type)
    excerpt = (text[:600] + "…") if len(text) > 600 else text
    rec = {
        "id": doc_id,
        "owner_id": user["user_id"],
        "filename": file.filename,
        "storage_path": result["path"],
        "content_type": content_type,
        "size": int(result.get("size", len(data))),
        "country": country,
        "curriculum": curriculum,
        "grade": grade,
        "subject": subject,
        "title": title or file.filename,
        "excerpt": excerpt,
        "full_text": text,
        "language": language,
        "pages": pages,
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.documents.insert_one(rec)
    rec.pop("full_text", None)
    return DocumentMeta(**rec)


@api.get("/documents", response_model=List[DocumentMeta])
async def list_documents(user: dict = Depends(get_current_user)):
    cursor = db.documents.find(
        {"owner_id": user["user_id"], "is_deleted": {"$ne": True}},
        {"_id": 0, "full_text": 0},
    ).sort("created_at", -1)
    return [DocumentMeta(**d) async for d in cursor]


@api.get("/documents/{doc_id}")
async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one(
        {"id": doc_id, "owner_id": user["user_id"], "is_deleted": {"$ne": True}},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    result = await db.documents.update_one(
        {"id": doc_id, "owner_id": user["user_id"]},
        {"$set": {"is_deleted": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


@api.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one(
        {"id": doc_id, "owner_id": user["user_id"], "is_deleted": {"$ne": True}},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    data, ct = get_object(doc["storage_path"])
    return Response(content=data, media_type=doc.get("content_type", ct))


# ==================== GENERATORS ====================
@api.post("/generate/questions")
async def gen_questions(req: GenerateQuestionsRequest, user: dict = Depends(get_current_user)):
    source = await _resolve_source_text(user["user_id"], req.document_id, req.raw_text)
    try:
        questions = await generate_questions(req.model_dump(), source)
    except Exception as e:
        logger.exception("question gen failed")
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")
    gen_id = new_id("gen_")
    await db.generations.insert_one({
        "id": gen_id,
        "owner_id": user["user_id"],
        "type": "questions",
        "request": req.model_dump(),
        "result": {"questions": questions},
        "created_at": now_iso(),
    })
    return {"id": gen_id, "questions": questions}


@api.post("/generate/quiz")
async def gen_quiz(req: GenerateQuizRequest, user: dict = Depends(get_current_user)):
    source = await _resolve_source_text(user["user_id"], req.document_id, req.raw_text)
    try:
        questions = await generate_questions(req.model_dump(), source)
    except Exception as e:
        logger.exception("quiz gen failed")
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")
    quiz_id = new_id("quiz_")
    quiz_doc = {
        "id": quiz_id,
        "owner_id": user["user_id"],
        "title": req.title,
        "language": req.language,
        "questions": questions,
        "metadata": {
            "country": req.country,
            "curriculum": req.curriculum,
            "grade": req.grade,
            "subject": req.subject,
            "topic": req.topic,
            "difficulty": req.difficulty,
            "document_id": req.document_id,
            "randomize": req.randomize,
        },
        "created_at": now_iso(),
    }
    await db.quizzes.insert_one(quiz_doc)
    quiz_doc.pop("_id", None)
    return quiz_doc


@api.post("/generate/lesson-plan")
async def gen_lesson(req: GenerateLessonPlanRequest, user: dict = Depends(get_current_user)):
    source = await _resolve_source_text(user["user_id"], req.document_id, req.raw_text)
    try:
        plan = await generate_lesson_plan(req.model_dump(), source)
    except Exception as e:
        logger.exception("lesson gen failed")
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")
    gen_id = new_id("lp_")
    await db.generations.insert_one({
        "id": gen_id,
        "owner_id": user["user_id"],
        "type": "lesson_plan",
        "request": req.model_dump(),
        "result": plan,
        "created_at": now_iso(),
    })
    return {"id": gen_id, "plan": plan}


@api.post("/generate/worksheet")
async def gen_worksheet(req: GenerateWorksheetRequest, user: dict = Depends(get_current_user)):
    source = await _resolve_source_text(user["user_id"], req.document_id, req.raw_text)
    try:
        ws = await generate_worksheet(req.model_dump(), source)
    except Exception as e:
        logger.exception("worksheet gen failed")
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")
    gen_id = new_id("ws_")
    await db.generations.insert_one({
        "id": gen_id,
        "owner_id": user["user_id"],
        "type": "worksheet",
        "request": req.model_dump(),
        "result": ws,
        "created_at": now_iso(),
    })
    return {"id": gen_id, "worksheet": ws}


@api.get("/generations")
async def list_generations(user: dict = Depends(get_current_user), type: Optional[str] = None):
    q = {"owner_id": user["user_id"]}
    if type:
        q["type"] = type
    cursor = db.generations.find(q, {"_id": 0}).sort("created_at", -1).limit(100)
    return [g async for g in cursor]


# ==================== QUIZZES ====================
@api.get("/quizzes")
async def list_quizzes(user: dict = Depends(get_current_user)):
    cursor = db.quizzes.find({"owner_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    return [q async for q in cursor]


@api.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, user: dict = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@api.delete("/quizzes/{quiz_id}")
async def del_quiz(quiz_id: str, user: dict = Depends(get_current_user)):
    res = await db.quizzes.delete_one({"id": quiz_id, "owner_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return {"ok": True}


# ==================== CLASSES / STUDENTS ====================
@api.post("/classes")
async def create_class(payload: ClassCreate, user: dict = Depends(get_current_user)):
    cid = new_id("cls_")
    rec = {
        "id": cid,
        "owner_id": user["user_id"],
        "name": payload.name,
        "grade": payload.grade,
        "subject": payload.subject,
        "students": [],
        "created_at": now_iso(),
    }
    await db.classes.insert_one(rec)
    rec.pop("_id", None)
    return rec


@api.get("/classes")
async def list_classes(user: dict = Depends(get_current_user)):
    cursor = db.classes.find({"owner_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    return [c async for c in cursor]


@api.post("/classes/{class_id}/students")
async def add_student(class_id: str, payload: StudentCreate, user: dict = Depends(get_current_user)):
    s = Student(name=payload.name, email=payload.email, notes=payload.notes).model_dump()
    res = await db.classes.update_one(
        {"id": class_id, "owner_id": user["user_id"]},
        {"$push": {"students": s}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    return s


@api.delete("/classes/{class_id}")
async def delete_class(class_id: str, user: dict = Depends(get_current_user)):
    res = await db.classes.delete_one({"id": class_id, "owner_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"ok": True}


@api.delete("/classes/{class_id}/students/{student_id}")
async def remove_student(class_id: str, student_id: str, user: dict = Depends(get_current_user)):
    res = await db.classes.update_one(
        {"id": class_id, "owner_id": user["user_id"]},
        {"$pull": {"students": {"id": student_id}}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"ok": True}


# ==================== GRADING ====================
@api.post("/grade/essay")
async def grade_essay_endpoint(req: GradeEssayRequest, user: dict = Depends(get_current_user)):
    source = await _resolve_source_text(user["user_id"], req.document_id, None)
    try:
        result = await grade_essay(req.question, req.student_answer, req.rubric, source, req.language)
    except Exception as e:
        logger.exception("grading failed")
        raise HTTPException(status_code=502, detail=f"Grading failed: {e}")
    rec = {
        "id": new_id("gr_"),
        "owner_id": user["user_id"],
        "question": req.question,
        "student_answer": req.student_answer,
        "result": result,
        "created_at": now_iso(),
    }
    await db.gradings.insert_one(rec)
    rec.pop("_id", None)
    return rec


# ==================== LIVE QUIZ ====================
@api.post("/live/sessions")
async def create_live_session(payload: LiveSessionCreate, user: dict = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": payload.quiz_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    # Unique 6-digit code
    for _ in range(10):
        code = _gen_code(6)
        exists = await db.live_sessions.find_one({"code": code})
        if not exists:
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate code")
    rec = {
        "id": new_id("live_"),
        "owner_id": user["user_id"],
        "quiz_id": payload.quiz_id,
        "code": code,
        "status": "lobby",  # lobby | running | revealed | ended
        "current_q_idx": 0,
        "timer_seconds": payload.timer_seconds,
        "participants": [],
        "answers": [],  # per-question per-participant
        "started_at": None,
        "ended_at": None,
        "created_at": now_iso(),
    }
    await db.live_sessions.insert_one(rec)
    rec.pop("_id", None)
    return {**rec, "quiz_title": quiz.get("title"), "total_questions": len(quiz.get("questions", []))}


@api.get("/live/sessions/{code}")
async def get_live_session(code: str):
    """Public: anyone with code can view limited info."""
    sess = await db.live_sessions.find_one({"code": code}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    quiz = await db.quizzes.find_one({"id": sess["quiz_id"]}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    # Build current question without revealing answer
    current_q = None
    if sess["status"] in ("running", "revealed") and sess["current_q_idx"] < len(quiz["questions"]):
        q = quiz["questions"][sess["current_q_idx"]]
        current_q = {
            "id": q["id"],
            "type": q.get("type"),
            "text": q.get("text"),
            "options": q.get("options"),
        }
        if sess["status"] == "revealed":
            current_q["answer"] = q.get("answer")
            current_q["explanation"] = q.get("explanation")
    return {
        "code": sess["code"],
        "status": sess["status"],
        "quiz_title": quiz.get("title"),
        "current_q_idx": sess["current_q_idx"],
        "total_questions": len(quiz["questions"]),
        "participants_count": len(sess["participants"]),
        "timer_seconds": sess["timer_seconds"],
        "current_question": current_q,
        "language": quiz.get("language", "en"),
    }


@api.get("/live/sessions/{code}/teacher")
async def get_live_session_teacher(code: str, user: dict = Depends(get_current_user)):
    sess = await db.live_sessions.find_one({"code": code, "owner_id": user["user_id"]}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    quiz = await db.quizzes.find_one({"id": sess["quiz_id"]}, {"_id": 0})
    # Compute per-question answer breakdown for current question
    cur_idx = sess["current_q_idx"]
    answers_for_current = [a for a in sess.get("answers", []) if a.get("q_idx") == cur_idx]
    # Leaderboard
    scores: Dict[str, int] = {}
    for a in sess.get("answers", []):
        if a.get("correct"):
            scores[a["participant_id"]] = scores.get(a["participant_id"], 0) + 1
    leaderboard = sorted(
        [{"participant_id": p["id"], "name": p["name"], "score": scores.get(p["id"], 0)}
         for p in sess.get("participants", [])],
        key=lambda x: -x["score"],
    )
    return {
        **sess,
        "quiz": quiz,
        "current_answers": answers_for_current,
        "leaderboard": leaderboard,
    }


@api.post("/live/sessions/{code}/control")
async def control_live_session(code: str, payload: dict, user: dict = Depends(get_current_user)):
    """Teacher controls: start, next, reveal, end."""
    action = payload.get("action")
    sess = await db.live_sessions.find_one({"code": code, "owner_id": user["user_id"]}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    quiz = await db.quizzes.find_one({"id": sess["quiz_id"]}, {"_id": 0})
    total = len(quiz.get("questions", []))
    update: Dict[str, Any] = {}
    if action == "start":
        update = {"status": "running", "current_q_idx": 0, "started_at": now_iso()}
    elif action == "next":
        new_idx = sess["current_q_idx"] + 1
        if new_idx >= total:
            update = {"status": "ended", "ended_at": now_iso()}
        else:
            update = {"status": "running", "current_q_idx": new_idx}
    elif action == "reveal":
        update = {"status": "revealed"}
    elif action == "end":
        update = {"status": "ended", "ended_at": now_iso()}
    elif action == "skip":
        new_idx = sess["current_q_idx"] + 1
        if new_idx >= total:
            update = {"status": "ended", "ended_at": now_iso()}
        else:
            update = {"status": "running", "current_q_idx": new_idx}
    else:
        raise HTTPException(status_code=400, detail="Unknown action")
    await db.live_sessions.update_one({"code": code}, {"$set": update})
    return {"ok": True, **update}


@api.post("/live/join")
async def live_join(payload: LiveJoinRequest):
    sess = await db.live_sessions.find_one({"code": payload.code}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if sess["status"] == "ended":
        raise HTTPException(status_code=400, detail="Session has ended")
    pid = new_id("p_")
    participant = {"id": pid, "name": payload.student_name.strip()[:40] or "Anonymous",
                   "joined_at": now_iso()}
    await db.live_sessions.update_one(
        {"code": payload.code},
        {"$push": {"participants": participant}},
    )
    return {"participant_id": pid, "name": participant["name"], "code": payload.code}


@api.post("/live/answer")
async def live_answer(payload: LiveAnswerRequest):
    sess = await db.live_sessions.find_one({"code": payload.code}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    quiz = await db.quizzes.find_one({"id": sess["quiz_id"]}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    q_idx = sess["current_q_idx"]
    if q_idx >= len(quiz["questions"]):
        raise HTTPException(status_code=400, detail="No active question")
    q = quiz["questions"][q_idx]
    # Prevent duplicate answer for same q_idx
    already = next((a for a in sess.get("answers", [])
                    if a.get("q_idx") == q_idx and a.get("participant_id") == payload.participant_id), None)
    if already:
        return {"ok": True, "duplicate": True}
    correct = False
    if q.get("answer") is not None:
        try:
            correct = str(payload.answer).strip().lower() == str(q["answer"]).strip().lower()
        except Exception:
            correct = False
    record = {
        "q_idx": q_idx,
        "question_id": q.get("id"),
        "participant_id": payload.participant_id,
        "answer": payload.answer,
        "correct": correct,
        "answered_at": now_iso(),
    }
    await db.live_sessions.update_one(
        {"code": payload.code},
        {"$push": {"answers": record}},
    )
    return {"ok": True, "correct": correct}


# ==================== ASSISTANT ====================
@api.post("/assistant/chat")
async def assistant(req: AssistantMessage, user: dict = Depends(get_current_user)):
    session_id = req.session_id or f"asst_{user['user_id']}_{uuid.uuid4().hex[:6]}"
    try:
        reply = await assistant_chat(session_id, req.message, req.language, req.context)
    except Exception as e:
        logger.exception("assistant failed")
        raise HTTPException(status_code=502, detail=f"Assistant failed: {e}")
    await db.assistant_history.insert_one({
        "id": new_id("am_"),
        "owner_id": user["user_id"],
        "session_id": session_id,
        "user": req.message,
        "assistant": reply,
        "language": req.language,
        "created_at": now_iso(),
    })
    return {"session_id": session_id, "reply": reply}


# ==================== REPORTS ====================
@api.get("/reports/overview")
async def reports_overview(user: dict = Depends(get_current_user)):
    docs = await db.documents.count_documents({"owner_id": user["user_id"], "is_deleted": {"$ne": True}})
    quizzes = await db.quizzes.count_documents({"owner_id": user["user_id"]})
    classes = await db.classes.count_documents({"owner_id": user["user_id"]})
    gens = await db.generations.count_documents({"owner_id": user["user_id"]})
    live = await db.live_sessions.count_documents({"owner_id": user["user_id"]})
    # Generations per day (last 14)
    cursor = db.generations.find(
        {"owner_id": user["user_id"]},
        {"_id": 0, "type": 1, "created_at": 1},
    ).sort("created_at", -1).limit(500)
    series: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    async for g in cursor:
        day = (g.get("created_at") or "")[:10]
        series[day] = series.get(day, 0) + 1
        by_type[g.get("type", "?")] = by_type.get(g.get("type", "?"), 0) + 1
    timeline = sorted(
        [{"day": d, "count": c} for d, c in series.items()],
        key=lambda x: x["day"],
    )[-14:]
    return {
        "totals": {
            "documents": docs,
            "quizzes": quizzes,
            "classes": classes,
            "generations": gens,
            "live_sessions": live,
        },
        "timeline": timeline,
        "by_type": [{"type": k, "count": v} for k, v in by_type.items()],
    }


@api.get("/")
async def root():
    return {"app": "Qalam.ai", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
