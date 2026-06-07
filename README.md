# OmniSense AI

OmniSense AI is a full-stack SaaS project for AI-powered customer sentiment analytics. It helps teams ingest feedback from multiple channels, classify sentiment with multilingual NLP models, and monitor customer signals through a dashboard.

## Features

- React dashboard for SaaS analytics UI.
- FastAPI AI engine for sentiment, domain, and language classification.
- Test Lab in the React dashboard for one-review evaluation and CSV batch upload.
- MySQL database service for analysis history.
- Docker Compose setup for frontend, AI engine, and database.
- Clean project structure for future backend API expansion.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, lucide-react |
| AI Engine | Python, FastAPI, PyTorch, Transformers |
| Database | MySQL 8 |
| DevOps | Docker Compose |
| Models | mBERT, XLM-RoBERTa, Multi-Task Learning model |

## Project Structure

```text
OmniSense_AI/
|-- frontend/        React dashboard UI
|-- backend/         API scaffold for SaaS services
|-- ai-engine/       FastAPI/Python AI inference service
|-- database/        MySQL schema and database assets
|-- design-system/   UI design system documentation
|-- models/          Local model artifacts, ignored by Git
|-- data/            Local runtime data, ignored by Git
|-- docker-compose.yml
|-- DEPLOY_UBUNTU.md
`-- README.md
```

## Run With Docker

Start all services:

```powershell
cd D:\CD4_SAB
docker compose up -d --build
```

Open the apps:

```text
React dashboard: http://localhost:8501
AI API:          http://localhost:8502/health
MySQL:           127.0.0.1:3308
```

Check running containers:

```powershell
docker compose ps
```

View logs:

```powershell
docker compose logs mysql
docker compose logs omnisense-app
docker compose logs frontend
```

Stop services:

```powershell
docker compose down
```

Reset MySQL volume if the database was initialized incorrectly:

```powershell
docker compose down -v
docker compose up -d --build
```

## MySQL Connection

Use these credentials in MySQL Workbench:

```text
Host: 127.0.0.1
Port: 3308
Database: omnisense_ai
User: omnisense
Password: omnisense_password
Root password: root_password
```

When the AI API runs inside Docker, it connects to MySQL using:

```text
Host: mysql
Port: 3306
```

When the AI API runs directly on Windows, use:

```text
Host: 127.0.0.1
Port: 3308
```

## Run Frontend Locally

Use this only when you want to develop the React dashboard outside Docker:

```powershell
cd D:\CD4_SAB\frontend
npm install
npm run dev
```

If Vite says `Port 5173 is in use`, open the port it prints, for example:

```text
http://localhost:5174
```

Or stop the old dev server and run again.

When running with Docker, use `http://localhost:8501` for the main dashboard. Port `5173` is kept only for frontend development compatibility.

## Run AI Engine Locally

```powershell
cd D:\CD4_SAB
pip install -r ai-engine\requirements.txt
uvicorn api:app --app-dir ai-engine --host 0.0.0.0 --port 8502
```

The old Streamlit prototype remains in `ai-engine/app.py`, but the Docker app uses `ai-engine/api.py` so the React Test Lab can call the real AI model from one dashboard.

## Git Notes

The following folders are intentionally ignored and should not be pushed to GitHub:

```text
models/
data/
frontend/node_modules/
frontend/dist/
backend/node_modules/
```

Model files are large local artifacts. Keep them on the local machine or upload them to a model registry, object storage, or release artifact system instead of Git.

## Deployment

See [DEPLOY_UBUNTU.md](DEPLOY_UBUNTU.md) for Ubuntu VM deployment notes.
