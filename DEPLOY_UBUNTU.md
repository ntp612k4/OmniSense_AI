# OmniSense AI deployment notes

## Database choice

For this project, use **MySQL Server** on the Ubuntu VM.

- **MySQL Workbench** is only a desktop administration tool, not the database server.
- **Firebase** is fast for realtime/mobile prototypes, but it is not a natural fit for self-hosting on a VM.
- **MongoDB** is useful for flexible documents, but OmniSense has relational SaaS data: users, workspaces, projects, uploads, reviews, jobs, analysis results and audit logs.
- **MySQL Server** is easier to host on the same VM, back up with `mysqldump`, query for reports and manage with Workbench from your laptop.

If you are allowed to choose outside those three options, PostgreSQL is also a strong fit. For the choices you listed, pick MySQL Server.

Starter schema: `database/schema_mysql.sql`.

## Current MVP state

The Docker MVP now uses `ai-engine/api.py` as a FastAPI service:

- Loads your existing MTL, XLM-RoBERTa and mBERT model folders.
- Receives one review through `POST /api/analyze`.
- Receives CSV files through `POST /api/analyze-csv`.
- Stores analysis history in MySQL.
- Returns rows and metrics to the React dashboard Test Lab.

The old Streamlit prototype remains in `ai-engine/app.py` for reference, but Docker runs the FastAPI service.

## Run locally

```bash
pip install -r ai-engine/requirements.txt
uvicorn api:app --app-dir ai-engine --host 0.0.0.0 --port 8502
```

## React dashboard

```bash
cd frontend
npm install
npm run dev
```

Development URL:

```text
http://localhost:5173
```

## Run with Docker Compose

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker

git clone <your-repo-url> omnisense-ai
cd omnisense-ai
docker compose up -d --build
```

The app will listen on:

```text
React dashboard: http://<vm-ip>:8501
AI API health:    http://<vm-ip>:8502/health
```

MySQL is exposed to the host on:

```text
Host: 127.0.0.1
Port: 3308
Database: omnisense_ai
User: omnisense
Password: omnisense_password
Root password: root_password
```

Inside Docker, the app connects to `mysql:3306`, not `127.0.0.1:3308`.

Useful commands:

```bash
docker compose ps
docker compose logs -f mysql
docker compose logs -f omnisense-app
docker compose logs -f frontend
docker compose down
```

For production, put Nginx in front of the React dashboard and API, then expose HTTPS on ports 80/443.

## Suggested SaaS architecture after MVP

1. **AI Engine**
   - Python FastAPI + PyTorch.
   - Endpoints: `POST /api/analyze`, `POST /api/analyze-csv`.
   - Returns sentiment, domain, language and confidence scores.

2. **Backend API**
   - Node.js/NestJS or FastAPI.
   - Handles auth, workspace, upload CSV, job queue, billing and API keys.
   - Writes to MySQL Server.

3. **Frontend Dashboard**
   - React or Next.js.
   - Reads analytics from backend API.
   - Shows charts, filters, alerts and export workflows.

4. **Deployment**
   - Ubuntu VM.
   - Docker Compose services: `frontend`, `backend`, `ai-engine`, `mysql`, `nginx`.
   - Volumes for MySQL and model artifacts.
   - Daily backup with `mysqldump`.
