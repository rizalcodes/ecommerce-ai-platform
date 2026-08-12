# AI-Powered Commerce Platform

Commerce platform with an AI product assistant and per-role business dashboards.
Scope, design, architecture, schema and build rules are fixed in
[PRD.md](PRD.md), [Design.md](Design.md), [Architecture.md](Architecture.md),
[Schema.md](Schema.md) and [Rules.md](Rules.md). Those documents are the source of
truth — this README only covers how to run the thing.

```
backend/    FastAPI + SQLAlchemy  (Architecture.md Section 3)
frontend/   Next.js App Router    (Architecture.md Section 2)
```

## Requirements

- Node 20+ (built on 24.18) and npm
- Python 3.12
- A PostgreSQL database — local for early milestones, Supabase from M4 onward

## Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
cp .env.example .env                                      # then fill in DATABASE_URL
.venv/Scripts/uvicorn app.main:app --reload
```

Runs on http://localhost:8000. `GET /health` returns both process and database
status, so a failing database shows up as `"database": "unreachable"` rather than
a dead endpoint.

Database migrations (run from `backend/`):

```bash
.venv/Scripts/alembic upgrade head      # apply
.venv/Scripts/alembic downgrade base    # roll everything back
.venv/Scripts/alembic revision --autogenerate -m "message"
```

Alembic reads `DATABASE_URL` through `app/core/config.py`; `alembic.ini` holds no
credentials.

Admin accounts are not self-registerable — `/auth/register` only creates sellers.
Bootstrap the first admin with:

```bash
.venv/Scripts/python -m scripts.create_admin --email you@example.com --name "Your Name"
```

Interactive API docs are at http://localhost:8000/docs.

## Seed data

```bash
.venv/Scripts/python -m scripts.seed --reset       # 12 categories, 8 sellers, 80 products
.venv/Scripts/python -m scripts.seed --no-images   # same, without photo sourcing
```

Product photos are sourced from Openverse under CC0 / Public Domain Mark only —
those two licences carry no attribution requirement, and the schema has nowhere
to store a credit line.

Downloads are cached in `.seed_cache/`, and `.seed_cache/manifest.json` records
which photos belong to which product. Both are gitignored, so a fresh clone
re-sources photos on its first run and reuses them afterwards. If the image API
refuses a request, the seed stops searching and falls back to whatever the
manifest already holds rather than retrying into a block.

Seeded logins (`admin@aicommerce.example.com` and eight sellers) all use
`demo-password-2026`. Change them before any public deployment.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Runs on http://localhost:3000.

## Milestones

| # | Scope | Status |
|---|---|---|
| M1 | Project scaffold, design tokens, DB connection | done |
| M2 | Database schema — all tables in Schema.md Section 2 | done |
| M3 | Backend API — auth, catalog, inquiries, dashboards, chatbot | done |
| M4 | Realistic seed data + product images in Supabase Storage | done |
| M5 | Frontend — public pages, auth, seller area, admin area | next |
| M6 | Design pass against Design.md, anti-slop audit | |

## Notes for contributors

- The colour palette is closed (Design.md Section 2). Design tokens live in
  `frontend/app/globals.css`; use the token names, not raw hex values.
- Heading font is Plus Jakarta Sans standing in for Satoshi. Swapping it means
  editing only the loader in `frontend/app/layout.tsx`.
- Secrets are read through `backend/app/core/config.py` only, and never logged.
