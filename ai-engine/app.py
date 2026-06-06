import os
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st
import torch
import torch.nn as nn
from transformers import AutoModel, AutoModelForSequenceClassification, AutoTokenizer


if "HF_HOME" not in os.environ:
    os.environ["HF_HOME"] = "D:/HF_Cache" if os.name == "nt" else "/app/.hf_cache"

APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
MODEL_DIR = Path(os.getenv("OMNISENSE_MODEL_DIR", str(ROOT_DIR / "models")))
DB_PATH = Path(os.getenv("OMNISENSE_DB_PATH", str(ROOT_DIR / "data" / "omnisense_ai.sqlite3")))
MYSQL_DEFAULTS = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "database": os.getenv("MYSQL_DATABASE", "omnisense_ai"),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
}

SENT_MAP = {
    0: "Negative",
    1: "Neutral",
    2: "Positive",
}
SENT_LABEL_VI = {
    "Negative": "Tiêu cực",
    "Neutral": "Trung tính",
    "Positive": "Tích cực",
}
DOMAIN_MAP = {
    0: "Service",
    1: "Product",
    2: "Education",
}
DOMAIN_LABEL_VI = {
    "Service": "Dịch vụ",
    "Product": "Sản phẩm",
    "Education": "Giáo dục",
    "Unsupported": "Không hỗ trợ",
}
LANG_MAP = {
    0: "EN",
    1: "VI",
    2: "FR",
    3: "DE",
}
LANG_LABEL_VI = {
    "EN": "Tiếng Anh",
    "VI": "Tiếng Việt",
    "FR": "Tiếng Pháp",
    "DE": "Tiếng Đức",
    "Unsupported": "Không hỗ trợ",
}

SAMPLE_REVIEWS = [
    "Dịch vụ hỗ trợ trả lời rất nhanh, tôi hài lòng với trải nghiệm mua hàng.",
    "Ứng dụng thường bị lỗi khi thanh toán và đội support phản hồi quá chậm.",
    "The product quality is acceptable, but delivery updates should be clearer.",
    "Le service client est professionnel, mais le prix est encore élevé.",
    "Der Kursinhalt ist gut strukturiert und leicht zu verstehen.",
]


st.set_page_config(
    page_title="OmniSense AI",
    page_icon=":material/analytics:",
    layout="wide",
    initial_sidebar_state="expanded",
)


