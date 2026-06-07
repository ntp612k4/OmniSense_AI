import csv
import io
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from io import StringIO

import pandas as pd
import torch
import torch.nn as nn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModel, AutoModelForSequenceClassification, AutoTokenizer


if "HF_HOME" not in os.environ:
    os.environ["HF_HOME"] = "/app/.hf_cache"

APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
MODEL_DIR = Path(os.getenv("OMNISENSE_MODEL_DIR", str(ROOT_DIR / "models")))
DB_PATH = Path(os.getenv("OMNISENSE_DB_PATH", str(ROOT_DIR / "data" / "omnisense_ai.sqlite3")))

MYSQL_DEFAULTS = {
    "driver": os.getenv("OMNISENSE_DB_DRIVER", "mysql").lower(),
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "database": os.getenv("MYSQL_DATABASE", "omnisense_ai"),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
}

SENT_MAP = {0: "Negative", 1: "Neutral", 2: "Positive"}
DOMAIN_MAP = {0: "Service", 1: "Product", 2: "Education"}
LANG_MAP = {0: "EN", 1: "VI", 2: "FR", 3: "DE"}

LANG_LABEL = {
    "EN": "English",
    "VI": "Vietnamese",
    "FR": "French",
    "DE": "German",
    "Unsupported": "Unsupported",
}

TEXT_COLUMNS = ["review", "text", "content", "comment", "feedback", "message"]


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1)
    source: str = "Manual Test"
    workspace: str = "Demo Retail VN"
    model_name: str = "MTL - Multi-Task Learning"


class MultiTaskXLMR(nn.Module):
    def __init__(self, model_path: str = "xlm-roberta-base"):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_path)
        hidden_size = self.encoder.config.hidden_size
        self.sent_head = nn.Linear(hidden_size, 3)
        self.domain_head = nn.Linear(hidden_size, 3)
        self.lang_head = nn.Linear(hidden_size, 4)

    def forward(self, input_ids, attention_mask):
        cls_token = self.encoder(
            input_ids=input_ids,
            attention_mask=attention_mask,
        ).last_hidden_state[:, 0, :]
        return (
            self.sent_head(cls_token),
            self.domain_head(cls_token),
            self.lang_head(cls_token),
        )


@contextmanager
def mysql_connection(include_database: bool = True):
    try:
        import mysql.connector
    except ImportError as exc:
        raise RuntimeError("Missing mysql-connector-python dependency.") from exc

    args = {
        "host": MYSQL_DEFAULTS["host"],
        "port": int(MYSQL_DEFAULTS["port"]),
        "user": MYSQL_DEFAULTS["user"],
        "password": MYSQL_DEFAULTS["password"],
        "charset": "utf8mb4",
        "use_unicode": True,
    }
    if include_database:
        args["database"] = MYSQL_DEFAULTS["database"]

    conn = mysql.connector.connect(**args)
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    if MYSQL_DEFAULTS["driver"] == "mysql":
        database = MYSQL_DEFAULTS["database"].replace("`", "")
        with mysql_connection(include_database=False) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            conn.commit()

        with mysql_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS analysis_events (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    created_at VARCHAR(32) NOT NULL,
                    workspace VARCHAR(180) NOT NULL,
                    source VARCHAR(120) NOT NULL,
                    model_name VARCHAR(120) NOT NULL,
                    review_text TEXT NOT NULL,
                    sentiment VARCHAR(32) NOT NULL,
                    sentiment_confidence DOUBLE NOT NULL,
                    domain VARCHAR(80) NOT NULL,
                    domain_confidence DOUBLE NOT NULL,
                    language VARCHAR(32) NOT NULL,
                    language_confidence DOUBLE NOT NULL,
                    p_negative DOUBLE NOT NULL,
                    p_neutral DOUBLE NOT NULL,
                    p_positive DOUBLE NOT NULL,
                    INDEX idx_analysis_created (created_at),
                    INDEX idx_analysis_sentiment (sentiment),
                    INDEX idx_analysis_workspace (workspace)
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
                """
            )
            conn.commit()
        return

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analysis_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                workspace TEXT NOT NULL,
                source TEXT NOT NULL,
                model_name TEXT NOT NULL,
                review_text TEXT NOT NULL,
                sentiment TEXT NOT NULL,
                sentiment_confidence REAL NOT NULL,
                domain TEXT NOT NULL,
                domain_confidence REAL NOT NULL,
                language TEXT NOT NULL,
                language_confidence REAL NOT NULL,
                p_negative REAL NOT NULL,
                p_neutral REAL NOT NULL,
                p_positive REAL NOT NULL
            )
            """
        )


