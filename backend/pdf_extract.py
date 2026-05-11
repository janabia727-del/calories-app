"""Extract text from PDF files (and plain text fallback)."""
import io
import logging
from typing import Tuple
from pypdf import PdfReader

logger = logging.getLogger(__name__)


def extract_text_from_pdf(data: bytes, max_chars: int = 60000) -> Tuple[str, int]:
    """Return (text, pages)."""
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = len(reader.pages)
        chunks = []
        total = 0
        for page in reader.pages:
            try:
                t = page.extract_text() or ""
            except Exception:
                t = ""
            chunks.append(t)
            total += len(t)
            if total >= max_chars:
                break
        text = "\n\n".join(chunks)
        return text[:max_chars], pages
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return "", 0


def extract_text(data: bytes, content_type: str) -> Tuple[str, int]:
    if content_type == "application/pdf" or (data[:4] == b"%PDF"):
        return extract_text_from_pdf(data)
    # Plain text fallback
    try:
        return data.decode("utf-8", errors="ignore")[:60000], 1
    except Exception:
        return "", 0