st.markdown(
    """
    <style>
    :root {
        --bg: #f5f7f8;
        --surface: #ffffff;
        --ink: #111827;
        --muted: #5f6b7a;
        --line: #dde4ea;
        --accent: #0f766e;
        --accent-strong: #115e59;
        --positive: #15803d;
        --neutral: #6b7280;
        --negative: #b91c1c;
        --soft-accent: #d9f2ed;
    }

    .stApp {
        background:
            linear-gradient(180deg, rgba(217,242,237,.65) 0, rgba(245,247,248,0) 360px),
            var(--bg);
        color: var(--ink);
        font-family: "Segoe UI", "Geist", "Inter", system-ui, sans-serif;
    }

    #MainMenu, footer, header { visibility: hidden; }
    .block-container { padding-top: 2rem; padding-bottom: 3rem; max-width: 1420px; }
    section[data-testid="stSidebar"] {
        background: #0b1220;
        border-right: 1px solid rgba(255,255,255,.08);
    }
    section[data-testid="stSidebar"] * { color: #e5edf5 !important; }
    section[data-testid="stSidebar"] .stSelectbox,
    section[data-testid="stSidebar"] .stTextInput,
    section[data-testid="stSidebar"] .stMultiSelect { color: var(--ink) !important; }
    section[data-testid="stSidebar"] div[data-baseweb="select"] * { color: var(--ink) !important; }
    section[data-testid="stSidebar"] input { color: var(--ink) !important; }

    .app-shell {
        display: grid;
        gap: 1.45rem;
    }
    .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding-bottom: .35rem;
    }
    .brand {
        display: flex;
        align-items: center;
        gap: .8rem;
    }
    .brand-mark {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: #0b1220;
        color: #ffffff;
        font-weight: 800;
        letter-spacing: 0;
    }
    .brand h1 {
        margin: 0;
        font-size: 1.45rem;
        line-height: 1.1;
        letter-spacing: 0;
    }
    .brand p {
        margin: .2rem 0 0;
        color: var(--muted);
        font-size: .92rem;
    }
    .status-pill {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255,255,255,.78);
        padding: .55rem .85rem;
        color: var(--muted);
        font-weight: 650;
        white-space: nowrap;
    }
    .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr);
        gap: 1.25rem;
        align-items: stretch;
        margin-top: .75rem;
    }
    .hero-main, .panel, .metric-card, .insight-card {
        background: rgba(255,255,255,.9);
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, .07);
    }
    .hero-main {
        padding: 2rem;
        min-height: 260px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .eyebrow {
        margin: 0 0 .85rem;
        color: var(--accent-strong);
        font-weight: 750;
        letter-spacing: 0;
        font-size: .88rem;
    }
    .hero-main h2 {
        margin: 0;
        max-width: 820px;
        font-size: clamp(2rem, 4vw, 4rem);
        line-height: 1.02;
        letter-spacing: 0;
    }
    .hero-main .summary {
        max-width: 760px;
        margin: 1rem 0 0;
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.55;
    }
    .pipeline {
        padding: 1.35rem;
        display: grid;
        gap: 1rem;
        background:
            linear-gradient(150deg, rgba(255,255,255,.96), rgba(217,242,237,.8)),
            #ffffff;
    }
    .pipeline-step {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr);
        gap: .95rem;
        align-items: start;
        padding: 1.15rem;
        border: 1px solid rgba(15, 118, 110, .22);
        border-radius: 12px;
        background: rgba(255,255,255,.88);
        box-shadow: 0 14px 30px rgba(15, 23, 42, .07);
        transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    }
    .pipeline-step:hover {
        transform: translateY(-2px);
        border-color: rgba(15, 118, 110, .45);
        box-shadow: 0 18px 40px rgba(15, 23, 42, .11);
    }
    .step-index {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background: #0f766e;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 10px 22px rgba(15,118,110,.22);
        color: #ffffff;
        display: grid;
        place-items: center;
        font-weight: 850;
    }
    .step-index.neutral {
        background: #4b5563;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 10px 22px rgba(75,85,99,.2);
    }
    .step-index.alert {
        background: #b91c1c;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 10px 22px rgba(185,28,28,.18);
    }
    .sentiment-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 88px;
        padding: .36rem .7rem;
        border-radius: 999px;
        font-size: .8rem;
        font-weight: 800;
    }
    .sentiment-chip.positive {
        color: #0f5132;
        background: #dff7e8;
        border: 1px solid #a7e7bd;
    }
    .sentiment-chip.neutral {
        color: #374151;
        background: #eef2f7;
        border: 1px solid #cfd8e3;
    }
    .sentiment-chip.negative {
        color: #7f1d1d;
        background: #fee2e2;
        border: 1px solid #fecaca;
    }
    .db-note {
        border: 1px solid rgba(15, 118, 110, .22);
        border-radius: 12px;
        background: rgba(217, 242, 237, .52);
        padding: .8rem .9rem;
        color: #164e47;
        font-size: .9rem;
        line-height: 1.45;
    }
    .pipeline-step h3 {
        margin: 0 0 .2rem;
        font-size: .98rem;
    }
    .pipeline-step p {
        margin: 0;
        color: var(--muted);
        font-size: .86rem;
        line-height: 1.4;
    }
    .metric-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 1.35rem;
        margin-top: .15rem;
        margin-bottom: .65rem;
    }
    .metric-card {
        padding: 1.3rem 1.35rem;
        min-height: 140px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .metric-card span {
        color: var(--muted);
        font-size: .84rem;
        font-weight: 650;
    }
    .metric-card strong {
        display: block;
        margin-top: .35rem;
        font-size: 1.9rem;
        line-height: 1;
        letter-spacing: 0;
    }
    .metric-card small {
        display: block;
        margin-top: .5rem;
        color: var(--muted);
        line-height: 1.35;
    }
    .panel {
        padding: 1.15rem;
    }
    .panel h3 {
        margin: 0 0 .75rem;
        font-size: 1.05rem;
        letter-spacing: 0;
    }
    .panel p {
        color: var(--muted);
        line-height: 1.55;
    }
    .insight-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    .insight-card {
        padding: 1rem;
        min-height: 110px;
    }
    .insight-card h4 {
        margin: 0;
        font-size: .95rem;
        color: var(--muted);
    }
    .insight-card strong {
        display: block;
        margin-top: .5rem;
        font-size: 1.55rem;
    }
    .negative { color: var(--negative); }
    .positive { color: var(--positive); }
    .neutral { color: var(--neutral); }
    .accent { color: var(--accent-strong); }
    .stButton > button {
        border-radius: 12px;
        border: 1px solid var(--accent-strong);
        background: var(--accent);
        color: #ffffff;
        font-weight: 750;
        min-height: 44px;
        transition: transform .12s ease, box-shadow .12s ease;
    }
    .stButton > button:hover {
        border-color: var(--accent-strong);
        background: var(--accent-strong);
        color: #ffffff;
        box-shadow: 0 10px 28px rgba(15, 118, 110, .2);
    }
    .stButton > button:active { transform: translateY(1px); }
    .stTextArea textarea, .stTextInput input {
        border-radius: 12px !important;
        border: 1px solid #cbd5df !important;
        background: #ffffff !important;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: .55rem;
        border-bottom: 1px solid var(--line);
        padding-top: .4rem;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 10px 10px 0 0;
        color: var(--muted);
        font-weight: 700;
        padding: .75rem .9rem;
    }
    div[data-testid="stDataFrame"] {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
    }
    @media (max-width: 960px) {
        .hero, .insight-grid { grid-template-columns: 1fr; }
        .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .topbar { align-items: flex-start; flex-direction: column; }
    }
    @media (max-width: 620px) {
        .metric-grid { grid-template-columns: 1fr; }
        .hero-main { padding: 1.25rem; }
    }
    </style>
    """,
    unsafe_allow_html=True,
)


