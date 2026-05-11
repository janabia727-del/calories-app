"""Qalam.ai backend API tests (pytest)."""
import os
import io
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ai-classroom-80.preview.emergentagent.com").rstrip("/")
# Read from frontend env file if available
_FE_ENV = "/app/frontend/.env"
if os.path.exists(_FE_ENV):
    with open(_FE_ENV) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api"

TEACHER_EMAIL = "teacher@qalam.ai"
TEACHER_PASSWORD = "Test1234!"
TEACHER_NAME = "Test Teacher"

# Unique email for second user (privacy test)
SECOND_EMAIL = f"second_{uuid.uuid4().hex[:8]}@qalam.ai"
SECOND_PASSWORD = "Test1234!"


# ------------ Fixtures ------------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def teacher_token(http):
    # Try login first; if fails, register
    r = http.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD})
    if r.status_code == 200:
        return r.json()["token"]
    r = http.post(f"{API}/auth/register", json={
        "email": TEACHER_EMAIL, "password": TEACHER_PASSWORD,
        "name": TEACHER_NAME, "role": "teacher",
    })
    if r.status_code == 200:
        return r.json()["token"]
    # If duplicate then login
    r2 = http.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD})
    assert r2.status_code == 200, f"Could not auth: register={r.status_code} {r.text}; login={r2.status_code} {r2.text}"
    return r2.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(teacher_token):
    return {"Authorization": f"Bearer {teacher_token}"}


@pytest.fixture(scope="session")
def second_user_token(http):
    r = http.post(f"{API}/auth/register", json={
        "email": SECOND_EMAIL, "password": SECOND_PASSWORD,
        "name": "Second User", "role": "teacher",
    })
    assert r.status_code == 200, f"Second user register failed: {r.status_code} {r.text}"
    return r.json()["token"]


# ------------ Health ------------
def test_root_ok(http):
    r = http.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