def save_events(events: list[dict]) -> None:
    if not events:
        return

    if MYSQL_DEFAULTS["driver"] == "mysql":
        with mysql_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(
                """
                INSERT INTO analysis_events (
                    created_at, workspace, source, model_name, review_text,
                    sentiment, sentiment_confidence, domain, domain_confidence,
                    language, language_confidence, p_negative, p_neutral, p_positive
                ) VALUES (
                    %(created_at)s, %(workspace)s, %(source)s, %(model_name)s, %(review_text)s,
                    %(sentiment)s, %(sentiment_confidence)s, %(domain)s, %(domain_confidence)s,
                    %(language)s, %(language_confidence)s, %(p_negative)s, %(p_neutral)s, %(p_positive)s
                )
                """,
                events,
            )
            conn.commit()
        return

    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany(
            """
            INSERT INTO analysis_events (
                created_at, workspace, source, model_name, review_text,
                sentiment, sentiment_confidence, domain, domain_confidence,
                language, language_confidence, p_negative, p_neutral, p_positive
            ) VALUES (
                :created_at, :workspace, :source, :model_name, :review_text,
                :sentiment, :sentiment_confidence, :domain, :domain_confidence,
                :language, :language_confidence, :p_negative, :p_neutral, :p_positive
            )
            """,
            events,
        )


@lru_cache(maxsize=3)
def load_ai_model(model_name: str) -> dict:
    if "MTL" in model_name:
        tokenizer = AutoTokenizer.from_pretrained("xlm-roberta-base")
        model = MultiTaskXLMR("xlm-roberta-base")
        state_path = MODEL_DIR / "mtl_main_model" / "best_mtl_standard.pt"
        model.load_state_dict(torch.load(state_path, map_location=torch.device("cpu")))
        model.eval()
        return {"type": "mtl", "model": model, "tokenizer": tokenizer}

    is_xlmr = "XLM" in model_name
    model_dir = MODEL_DIR / ("xlmr_main_model" if is_xlmr else "mbert_main_model")
    hub_name = "xlm-roberta-base" if is_xlmr else "bert-base-multilingual-cased"
    tokenizer = AutoTokenizer.from_pretrained(hub_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    return {"type": "hf", "model": model, "tokenizer": tokenizer}


def find_text_column(df: pd.DataFrame) -> str | None:
    normalized = {col.lower().strip(): col for col in df.columns}
    for key in TEXT_COLUMNS:
        if key in normalized:
            return normalized[key]
    for col in df.columns:
        if df[col].dtype == "object":
            return col
    return None


def find_named_column(df: pd.DataFrame, name: str) -> str | None:
    normalized = {col.lower().strip(): col for col in df.columns}
    return normalized.get(name)


def decode_csv_bytes(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def read_csv_flexible(raw: bytes) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(raw))
    if find_text_column(df):
        return df

    text = decode_csv_bytes(raw)
    outer_rows = list(csv.reader(StringIO(text)))
    if not outer_rows or any(len(row) != 1 for row in outer_rows):
        return df

    inner_lines = [row[0] for row in outer_rows if row and row[0].strip()]
    if not inner_lines or "," not in inner_lines[0]:
        return df

    return pd.read_csv(StringIO("\n".join(inner_lines)))


def predict_text(text: str, ai_system: dict, model_name: str, workspace: str, source: str) -> dict:
    tokenizer = ai_system["tokenizer"]
    model = ai_system["model"]
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)

    with torch.no_grad():
        if ai_system["type"] == "hf":
            logits = model(**inputs).logits
            sent_probs = torch.softmax(logits, dim=1)[0]
            sent_idx = int(torch.argmax(sent_probs).item())
            domain = "Unsupported"
            domain_confidence = 0.0
            language = "Unsupported"
            language_confidence = 0.0
        else:
            sent_logits, domain_logits, lang_logits = model(
                inputs["input_ids"],
                inputs["attention_mask"],
            )
            sent_probs = torch.softmax(sent_logits, dim=1)[0]
            domain_probs = torch.softmax(domain_logits, dim=1)[0]
            lang_probs = torch.softmax(lang_logits, dim=1)[0]
            sent_idx = int(torch.argmax(sent_probs).item())
            domain_idx = int(torch.argmax(domain_probs).item())
            lang_idx = int(torch.argmax(lang_probs).item())
            domain = DOMAIN_MAP[domain_idx]
            domain_confidence = float(domain_probs[domain_idx].item())
            language = LANG_MAP[lang_idx]
            language_confidence = float(lang_probs[lang_idx].item())

    sentiment = SENT_MAP[sent_idx]
    confidence = float(sent_probs[sent_idx].item())
    now = datetime.utcnow().isoformat(timespec="seconds")

    return {
        "id": f"ai-{int(datetime.utcnow().timestamp() * 1000)}-{abs(hash(text)) % 1000000}",
        "created_at": now,
        "workspace": workspace,
        "source": source,
        "model_name": model_name,
        "review_text": text.strip(),
        "review": text.strip(),
        "sentiment": sentiment,
        "sentiment_confidence": confidence,
        "domain": domain,
        "domain_confidence": domain_confidence,
        "language": LANG_LABEL.get(language, language),
        "language_code": language,
        "language_confidence": language_confidence,
        "confidence": f"{confidence * 100:.1f}%",
        "status": "Escalate" if sentiment == "Negative" else "Review" if sentiment == "Neutral" else "Resolved",
        "p_negative": float(sent_probs[0].item()),
        "p_neutral": float(sent_probs[1].item()),
        "p_positive": float(sent_probs[2].item()),
    }