class MultiTaskXLMR(nn.Module):
    def __init__(self, model_path="xlm-roberta-base"):
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
def mysql_connection(db_config: dict, include_database: bool = True):
    try:
        import mysql.connector
    except ImportError as exc:
        raise RuntimeError(
            "Thiếu mysql-connector-python. Chạy: pip install mysql-connector-python"
        ) from exc

    connection_args = {
        "host": db_config["host"],
        "port": int(db_config["port"]),
        "user": db_config["user"],
        "password": db_config["password"],
        "charset": "utf8mb4",
        "use_unicode": True,
    }
    if include_database:
        connection_args["database"] = db_config["database"]

    conn = mysql.connector.connect(**connection_args)
    try:
        yield conn
    finally:
        conn.close()


def init_db(db_config: dict) -> None:
    if db_config["driver"] == "mysql":
        database = db_config["database"].replace("`", "")
        with mysql_connection(db_config, include_database=False) as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            conn.commit()

        with mysql_connection(db_config) as conn:
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


def save_events(events: list[dict], db_config: dict) -> None:
    if not events:
        return

    if db_config["driver"] == "mysql":
        with mysql_connection(db_config) as conn:
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


def load_events(db_config: dict, limit: int = 250) -> pd.DataFrame:
    if db_config["driver"] == "mysql":
        with mysql_connection(db_config) as conn:
            return pd.read_sql_query(
                """
                SELECT created_at, workspace, source, model_name, review_text,
                       sentiment, sentiment_confidence, domain, domain_confidence,
                       language, language_confidence, p_negative, p_neutral, p_positive
                FROM analysis_events
                ORDER BY id DESC
                LIMIT %s
                """,
                conn,
                params=(limit,),
            )

    if not DB_PATH.exists():
        return pd.DataFrame()
    with sqlite3.connect(DB_PATH) as conn:
        return pd.read_sql_query(
            """
            SELECT created_at, workspace, source, model_name, review_text,
                   sentiment, sentiment_confidence, domain, domain_confidence,
                   language, language_confidence, p_negative, p_neutral, p_positive
            FROM analysis_events
            ORDER BY id DESC
            LIMIT ?
            """,
            conn,
            params=(limit,),
        )