# ------------ Auth ------------
class TestAuth:
    def test_register_duplicate(self, http, teacher_token):
        r = http.post(f"{API}/auth/register", json={
            "email": TEACHER_EMAIL, "password": TEACHER_PASSWORD,
            "name": TEACHER_NAME, "role": "teacher",
        })
        assert r.status_code == 400

    def test_login_wrong_password(self, http):
        r = http.post(f"{API}/auth/login", json={
            "email": TEACHER_EMAIL, "password": "WrongPass!!"
        })
        assert r.status_code == 401

    def test_login_success(self, http):
        r = http.post(f"{API}/auth/login", json={
            "email": TEACHER_EMAIL, "password": TEACHER_PASSWORD
        })
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
        assert data["user"]["email"] == TEACHER_EMAIL

    def test_me_with_token(self, http, auth_headers):
        r = http.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == TEACHER_EMAIL

    def test_me_without_token(self, http):
        r = http.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_ok(self, http, auth_headers):
        r = http.post(f"{API}/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ------------ Auth required ------------
class TestAuthGate:
    @pytest.mark.parametrize("path,method", [
        ("/documents", "GET"),
        ("/quizzes", "GET"),
        ("/classes", "GET"),
        ("/reports/overview", "GET"),
        ("/generations", "GET"),
    ])
    def test_endpoints_require_auth(self, http, path, method):
        r = http.request(method, f"{API}{path}")
        assert r.status_code == 401, f"{path} expected 401 got {r.status_code}"


# ------------ Documents ------------
class TestDocuments:
    doc_id = None
    storage_path = None

    def test_upload_txt(self, http, auth_headers):
        files = {
            "file": ("sample.txt", io.BytesIO(b"Photosynthesis is the process by which plants use sunlight."), "text/plain"),
        }
        data = {"title": "Sample", "subject": "Biology"}
        # NOTE: don't reuse session's JSON content-type; use a clean request for multipart
        r = requests.post(f"{API}/documents/upload",
                          files=files, data=data,
                          headers={"Authorization": auth_headers["Authorization"]})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"].startswith("doc_")
        assert "storage_path" in body
        TestDocuments.doc_id = body["id"]
        TestDocuments.storage_path = body["storage_path"]

    def test_list_documents(self, http, auth_headers):
        r = http.get(f"{API}/documents", headers=auth_headers)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        assert any(d["id"] == TestDocuments.doc_id for d in docs)

    def test_get_document(self, http, auth_headers):
        r = http.get(f"{API}/documents/{TestDocuments.doc_id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == TestDocuments.doc_id

    def test_document_privacy(self, http, second_user_token):
        h = {"Authorization": f"Bearer {second_user_token}"}
        r = http.get(f"{API}/documents/{TestDocuments.doc_id}", headers=h)
        assert r.status_code == 404
        r2 = http.get(f"{API}/documents", headers=h)
        assert r2.status_code == 200
        assert not any(d["id"] == TestDocuments.doc_id for d in r2.json())

    def test_delete_document(self, http, auth_headers):
        r = http.delete(f"{API}/documents/{TestDocuments.doc_id}", headers=auth_headers)
        assert r.status_code == 200
        # Should no longer appear in list
        r2 = http.get(f"{API}/documents", headers=auth_headers)
        assert not any(d["id"] == TestDocuments.doc_id for d in r2.json())


# ------------ AI Generation ------------
SAMPLE_TEXT = ("Photosynthesis is the process by which plants use sunlight, water and "
               "carbon dioxide to create oxygen and energy in the form of sugar.")


class TestAIGeneration:
    quiz_id = None

    def test_generate_questions(self, http, auth_headers):
        r = http.post(f"{API}/generate/questions",
                      headers=auth_headers,
                      json={"raw_text": SAMPLE_TEXT, "count": 3, "question_types": ["mcq"], "language": "en"},
                      timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "questions" in body
        assert len(body["questions"]) >= 1
        q0 = body["questions"][0]
        assert "text" in q0 and "type" in q0

    def test_generate_quiz(self, http, auth_headers):
        r = http.post(f"{API}/generate/quiz",
                      headers=auth_headers,
                      json={"raw_text": SAMPLE_TEXT, "count": 3, "question_types": ["mcq"],
                            "language": "en", "title": "TEST Quiz"},
                      timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"].startswith("quiz_")
        assert body["title"] == "TEST Quiz"
        assert len(body.get("questions", [])) >= 1
        TestAIGeneration.quiz_id = body["id"]

    def test_generate_lesson_plan(self, http, auth_headers):
        r = http.post(f"{API}/generate/lesson-plan",
                      headers=auth_headers,
                      json={"raw_text": SAMPLE_TEXT, "language": "en", "duration": "daily"},
                      timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "plan" in body
        plan = body["plan"]
        # Plan should at least have title or objectives
        assert isinstance(plan, dict)
        assert any(k in plan for k in ("title", "objectives", "lesson_title", "topic"))

    def test_generate_worksheet(self, http, auth_headers):
        r = http.post(f"{API}/generate/worksheet",
                      headers=auth_headers,
                      json={"raw_text": SAMPLE_TEXT, "language": "en", "count": 3,
                            "worksheet_type": "practice"},
                      timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "worksheet" in body


# ------------ Quizzes ------------
class TestQuizzes:
    def test_list_quizzes(self, http, auth_headers):
        r = http.get(f"{API}/quizzes", headers=auth_headers)
        assert r.status_code == 200
        quizzes = r.json()
        assert isinstance(quizzes, list)
        assert any(q["id"] == TestAIGeneration.quiz_id for q in quizzes)

    def test_get_quiz(self, http, auth_headers):
        qid = TestAIGeneration.quiz_id
        r = http.get(f"{API}/quizzes/{qid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == qid


# ------------ Classes / Students ------------
class TestClasses:
    class_id = None
    student_id = None

    def test_create_class(self, http, auth_headers):
        r = http.post(f"{API}/classes",
                      headers=auth_headers,
                      json={"name": "TEST 10A", "grade": "10", "subject": "Science"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"].startswith("cls_")
        TestClasses.class_id = body["id"]

    def test_list_classes(self, http, auth_headers):
        r = http.get(f"{API}/classes", headers=auth_headers)
        assert r.status_code == 200
        assert any(c["id"] == TestClasses.class_id for c in r.json())

    def test_add_student(self, http, auth_headers):
        r = http.post(f"{API}/classes/{TestClasses.class_id}/students",
                      headers=auth_headers,
                      json={"name": "TEST Student", "email": "s1@example.com"})
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["name"] == "TEST Student"
        assert "id" in s
        TestClasses.student_id = s["id"]

    def test_remove_student(self, http, auth_headers):
        r = http.delete(
            f"{API}/classes/{TestClasses.class_id}/students/{TestClasses.student_id}",
            headers=auth_headers,
        )
        assert r.status_code == 200

    def test_delete_class(self, http, auth_headers):
        r = http.delete(f"{API}/classes/{TestClasses.class_id}", headers=auth_headers)
        assert r.status_code == 200


# ------------ Grading ------------
class TestGrading:
    def test_grade_essay(self, http, auth_headers):
        r = http.post(f"{API}/grade/essay",
                      headers=auth_headers,
                      json={
                          "question": "What is photosynthesis?",
                          "student_answer": "Photosynthesis is plants making food using sunlight, water and CO2.",
                          "rubric": "Mention sunlight, water, CO2, oxygen, sugar.",
                          "language": "en",
                      },
                      timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "result" in body
        result = body["result"]
        # Score must be numeric
        score = result.get("score") if isinstance(result, dict) else None
        assert score is not None, f"score missing from result: {result}"
        assert isinstance(score, (int, float)), f"score not numeric: {type(score)}"
        # feedback should be present in some form
        fb_keys = ("feedback", "comments", "rationale", "explanation")
        if isinstance(result, dict):
            assert any(k in result for k in fb_keys), f"feedback missing: {result.keys()}"


# ------------ Live Quiz ------------
class TestLive:
    code = None
    participant_id = None

    def test_create_session(self, http, auth_headers):
        qid = TestAIGeneration.quiz_id
        assert qid, "Need quiz id from earlier test"
        r = http.post(f"{API}/live/sessions",
                      headers=auth_headers,
                      json={"quiz_id": qid, "timer_seconds": 20})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "code" in body and len(body["code"]) == 6 and body["code"].isdigit()
        TestLive.code = body["code"]

    def test_public_session_view(self, http):
        r = http.get(f"{API}/live/sessions/{TestLive.code}")
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == TestLive.code
        assert body["status"] == "lobby"

    def test_join_session(self, http):
        r = http.post(f"{API}/live/join",
                      json={"code": TestLive.code, "student_name": "TEST Alice"})
        assert r.status_code == 200
        body = r.json()
        assert "participant_id" in body
        TestLive.participant_id = body["participant_id"]

    def test_start_session(self, http, auth_headers):
        r = http.post(f"{API}/live/sessions/{TestLive.code}/control",
                      headers=auth_headers,
                      json={"action": "start"})
        assert r.status_code == 200
        assert r.json().get("status") == "running"

    def test_teacher_view_leaderboard(self, http, auth_headers):
        r = http.get(f"{API}/live/sessions/{TestLive.code}/teacher", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert "leaderboard" in body
        assert isinstance(body["leaderboard"], list)
        # Our participant should be in leaderboard
        names = [p["name"] for p in body["leaderboard"]]
        assert "TEST Alice" in names

    def test_submit_answer(self, http, auth_headers):
        # Get current question from teacher view to figure out the correct answer
        r = http.get(f"{API}/live/sessions/{TestLive.code}/teacher", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        q = body["quiz"]["questions"][body["current_q_idx"]]
        correct_answer = q.get("answer")
        # Submit correct answer
        r2 = http.post(f"{API}/live/answer",
                       json={"code": TestLive.code,
                             "participant_id": TestLive.participant_id,
                             "question_id": q.get("id"),
                             "answer": correct_answer})
        assert r2.status_code == 200, r2.text
        body2 = r2.json()
        # If we sent the actual answer, correct should be True
        if correct_answer is not None:
            assert body2.get("correct") is True, f"Expected correct, got {body2}"


# ------------ Assistant ------------
class TestAssistant:
    def test_assistant_chat(self, http, auth_headers):
        r = http.post(f"{API}/assistant/chat",
                      headers=auth_headers,
                      json={"message": "Hello, give me one short tip for teaching photosynthesis.",
                            "language": "en"},
                      timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "reply" in body and isinstance(body["reply"], str) and len(body["reply"]) > 0
        assert "session_id" in body


# ------------ Reports ------------
class TestReports:
    def test_overview(self, http, auth_headers):
        r = http.get(f"{API}/reports/overview", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert "totals" in body
        assert "timeline" in body
        assert "by_type" in body
        for key in ("documents", "quizzes", "classes", "generations", "live_sessions"):
            assert key in body["totals"]


# ------------ Cleanup of quiz ------------
class TestZCleanup:
    def test_delete_quiz(self, http, auth_headers):
        qid = TestAIGeneration.quiz_id
        if not qid:
            pytest.skip("No quiz to delete")
        r = http.delete(f"{API}/quizzes/{qid}", headers=auth_headers)
        assert r.status_code == 200
        r2 = http.get(f"{API}/quizzes/{qid}", headers=auth_headers)
        assert r2.status_code == 404
