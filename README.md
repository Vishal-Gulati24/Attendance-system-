# Attendance System

School attendance system with simple UI (React) and Django API. Export to Excel (.xlsx).

## Project structure

```
attendance/
├── frontend/          # React + Vite (UI) — deploy this on Vercel
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/            # Django (API + Excel export)
│   ├── config/         # Django settings, urls
│   ├── core/           # App: models, views, API
│   ├── requirements.txt   # ← Backend deps: update here when you add packages
│   └── manage.py
├── requirements.txt   # Copy of backend deps (optional, for root pip install)
├── .gitignore
├── SYSTEM_DESIGN.md
└── README.md
```

- **Backend deps**: always update **`backend/requirements.txt`** when you add or remove Python packages (e.g. `pip install X` then add `X` to that file).
- **Frontend deps**: `frontend/package.json` (npm install adds them automatically).

## Easy setup (from scratch with official tools)

If you want to recreate the projects with the official CLIs:

### Frontend (React + Vite)

```bash
# From project root (attendance/)
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

Then add proxy to Django: in `frontend/vite.config.js` add:

```js
server: {
  proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
},
```

### Backend (Django)

```bash
# From project root
django-admin startproject config backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Then:
pip install django djangorestframework django-cors-headers openpyxl
python manage.py startapp core
# Add 'rest_framework', 'corsheaders', 'core' to INSTALLED_APPS in config/settings.py
# Copy models, views, urls from this repo's backend/core and config.
```

## Run the app (current repo)

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API: http://127.0.0.1:8000/api/

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

Frontend proxies `/api` to Django, so the React app can call the backend.

## Git: one repo (recommended)

Keep **one repository** for the whole project (frontend + backend together).

- **Single repo** (this project): `attendance/` with `frontend/` and `backend/` inside. One clone, one place to update code and requirements.
- **Separate repos**: You could split into two repos later if needed, but for hosting (see below) you’ll deploy frontend and backend separately from the same or different repos.

When you add or change backend dependencies, update **`backend/requirements.txt`**. The root **`requirements.txt`** is a copy for convenience (e.g. `pip install -r requirements.txt` from project root).

## Hosting (e.g. Vercel)

- **Vercel** is best for the **frontend** (React/Vite). Push this repo and in Vercel set **Root Directory** to **`frontend`**. Vercel will run `npm install` and `npm run build` in that folder and deploy the built app. Point the frontend’s API base URL to your backend URL (env variable).
- **Backend (Django)** cannot run on Vercel’s serverless in the same way. Host it elsewhere, e.g. **Railway**, **Render**, **PythonAnywhere**, or a VPS. Deploy the **same repo** and set the root to **`backend`** (or the project that contains `manage.py`), or clone the repo and run only the backend part there.

So: **one repo, two deployments** — frontend on Vercel (root `frontend`), backend on a Python host (root `backend` or this repo with root `backend`).

## Production (optional)

- Build frontend: `cd frontend && npm run build`
- Deploy frontend to Vercel (root: `frontend`).
- Deploy backend to a Python host; set CORS to allow your Vercel frontend origin.