@st.cache_resource(show_spinner=False)
def load_ai_model(model_name: str) -> dict:
    try:
        if "MTL" in model_name:
            tokenizer = AutoTokenizer.from_pretrained("xlm-roberta-base")
            model = MultiTaskXLMR("xlm-roberta-base")
            model.load_state_dict(
                torch.load(
                    MODEL_DIR / "mtl_main_model" / "best_mtl_standard.pt",
                    map_location=torch.device("cpu"),
                )
            )
            model.eval()
            return {"type": "mtl", "model": model, "tokenizer": tokenizer}

        is_xlmr = "XLM-RoBERTa" in model_name
        model_dir = MODEL_DIR / ("xlmr_main_model" if is_xlmr else "mbert_main_model")
        hub_name = "xlm-roberta-base" if is_xlmr else "bert-base-multilingual-cased"
        tokenizer = AutoTokenizer.from_pretrained(hub_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        model.eval()
        return {"type": "hf", "model": model, "tokenizer": tokenizer}
    except Exception as exc:
        return {"type": "error", "message": str(exc)}


def predict_text(text: str, ai_system: dict, model_name: str, workspace: str, source: str) -> dict:
    model = ai_system["model"]
    tokenizer = ai_system["tokenizer"]
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)

    with torch.no_grad():
        if ai_system["type"] == "hf":
            logits = model(**inputs).logits
            sent_probs = torch.softmax(logits, dim=-1)[0]
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
            sent_probs = torch.softmax(sent_logits, dim=-1)[0]
            domain_probs = torch.softmax(domain_logits, dim=-1)[0]
            lang_probs = torch.softmax(lang_logits, dim=-1)[0]
            sent_idx = int(torch.argmax(sent_probs).item())
            domain_idx = int(torch.argmax(domain_probs).item())
            lang_idx = int(torch.argmax(lang_probs).item())
            domain = DOMAIN_MAP[domain_idx]
            domain_confidence = float(domain_probs[domain_idx].item())
            language = LANG_MAP[lang_idx]
            language_confidence = float(lang_probs[lang_idx].item())

    sentiment = SENT_MAP[sent_idx]
    return {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "workspace": workspace,
        "source": source,
        "model_name": model_name,
        "review_text": text.strip(),
        "sentiment": sentiment,
        "sentiment_confidence": float(sent_probs[sent_idx].item()),
        "domain": domain,
        "domain_confidence": domain_confidence,
        "language": language,
        "language_confidence": language_confidence,
        "p_negative": float(sent_probs[0].item()),
        "p_neutral": float(sent_probs[1].item()),
        "p_positive": float(sent_probs[2].item()),
    }


def find_text_column(df: pd.DataFrame) -> str | None:
    preferred = ["review", "text", "content", "comment", "feedback", "message"]
    normalized = {col.lower().strip(): col for col in df.columns}
    for key in preferred:
        if key in normalized:
            return normalized[key]
    for col in df.columns:
        if df[col].dtype == "object":
            return col
    return None


def sentiment_class(sentiment: str) -> str:
    if sentiment == "Positive":
        return "positive"
    if sentiment == "Negative":
        return "negative"
    return "neutral"