def summarize(rows: list[dict]) -> dict:
    total = len(rows)
    negative = sum(1 for row in rows if row["sentiment"] == "Negative")
    neutral = sum(1 for row in rows if row["sentiment"] == "Neutral")
    positive = sum(1 for row in rows if row["sentiment"] == "Positive")
    confidence = sum(row["sentiment_confidence"] for row in rows) / total if total else 0
    return {
        "total": total,
        "negative": negative,
        "neutral": neutral,
        "positive": positive,
        "negative_rate": negative / total if total else 0,
        "neutral_rate": neutral / total if total else 0,
        "positive_rate": positive / total if total else 0,
        "confidence": confidence,
    }


app = FastAPI(title="OmniSense AI Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    try:
        init_db()
    except Exception:
        # Analysis can still return results if DB is temporarily unavailable.
        pass


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "omnisense-ai-engine"}


@app.post("/api/analyze")
def analyze(payload: AnalyzeRequest) -> dict:
    try:
        ai_system = load_ai_model(payload.model_name)
        row = predict_text(
            payload.text,
            ai_system,
            payload.model_name,
            payload.workspace,
            payload.source,
        )
        save_events([row])
        return {"row": row, "metrics": summarize([row])}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/analyze-csv")
async def analyze_csv(
    file: UploadFile = File(...),
    source: str = Form("CSV Upload"),
    workspace: str = Form("Demo Retail VN"),
    model_name: str = Form("MTL - Multi-Task Learning"),
    max_rows: int = Form(100),
) -> dict:
    try:
        raw = await file.read()
        df = read_csv_flexible(raw)
        text_col = find_text_column(df)
        if not text_col:
            raise HTTPException(
                status_code=400,
                detail="CSV must contain one text column: review, text, content, comment, feedback, or message.",
            )

        source_col = find_named_column(df, "source")
        clean_df = df.copy()
        clean_df[text_col] = clean_df[text_col].astype(str).str.strip()
        clean_df = clean_df[clean_df[text_col] != ""].head(max(1, min(max_rows, 500)))
        ai_system = load_ai_model(model_name)
        rows = [
            predict_text(
                row[text_col],
                ai_system,
                model_name,
                workspace,
                str(row[source_col]).strip() if source_col and str(row[source_col]).strip() else source,
            )
            for _, row in clean_df.iterrows()
        ]
        save_events(rows)
        return {"rows": rows, "metrics": summarize(rows), "text_column": text_col}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
