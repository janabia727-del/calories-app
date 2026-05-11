"""Pydantic models for Qalam.ai backend."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str = "") -> str:
    base = uuid.uuid4().hex[:16]
    return f"{prefix}{base}" if prefix else base


# ---------------- Auth models ----------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "teacher"  # teacher | admin


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    role: str = "teacher"
    picture: Optional[str] = None
    locale: Optional[str] = None
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


# ---------------- Document / curriculum upload ----------------
class DocumentMeta(BaseModel):
    id: str
    owner_id: str
    filename: str
    storage_path: str
    content_type: str
    size: int
    country: Optional[str] = None
    curriculum: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    title: Optional[str] = None
    excerpt: Optional[str] = None
    language: Optional[str] = None
    pages: Optional[int] = None
    created_at: str


# ---------------- AI Generation requests ----------------
class GenerateQuestionsRequest(BaseModel):
    document_id: Optional[str] = None
    raw_text: Optional[str] = None  # fallback if no doc
    question_types: List[str] = Field(default_factory=lambda: ["mcq"])
    difficulty: str = "medium"   # easy | medium | hard | mixed
    count: int = 10
    topic: Optional[str] = None
    language: str = "en"          # en | ar
    include_answer_key: bool = True
    country: Optional[str] = None
    curriculum: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None


class GenerateQuizRequest(GenerateQuestionsRequest):
    title: str = "Quiz"
    randomize: bool = True
    create_versions: bool = False  # A/B


class GenerateLessonPlanRequest(BaseModel):
    document_id: Optional[str] = None
    raw_text: Optional[str] = None
    duration: str = "daily"   # daily | weekly
    language: str = "en"
    topic: Optional[str] = None
    country: Optional[str] = None
    curriculum: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None


class GenerateWorksheetRequest(BaseModel):
    document_id: Optional[str] = None
    raw_text: Optional[str] = None
    worksheet_type: str = "practice"  # practice | homework | group | icebreaker | critical_thinking
    language: str = "en"
    count: int = 8
    topic: Optional[str] = None
    country: Optional[str] = None
    curriculum: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None


# ---------------- Quiz storage ----------------
class Question(BaseModel):
    id: str = Field(default_factory=lambda: new_id("q_"))
    type: str  # mcq, true_false, fill_blank, short_answer, essay, matching
    text: str
    options: Optional[List[str]] = None
    answer: Optional[Any] = None
    explanation: Optional[str] = None


class Quiz(BaseModel):
    id: str
    owner_id: str
    title: str
    language: str = "en"
    questions: List[Question]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


# ---------------- Classes / Students ----------------
class Student(BaseModel):
    id: str = Field(default_factory=lambda: new_id("s_"))
    name: str
    email: Optional[str] = None
    notes: Optional[str] = None


class ClassRoom(BaseModel):
    id: str
    owner_id: str
    name: str
    grade: Optional[str] = None
    subject: Optional[str] = None
    students: List[Student] = Field(default_factory=list)
    created_at: str


class ClassCreate(BaseModel):
    name: str
    grade: Optional[str] = None
    subject: Optional[str] = None


class StudentCreate(BaseModel):
    name: str
    email: Optional[str] = None
    notes: Optional[str] = None


# ---------------- Grading ----------------
class GradeEssayRequest(BaseModel):
    document_id: Optional[str] = None
    rubric: Optional[str] = None
    question: str
    student_answer: str
    language: str = "en"


# ---------------- Live Quiz ----------------
class LiveSessionCreate(BaseModel):
    quiz_id: str
    timer_seconds: int = 20


class LiveJoinRequest(BaseModel):
    code: str
    student_name: str


class LiveAnswerRequest(BaseModel):
    code: str
    participant_id: str
    question_id: str
    answer: Any


# ---------------- AI Assistant ----------------
class AssistantMessage(BaseModel):
    session_id: Optional[str] = None
    message: str
    language: str = "en"
    context: Optional[str] = None  # extra context (e.g., subject/grade)