def summarize_metrics(df: pd.DataFrame) -> dict:
    total = len(df)
    negative = int((df["sentiment"] == "Negative").sum()) if total else 0
    neutral = int((df["sentiment"] == "Neutral").sum()) if total else 0
    positive = int((df["sentiment"] == "Positive").sum()) if total else 0
    confidence = float(df["sentiment_confidence"].mean()) if total else 0.0
    return {
        "total": total,
        "negative": negative,
        "neutral": neutral,
        "positive": positive,
        "negative_rate": (negative / total) if total else 0.0,
        "neutral_rate": (neutral / total) if total else 0.0,
        "positive_rate": (positive / total) if total else 0.0,
        "confidence": confidence,
    }


def render_distribution(title: str, series: pd.Series, labels: dict[str, str]) -> None:
    if series.empty:
        st.info("Chưa có dữ liệu để vẽ biểu đồ.")
        return
    chart_df = (
        series.value_counts()
        .rename_axis("label")
        .reset_index(name="count")
        .assign(label_vi=lambda data: data["label"].map(labels).fillna(data["label"]))
        .set_index("label_vi")
    )
    st.markdown(f"**{title}**")
    st.bar_chart(chart_df["count"], height=240)


with st.sidebar:
    st.markdown("## OmniSense AI")
    st.caption("Customer feedback intelligence")
    workspace = st.text_input("Workspace", value="Demo Retail VN")
    selected_model = st.selectbox(
        "Model phân tích",
        [
            "MTL - Multi-Task Learning",
            "XLM-RoBERTa - Main Model",
            "mBERT - Multilingual Base",
        ],
    )
    default_sources = ["CSV Upload", "Facebook", "Email", "App Store"]
    sources = st.multiselect(
        "Nguồn dữ liệu",
        default_sources,
        default=["CSV Upload", "Facebook"],
    )
    st.markdown("---")
    st.markdown("### Lưu dữ liệu")
    db_driver_label = st.selectbox(
        "Database",
        ["MySQL Server", "SQLite local"],
        index=0 if os.getenv("OMNISENSE_DB_DRIVER", "mysql").lower() == "mysql" else 1,
    )
    db_config = {
        "driver": "mysql" if db_driver_label == "MySQL Server" else "sqlite",
        **MYSQL_DEFAULTS,
    }
    if db_config["driver"] == "mysql":
        db_config["host"] = st.text_input("MySQL host", value=db_config["host"])
        db_config["port"] = st.number_input(
            "MySQL port",
            min_value=1,
            max_value=65535,
            value=int(db_config["port"]),
            step=1,
        )
        db_config["database"] = st.text_input("Database name", value=db_config["database"])
        db_config["user"] = st.text_input("MySQL user", value=db_config["user"])
        db_config["password"] = st.text_input(
            "MySQL password",
            value=db_config["password"],
            type="password",
        )
        st.markdown(
            '<div class="db-note">Nếu Workbench báo <b>Server Status: Stopped</b>, hãy bật Docker MySQL trước. App sẽ kết nối tới host và port bạn nhập ở đây.</div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f'<div class="db-note">Đang lưu demo vào SQLite: <b>{DB_PATH}</b></div>',
            unsafe_allow_html=True,
        )
    st.markdown("### VM Ubuntu")
    st.write("Có thể chạy Streamlit sau Nginx + systemd hoặc Docker Compose.")

db_ready = True
db_error = ""
try:
    init_db(db_config)
except Exception as exc:
    db_ready = False
    db_error = str(exc)
    st.sidebar.error(f"Chưa kết nối được DB: {db_error}")

ai_system = load_ai_model(selected_model)
history_df = load_events(db_config) if db_ready else pd.DataFrame()
metrics = summarize_metrics(history_df) if not history_df.empty else {
    "total": 0,
    "negative": 0,
    "neutral": 0,
    "positive": 0,
    "negative_rate": 0.0,
    "neutral_rate": 0.0,
    "positive_rate": 0.0,
    "confidence": 0.0,
}

