# 🛍️ AI Commerce Platform — Marketplace with an AI Product Assistant

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.12-009688?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini_3.5-4285F4?style=flat-square&logo=google&logoColor=white)
![Live](https://img.shields.io/badge/Status-Live_in_Production-2ea44f?style=flat-square)

**[Live Demo →](https://ecommerce-ai-platform-seven.vercel.app)**

---

## ❓ Problem

Most freelance "e-commerce website" offerings are the same three things wearing different colors: a template storefront, a cart, and a checkout form. They differentiate on price, not on what the platform actually does for the seller or the buyer — and building a cart/checkout system just to showcase design skills is a lot of effort spent proving nothing unique.

## 💡 Solution

A multi-vendor marketplace that skips cart/checkout entirely and puts the effort into two things that actually differentiate: **direct buyer-seller conversion** (inquiry-based, not cart-based) and **business intelligence that works even with zero sales data**. Every dashboard metric here is a demand signal (views, inquiries) rather than a revenue figure, because there's no revenue in v1 — and that constraint became the design.

---

## ✨ Features

- 🏪 **Public storefront** — browse, filter (category/price/availability/sort), search across 8 independent sellers and 80 seeded products with real photography
- 🤖 **AI Product Assistant** — a floating widget that recommends products from the live catalogue only. Retrieval-first: candidates are pulled from the database *before* the model sees anything, so it can't recommend something that doesn't exist. Budget questions get honest answers ("nothing under RM3000, cheapest is RM3499") instead of false negatives
- 💬 **Contact Seller, not Cart** — buyers submit an inquiry (no account needed) that lands in the seller's dashboard *and* their email (Resend) *and* an in-app notification, with a WhatsApp shortcut as a fast path
- 📊 **Two dashboards, zero fake numbers** — Seller dashboard (own products, inquiry status breakdown, most-viewed/most-inquired). Admin dashboard (platform-wide category/seller performance, weekly trends). No chart library — every bar and trend line is drawn with the brand's own color tokens so nothing defaults to library-blue
- 🔐 **RBAC done properly** — Users → Roles → Permissions, not a flat `role` column, so adding a Moderator or Store Manager role later needs no schema change
- 🚫 **Suspension that actually suspends** — deactivating a seller's account doesn't just block their login; it removes their listings from the catalogue, category counts, public stats, *and* the AI assistant's candidate pool — verified with before/after measurements, not assumed

---

## 🛡️ Design Discipline

The brief was explicit: build something that doesn't read as AI-generated. That meant auditing every screen against a checklist, not just eyeballing it:

| Rule | Enforcement |
|---|---|
| No purple-pink gradients, no glassmorphism, no 3D blobs | Swept with grep across the whole codebase before shipping — found and removed a lingering `backdrop-blur` on the header |
| Closed color palette (4 colors, no exceptions) | Every component reads from CSS tokens; zero raw hex values in any `.tsx` file |
| WCAG AA contrast | Measured, not assumed — caught two failing greys (2.4:1, 1.4:1) and fixed them before shipping |
| Font license checked before use | Satoshi was the first choice; its EULA turned out to prohibit self-hosting without written consent. Caught before shipping, switched to Plus Jakarta Sans (SIL OFL) |
| No invented statistics | Every number on every page comes from a live query. The homepage trust strip counts real rows — there's no "10,000+ happy customers" |

---

## 🛠️ Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript | Server-rendered storefront, client-rendered dashboards |
| Backend | FastAPI + SQLAlchemy + Alembic | 33-endpoint REST API, RBAC, migrations |
| Database | PostgreSQL (Supabase) | 12 tables, RBAC seed, demand/engagement schema |
| Storage | Supabase Storage | Product images, uploaded server-side only |
| AI | Gemini 3.5 Flash | Retrieval-grounded product recommendations |
| Email | Resend | Inquiry notifications, own verified sending domain |
| Auth | JWT (python-jose, bcrypt) | Stateless auth, role claim read by the route gate |
| Deployment | Vercel (frontend) · Railway (backend) · Supabase (data) | Split hosting, connected via a Postgres connection pooler |

---

## 📡 Architecture

```
Buyer / Seller / Admin (browser)
            │
            ▼
   Next.js frontend (Vercel)
   ├── Public routes — no auth
   ├── /seller/* — role-gated by JWT claim
   └── /admin/*  — role-gated by JWT claim
            │  REST + JWT bearer
            ▼
   FastAPI backend (Railway)
   ├── RBAC dependency — permission checked per route,
   │   never trusts a role sent in the request body
   ├── AI service — retrieves candidates from DB first,
   │   then asks Gemini to choose only from that list
   └── core/visibility.py — single definition of
       "buyer can see this," applied everywhere so
       a suspended seller can't leak through one path
            │
            ▼
   Supabase (Postgres + Storage)
```

Every buyer-facing read passes through one visibility rule (`active product AND active seller`), so the catalogue, the product page, the stats strip, and the AI assistant's candidate pool can never drift out of sync with each other.

---

## ⚡ Quick Start

```bash
git clone https://github.com/rizalcodes/ecommerce-ai-platform.git
cd ecommerce-ai-platform
```

**Backend:**

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
cp .env.example .env                             # fill in DATABASE_URL, JWT_SECRET, etc.
alembic upgrade head
python -m scripts.seed --no-images               # or drop --no-images for real photos
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Demo accounts (seeded): `admin@aicommerce.example.com` and 8 seller accounts, all `demo-password-2026`.

---

## 📁 Project Structure

```
ecommerce-ai-platform/
├── backend/
│   ├── app/
│   │   ├── core/            # config, security, RBAC, visibility rule
│   │   ├── models/          # SQLAlchemy models (12 tables)
│   │   ├── routers/         # 33 endpoints across 9 routers
│   │   └── services/        # AI, email, storage, view tracking
│   ├── alembic/              # schema + RBAC seed migrations
│   └── scripts/               # seed data, admin creation
├── frontend/
│   └── app/
│       ├── (public)/           # storefront, product detail, categories, sellers
│       ├── seller/               # dashboard, products CRUD, inquiries, profile
│       ├── admin/                  # dashboard, analytics, users, categories
│       └── components/               # dashboard/, product/, chatbot/, ui/
└── PRD.md · Design.md · Architecture.md · Schema.md · Rules.md   # spec docs
```

The five spec docs are the source of truth this was built against — not written after the fact, but locked before the first line of code and referenced throughout.

---

## 👤 Author

**Rizal**

[![Portfolio](https://img.shields.io/badge/Portfolio-rizalcodes.github.io-0A66C2?style=flat-square)](https://rizalcodes.github.io)
[![GitHub](https://img.shields.io/badge/GitHub-rizalcodes-181717?style=flat-square&logo=github)](https://github.com/rizalcodes)
[![Twitter/X](https://img.shields.io/badge/X-@rizalcodes_-000000?style=flat-square&logo=x)](https://x.com/rizalcodes_)

---

*A cart is easy to demo. A platform that stays honest without one is the harder thing to build — and the more interesting one to show.*
