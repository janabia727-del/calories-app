"""AI generation service using GPT-5.2 via emergentintegrations."""
import os
import json
import re
import logging
import uuid
from typing import Any, Dict, List, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

MODEL_PROVIDER = "openai"
MODEL_NAME = "gpt-5.2"


def _make_chat(session_id: str, system: str) -> LlmChat:
    key = os.environ.get("EMERGENT_LLM_KEY")
    return LlmChat(
        api_key=key,
        session_id=session_id,
        system_message=system,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


def _strip_code_fence(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z0-9]*\n?", "", s)
        if s.endswith("```"):
            s = s[:-3]
    return s.strip()


def _parse_json(text: str) -> Any:
    """Parse JSON from LLM output; tolerate code fences and surrounding prose."""
    cleaned = _strip_code_fence(text)
    try:
        return json.loads(cleaned)
    except Exception:
        # Try to find first JSON object/array
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception:
                pass
    raise ValueError("LLM did not return valid JSON")


def _lang_block(language: str) -> str:
    return ("All output strings (including questions, options, answers, explanations, "
            "titles, and feedback) MUST be in Arabic.") if language == "ar" else (
            "All output strings must be in English.")


def _curriculum_block(meta: dict) -> str:
    parts = []
    if meta.get("country"):
        parts.append(f"Country: {meta['country']}")
    if meta.get("curriculum"):
        parts.append(f"Curriculum: {meta['curriculum']}")
    if meta.get("grade"):
        parts.append(f"Grade: {meta['grade']}")
    if meta.get("subject"):
        parts.append(f"Subject: {meta['subject']}")
    if meta.get("topic"):
        parts.append(f"Topic: {meta['topic']}")
    return "\n".join(parts) if parts else "General curriculum"


def _ground_block(source_text: Optional[str]) -> str:
    if source_text and source_text.strip():
        snippet = source_text.strip()[:30000]
        return (
            "STRICTLY GROUND your output ONLY in the following curriculum source. "
            "Do NOT invent facts beyond it. If the source is insufficient for a question, "
            "skip rather than fabricate.\n\n"
            f"<SOURCE>\n{snippet}\n</SOURCE>"
        )
    return "No specific source uploaded; you may use general curriculum knowledge."


# ----------------- Generators -----------------
async def generate_questions(req: dict, source_text: Optional[str]) -> List[Dict[str, Any]]:
    language = req.get("language", "en")
    qtypes = req.get("question_types") or ["mcq"]
    count = max(1, min(int(req.get("count", 10)), 50))
    difficulty = req.get("difficulty", "medium")
    include_key = req.get("include_answer_key", True)

    system = (
        "You are Qalam.ai, an expert educational content generator for teachers. "
        "You output ONLY strict JSON, no prose. " + _lang_block(language)
    )
    user_prompt = f"""Generate exactly {count} questions for a teacher.

Context:
{_curriculum_block(req)}
Difficulty: {difficulty}
Allowed question types: {", ".join(qtypes)}
Include answer key: {include_key}

{_ground_block(source_text)}

Return strict JSON of the form:
{{
  "questions": [
    {{
      "type": "mcq" | "true_false" | "fill_blank" | "short_answer" | "essay" | "matching",
      "text": "question text",
      "options": ["A", "B", "C", "D"]    // for mcq / matching, else omit or null
      "answer": "correct answer string OR for matching: an array of pairs",
      "explanation": "short explanation"
    }}
  ]
}}
Rules:
- For mcq: 4 options, "answer" is the exact correct option string.
- For true_false: options = ["True", "False"] (or Arabic equivalents), answer = "True" or "False".
- For fill_blank: include a blank "____" in text; answer is the missing word(s).
- For matching: options is an array of {{"left": "...", "right": "..."}} pairs that the student must match.
- For essay/short_answer: provide a model "answer".
- Distribute types across the allowed list. Difficulty stays consistent unless "mixed".
"""
    chat = _make_chat(f"gen-q-{uuid.uuid4().hex[:8]}", system)
    resp = await chat.send_message(UserMessage(text=user_prompt))
    data = _parse_json(resp)
    questions = data.get("questions", []) if isinstance(data, dict) else data
    if not isinstance(questions, list):
        raise ValueError("Invalid questions format")
    # Normalize
    norm = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        norm.append({
            "id": f"q_{uuid.uuid4().hex[:10]}",
            "type": q.get("type", "mcq"),
            "text": q.get("text", "").strip(),
            "options": q.get("options"),
            "answer": q.get("answer") if include_key else None,
            "explanation": q.get("explanation") if include_key else None,
        })
    return norm


async def generate_lesson_plan(req: dict, source_text: Optional[str]) -> Dict[str, Any]:
    language = req.get("language", "en")
    duration = req.get("duration", "daily")
    system = (
        "You are Qalam.ai. Produce a complete lesson plan for a teacher. "
        "Output strict JSON only. " + _lang_block(language)
    )
    user_prompt = f"""Build a {duration} lesson plan.

Context:
{_curriculum_block(req)}

{_ground_block(source_text)}

Return strict JSON:
{{
  "title": "Lesson title",
  "duration": "{duration}",
  "objectives": ["..."],
  "materials": ["..."],
  "warm_up": "warm-up activity",
  "main_activities": ["..."],
  "teaching_strategies": ["..."],
  "interactive_ideas": ["..."],
  "differentiation": ["..."],
  "homework": ["..."],
  "assessment": ["..."],
  "closure": "closure / wrap-up"
}}"""
    chat = _make_chat(f"gen-lp-{uuid.uuid4().hex[:8]}", system)
    resp = await chat.send_message(UserMessage(text=user_prompt))
    return _parse_json(resp)


async def generate_worksheet(req: dict, source_text: Optional[str]) -> Dict[str, Any]:
    language = req.get("language", "en")
    wtype = req.get("worksheet_type", "practice")
    count = max(1, min(int(req.get("count", 8)), 30))
    system = (
        "You are Qalam.ai. Generate an engaging classroom worksheet for a teacher. "
        "Output strict JSON only. " + _lang_block(language)
    )
    user_prompt = f"""Generate a "{wtype}" worksheet with {count} exercises.

Context:
{_curriculum_block(req)}

{_ground_block(source_text)}

Return strict JSON:
{{
  "title": "Worksheet title",
  "type": "{wtype}",
  "instructions": "Instructions for students",
  "exercises": [
    {{
      "prompt": "exercise prompt",
      "hint": "optional hint",
      "answer": "model answer"
    }}
  ],
  "extension": "optional extension activity for fast finishers"
}}"""
    chat = _make_chat(f"gen-ws-{uuid.uuid4().hex[:8]}", system)
    resp = await chat.send_message(UserMessage(text=user_prompt))
    return _parse_json(resp)


async def grade_essay(question: str, student_answer: str, rubric: Optional[str],
                      source_text: Optional[str], language: str = "en") -> Dict[str, Any]:
    system = (
        "You are Qalam.ai, an expert AI essay grader. You provide constructive, fair feedback. "
        "Teacher always has final review. Output strict JSON. " + _lang_block(language)
    )
    user_prompt = f"""Grade the following student answer.

Question:
{question}

Student answer:
{student_answer}

Rubric (optional):
{rubric or "Score 0-100. Reward clarity, accuracy, completeness."}

{_ground_block(source_text)}

Return strict JSON:
{{
  "score": number_between_0_and_100,
  "strengths": ["..."],
  "mistakes": ["..."],
  "corrections": ["..."],
  "feedback": "constructive paragraph for the student"
}}"""
    chat = _make_chat(f"grade-{uuid.uuid4().hex[:8]}", system)
    resp = await chat.send_message(UserMessage(text=user_prompt))
    return _parse_json(resp)


async def assistant_chat(session_id: str, message: str, language: str = "en",
                         context: Optional[str] = None) -> str:
    system_en = ("You are Qalam.ai, a friendly and expert teaching assistant. "
                 "You help teachers with classroom ideas, lesson simplification, activities, "
                 "discussion prompts, and educational strategies. Be concise, structured, and warm.")
    system_ar = ("أنت قلم.ai، مساعد تعليمي ودود وخبير. تساعد المعلمين في الأنشطة الصفية، "
                 "تبسيط الدروس، أفكار التدريس، أسئلة النقاش، والاستراتيجيات التربوية. "
                 "أجوبتك مركزة ومنظمة ودافئة.")
    system = system_ar if language == "ar" else system_en
    if context:
        system += "\n\nContext: " + context[:4000]
    chat = _make_chat(session_id or f"asst-{uuid.uuid4().hex[:8]}", system)
    resp = await chat.send_message(UserMessage(text=message))
    return resp