st.markdown('<div class="app-shell">', unsafe_allow_html=True)
st.markdown(
    f"""
    <div class="topbar">
        <div class="brand">
            <div class="brand-mark">OS</div>
            <div>
                <h1>OmniSense AI</h1>
                <p>Nền tảng phân tích phản hồi khách hàng đa kênh</p>
            </div>
        </div>
        <div class="status-pill">Model: {selected_model.split(" - ")[0]} | DB: {db_driver_label if db_ready else "Chưa kết nối"}</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="hero">
        <div class="hero-main">
            <div>
                <p class="eyebrow">SaaS analytics workspace</p>
                <h2>Biến phản hồi rời rạc thành tín hiệu vận hành có thể hành động.</h2>
                <p class="summary">
                    Kết nối review từ mạng xã hội, email, kho ứng dụng hoặc CSV.
                    Mô hình AI phân loại cảm xúc, lĩnh vực và ngôn ngữ để đội sản phẩm
                    phát hiện rủi ro dịch vụ sớm hơn.
                </p>
            </div>
        </div>
        <div class="panel pipeline">
            <div class="pipeline-step">
                <div class="step-index">1</div>
                <div><h3>Ingest</h3><p>Upload CSV hoặc kết nối nguồn dữ liệu đa kênh.</p></div>
            </div>
            <div class="pipeline-step">
                <div class="step-index neutral">2</div>
                <div><h3>Analyze</h3><p>MTL/XLM-R/mBERT suy luận cảm xúc, lĩnh vực, ngôn ngữ.</p></div>
            </div>
            <div class="pipeline-step">
                <div class="step-index alert">3</div>
                <div><h3>Act</h3><p>Theo dõi cảnh báo tiêu cực và lịch sử phân tích.</p></div>
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

if ai_system.get("type") == "error":
    st.error(f"Không thể load model: {ai_system.get('message')}")
if not db_ready:
    st.warning(
        "Chưa kết nối được database. Trong ảnh MySQL Workbench đang báo server dừng, "
        "hãy start Docker MySQL rồi reload app để lưu vào MySQL."
    )

st.markdown(
    f"""
    <div class="metric-grid">
        <div class="metric-card"><span>Tổng phản hồi</span><strong>{metrics["total"]:,}</strong><small>Lưu trong workspace hiện tại</small></div>
        <div class="metric-card"><span>Tỷ lệ tiêu cực</span><strong class="negative">{metrics["negative_rate"] * 100:.1f}%</strong><small>{metrics["negative"]:,} phản hồi cần ưu tiên</small></div>
        <div class="metric-card"><span>Tỷ lệ trung tính</span><strong class="neutral">{metrics["neutral_rate"] * 100:.1f}%</strong><small>{metrics["neutral"]:,} phản hồi cần theo dõi</small></div>
        <div class="metric-card"><span>Tỷ lệ tích cực</span><strong class="positive">{metrics["positive_rate"] * 100:.1f}%</strong><small>{metrics["positive"]:,} tín hiệu hài lòng</small></div>
        <div class="metric-card"><span>Độ tin cậy TB</span><strong class="accent">{metrics["confidence"] * 100:.1f}%</strong><small>Trung bình softmax sentiment</small></div>
    </div>
    """,
    unsafe_allow_html=True,
)

tab_analyze, tab_dashboard, tab_architecture = st.tabs(
    ["Phân tích", "Dashboard", "Kiến trúc & triển khai"]
)

with tab_analyze:
    left, right = st.columns([1.05, .95], gap="large")
    with left:
        st.markdown('<div class="panel">', unsafe_allow_html=True)
        st.markdown("### Phân tích một phản hồi")
        selected_source = st.selectbox("Nguồn", sources or default_sources, key="single_source")
        text_input = st.text_area(
            "Nội dung review",
            height=150,
            placeholder="Ví dụ: Dịch vụ hỗ trợ phản hồi chậm và ứng dụng thường lỗi khi thanh toán.",
        )
        run_single = st.button("Phân tích review", use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

        if run_single:
            if ai_system.get("type") == "error":
                st.error("Model chưa sẵn sàng, kiểm tra thư mục model hoặc cache Hugging Face.")
            elif not db_ready:
                st.error("Database chưa kết nối, chưa thể lưu kết quả phân tích.")
            elif not text_input.strip():
                st.warning("Nhập nội dung review trước khi phân tích.")
            else:
                with st.spinner("OmniSense AI đang suy luận..."):
                    event = predict_text(
                        text_input,
                        ai_system,
                        selected_model,
                        workspace,
                        selected_source,
                    )
                    save_events([event], db_config)
                    st.session_state["last_single_event"] = event
                    time.sleep(.2)
                st.rerun()

        if "last_single_event" in st.session_state:
            event = st.session_state["last_single_event"]
            st.markdown(
                f"""
                <div class="insight-card">
                    <h4>Kết quả gần nhất</h4>
                    <strong class="{sentiment_class(event["sentiment"])}">{SENT_LABEL_VI[event["sentiment"]]}</strong>
                    <p>
                        Lĩnh vực: {DOMAIN_LABEL_VI.get(event["domain"], event["domain"])}
                        | Ngôn ngữ: {LANG_LABEL_VI.get(event["language"], event["language"])}
                        | Tin cậy: {event["sentiment_confidence"] * 100:.1f}%
                    </p>
                </div>
                """,
                unsafe_allow_html=True,
            )

    with right:
        st.markdown('<div class="panel">', unsafe_allow_html=True)
        st.markdown("### Upload CSV phản hồi")
        st.caption("Chấp nhận cột review, text, content, comment, feedback hoặc message.")
        uploaded = st.file_uploader("Tệp CSV", type=["csv"])
        use_sample = st.checkbox("Dùng dữ liệu mẫu để demo", value=uploaded is None)
        batch_source = st.selectbox("Nguồn batch", sources or default_sources, key="batch_source")
        max_rows = st.slider("Số dòng xử lý tối đa", min_value=5, max_value=200, value=50, step=5)
        run_batch = st.button("Phân tích batch", use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

        if run_batch:
            if ai_system.get("type") == "error":
                st.error("Model chưa sẵn sàng, chưa thể phân tích batch.")
            elif not db_ready:
                st.error("Database chưa kết nối, chưa thể lưu batch.")
            else:
                if use_sample:
                    batch_df = pd.DataFrame({"review": SAMPLE_REVIEWS})
                    text_col = "review"
                elif uploaded is not None:
                    batch_df = pd.read_csv(uploaded)
                    text_col = find_text_column(batch_df)
                else:
                    batch_df = pd.DataFrame()
                    text_col = None

                if batch_df.empty or not text_col:
                    st.warning("Không tìm thấy cột nội dung trong CSV.")
                else:
                    texts = (
                        batch_df[text_col]
                        .dropna()
                        .astype(str)
                        .str.strip()
                        .loc[lambda data: data != ""]
                        .head(max_rows)
                        .tolist()
                    )
                    progress = st.progress(0)
                    events = []
                    for index, text in enumerate(texts, start=1):
                        events.append(
                            predict_text(
                                text,
                                ai_system,
                                selected_model,
                                workspace,
                                batch_source,
                            )
                        )
                        progress.progress(index / len(texts))
                    save_events(events, db_config)
                    st.success(f"Đã phân tích và lưu {len(events)} phản hồi.")
                    time.sleep(.4)
                    st.rerun()

with tab_dashboard:
    fresh_df = load_events(db_config) if db_ready else pd.DataFrame()
    if fresh_df.empty:
        st.info("Chưa có dữ liệu. Hãy phân tích một review hoặc upload CSV để tạo dashboard.")
    else:
        c1, c2 = st.columns(2, gap="large")
        with c1:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            render_distribution("Phân phối cảm xúc", fresh_df["sentiment"], SENT_LABEL_VI)
            st.markdown("</div>", unsafe_allow_html=True)
        with c2:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            render_distribution("Ngôn ngữ khách hàng", fresh_df["language"], LANG_LABEL_VI)
            st.markdown("</div>", unsafe_allow_html=True)

        c3, c4 = st.columns(2, gap="large")
        with c3:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            render_distribution("Lĩnh vực phản hồi", fresh_df["domain"], DOMAIN_LABEL_VI)
            st.markdown("</div>", unsafe_allow_html=True)
        with c4:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            st.markdown("### Cảnh báo ưu tiên")
            alerts = fresh_df[fresh_df["sentiment"] == "Negative"].copy()
            if alerts.empty:
                st.success("Không có phản hồi tiêu cực trong dữ liệu gần nhất.")
            else:
                alerts["confidence"] = (alerts["sentiment_confidence"] * 100).round(1)
                st.dataframe(
                    alerts[["created_at", "source", "domain", "language", "confidence", "review_text"]].head(8),
                    use_container_width=True,
                    hide_index=True,
                )
            st.markdown("</div>", unsafe_allow_html=True)

        st.markdown('<div class="panel">', unsafe_allow_html=True)
        st.markdown("### Nhật ký phân tích")
        display_df = fresh_df.copy()
        display_df["sentiment"] = display_df["sentiment"].map(SENT_LABEL_VI)
        display_df["domain"] = display_df["domain"].map(DOMAIN_LABEL_VI).fillna(display_df["domain"])
        display_df["language"] = display_df["language"].map(LANG_LABEL_VI).fillna(display_df["language"])
        display_df["sentiment_confidence"] = (display_df["sentiment_confidence"] * 100).round(1)
        st.dataframe(
            display_df[
                [
                    "created_at",
                    "workspace",
                    "source",
                    "sentiment",
                    "sentiment_confidence",
                    "domain",
                    "language",
                    "review_text",
                ]
            ],
            use_container_width=True,
            hide_index=True,
        )
        st.markdown("</div>", unsafe_allow_html=True)

with tab_architecture:
    st.markdown('<div class="insight-grid">', unsafe_allow_html=True)
    st.markdown(
        """
        <div class="insight-card">
            <h4>Khối AI Engine</h4>
            <strong>FastAPI + PyTorch</strong>
            <p>Đóng gói model MTL/XLM-R/mBERT thành API /api/v1/analyze khi tách microservice.</p>
        </div>
        <div class="insight-card">
            <h4>Backend SaaS</h4>
            <strong>Node.js hoặc FastAPI</strong>
            <p>Quản lý user, workspace, billing, upload CSV, queue xử lý batch và audit log.</p>
        </div>
        <div class="insight-card">
            <h4>Database khuyến nghị</h4>
            <strong>MySQL Server trên VM</strong>
            <p>Phù hợp dữ liệu có cấu trúc: users, projects, reviews, analysis_jobs, results.</p>
        </div>
        <div class="insight-card">
            <h4>Hosting</h4>
            <strong>Ubuntu VM + Docker Compose</strong>
            <p>Nginx reverse proxy, service app, service DB, volume backup định kỳ.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.markdown("### Chọn Firebase, MongoDB hay MySQL Workbench?")
    st.write(
        "Nên chọn MySQL Server cho bản deploy VM Ubuntu. MySQL Workbench chỉ là công cụ quản trị trên máy cá nhân, không phải database runtime. "
        "Firebase hợp khi cần realtime/mobile rất nhanh nhưng khó tự host trên VM. MongoDB hợp dữ liệu document linh hoạt, nhưng dashboard SaaS này có nhiều quan hệ và báo cáo tổng hợp nên SQL thuận lợi hơn."
    )
    st.markdown("### Lộ trình MVP đề xuất")
    st.write(
        "Giai đoạn 1: giữ Streamlit làm demo sản phẩm và dùng SQLite để lưu lịch sử. "
        "Giai đoạn 2: tách AI Engine thành FastAPI, chuyển DB sang MySQL Server, thêm upload CSV và bảng jobs. "
        "Giai đoạn 3: React dashboard riêng, auth, workspace, phân quyền và cảnh báo theo thời gian thực."
    )
    st.markdown("</div>", unsafe_allow_html=True)

st.markdown("</div>", unsafe_allow_html=True)
