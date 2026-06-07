FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/app/.hf_cache

WORKDIR /app

COPY ai-engine/requirements.txt .
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch>=2.2" \
    && pip install --no-cache-dir -r requirements.txt

COPY ai-engine/app.py .
COPY ai-engine/api.py .

EXPOSE 8501

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8501"]
