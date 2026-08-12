# Architecture.md — AI-Powered Commerce Platform (v1)

**Status:** Final — Ready for Build

---

## 1. System Overview

```
┌─────────────────┐        ┌──────────────────┐        ┌───────────────────┐
│   Next.js App    │  HTTP  │   FastAPI Backend │  SQL   │   Supabase         │
│   (Vercel)        │ ─────▶│   (Railway)        │ ─────▶│   Postgres + Storage│
└─────────────────┘  JWT   └──────────────────┘        └───────────────────┘
        │                          │
        │                          ▼
        │                  ┌───────────────┐
        └─────────────────▶│  Gemini API    │  (AI Product Assistant)
                            └───────────────┘
                                   │
                            ┌───────────────┐
                            │  Resend        │  (Inquiry email notifications)
                            └───────────────┘
```

- **Frontend:** Next.js, calls the FastAPI backend via REST, holds JWT in memory/httpOnly cookie
- **Backend:** FastAPI, stateless, verifies JWT per request, talks to Postgres (Supabase) and external services (Gemini, Resend, Supabase Storage)
- **Database + Storage:** Supabase (Postgres for relational data, Storage for product images)
- **AI:** Gemini API called server-side only (backend proxies AI requests — API key never exposed to frontend)

---

## 2. Frontend Architecture (Next.js)

App Router structure, matching the routes locked in PRD.md:

```
/app
  /(public)
    page.tsx                     → /
    /products
      page.tsx                   → /products
      /[id]/page.tsx              → /products/[id]
    /sellers/[id]/page.tsx        → /sellers/[id]
    /categories/[slug]/page.tsx   → /categories/[slug]
    /login/page.tsx
    /register/page.tsx
  /seller
    /dashboard/page.tsx
    /products/page.tsx
    /products/new/page.tsx
    /products/[id]/edit/page.tsx
    /inquiries/page.tsx
    /inquiries/[id]/page.tsx
    /profile/page.tsx
  /admin
    /dashboard/page.tsx
    /users/page.tsx
    /products/page.tsx
    /categories/page.tsx
    /analytics/page.tsx
  /components
    /ui                          → shared UI primitives (buttons, cards, inputs)
    /chatbot                     → floating AI widget (global, mounted in root layout)
    /product                     → product card, gallery, filters
    /dashboard                   → shared dashboard chart/stat components
  /lib
    api.ts                       → API client (fetch wrapper, attaches JWT)
    auth.ts                      → auth helpers (token storage, role checks)
  proxy.ts                       → route protection for /seller/* and /admin/*
```

**Route protection:** `proxy.ts` checks JWT + role claim before allowing access to `/seller/*` and `/admin/*`. Public routes and product browsing require no auth.

> **Naming note (updated at implementation):** this file was specified as `middleware.ts`. Next.js 16 renamed the convention to `proxy.ts` and deprecated the old name, so the implementation uses `proxy.ts`. Behaviour, matcher config and responsibilities are unchanged.

**AI Chatbot widget:** mounted once in the root layout so it persists across all pages (per Design.md — floating, not a dedicated page).

---

## 3. Backend Architecture (FastAPI)

```
/app
  main.py                        → FastAPI app entrypoint, router registration
  /core
    config.py                    → env vars, settings
    security.py                  → JWT creation/verification, password hashing
    permissions.py                → RBAC dependency (role/permission checks)
  /db
    session.py                   → SQLAlchemy session/engine (Supabase Postgres)
    base.py
  /models                        → SQLAlchemy models (see Schema.md)
  /schemas                       → Pydantic request/response schemas
  /routers
    auth.py                      → /auth/register, /auth/login, /auth/me
    products.py                  → /products CRUD, search/filter
    categories.py                → /categories (admin-only write)
    inquiries.py                 → /inquiries CRUD, status updates
    dashboard.py                 → /dashboard/seller, /dashboard/admin
    chatbot.py                   → /chatbot/ask (proxies Gemini API)
    uploads.py                   → /uploads (Supabase Storage integration)
  /services
    email_service.py             → Resend integration
    ai_service.py                 → Gemini API integration, prompt construction
    storage_service.py            → Supabase Storage upload/delete
    view_tracking_service.py      → product view increment logic
```

**Auth flow:**
1. `POST /auth/login` → verify credentials → issue JWT (contains `user_id`, `role`)
2. Frontend stores JWT, attaches as `Authorization: Bearer <token>` on subsequent requests
3. Backend dependency (`permissions.py`) decodes JWT, checks role/permission before allowing access to protected routes (seller/admin endpoints)

**RBAC:** Users → Roles → Permissions tables (see Schema.md). Permission checks implemented as a FastAPI dependency, e.g. `require_permission("product:create")`, kept simple for v1 (roles map to a fixed permission set; no admin UI to edit permissions yet).

---

## 4. Key Flows

### 4.1 Product Listing (Seller)
1. Seller (authenticated) submits product form (name, price, stock, category, images)
2. Images uploaded to Supabase Storage via `/uploads` → returns public URLs
3. Product record created in Postgres with image URLs, scoped to `seller_id`

### 4.2 Buyer Inquiry
1. Buyer (no auth) submits inquiry form on `/products/[id]` (name, contact, message)
2. `POST /inquiries` creates record with status `New`, linked to `product_id` and `seller_id`
3. Backend triggers:
   - In-app notification (row inserted, read by seller dashboard/inquiries page)
   - Email via Resend to the seller
4. Seller updates status (`New` → `Contacted` → `Closed`) from `/seller/inquiries/[id]`

### 4.3 AI Product Assistant
1. Buyer types a question into the floating widget (e.g. "recommend a laptop under RM3000")
2. Frontend sends message to `POST /chatbot/ask`
3. Backend queries the product database for relevant candidates (filtered by category/price/keywords), constructs a prompt with that context, and calls Gemini API
4. Gemini response (grounded in the queried products) returned to frontend and rendered in the widget
5. **v1 constraint:** data source is the product database only — no access to analytics/business data (that's the deferred v1.5/v2 AI Business Analyst, a separate service/context)

### 4.4 Product View Tracking
1. On `/products/[id]` page load, frontend calls `POST /products/{id}/view` (fire-and-forget)
2. Backend increments a view counter (either a column on `products` or a separate `product_views` log table — see Schema.md) used to power the demand/engagement metrics in both dashboards

### 4.5 Dashboard Data
- `GET /dashboard/seller` → aggregates: own product count, inquiry counts by status, top-viewed products, top-inquired products (scoped by `seller_id` from JWT)
- `GET /dashboard/admin` → aggregates: platform totals, category performance, seller performance ranking, weekly trend data (new listings, inquiry volume)

---

## 5. External Services

| Service | Purpose | Notes |
|---|---|---|
| Gemini API (free tier) | AI Product Assistant | Called server-side only; API key stored in backend env vars |
| Resend | Inquiry email notifications to sellers | Backend service, simple transactional templates |
| Supabase Storage | Product image hosting | Backend uploads on behalf of authenticated sellers |
| Supabase Postgres | Primary database | Accessed via SQLAlchemy from FastAPI |

---

## 6. Deployment

| Component | Platform | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel | Connected to GitHub, auto-deploy on push |
| Backend (FastAPI) | Railway | Connected to GitHub, auto-deploy on push |
| Database + Storage | Supabase | Single data layer for Postgres + Storage, avoids splitting across extra providers |

**Environment separation:** single environment for v1 demo (no separate staging), since this is a portfolio/demo build, not a live multi-tenant production system yet.

---

## 7. Security Notes (v1 baseline)

- Passwords hashed (bcrypt/argon2) — never stored plain
- JWT expiry set to a reasonable session length; refresh handled via re-login for v1 simplicity (no refresh-token rotation needed at this scale)
- Gemini API key and Resend API key kept server-side only, never exposed to the frontend
- Seller-scoped queries always filter by `seller_id` derived from the JWT, never trusted from client input, to prevent one seller from editing/viewing another seller's data
- Admin-only routes (`/admin/*` backend endpoints) protected by role check, not just frontend route hiding

---

## 8. Next Document

**Schema.md** — full database schema: tables, columns, relationships for Users, Roles, Permissions, Products, Categories, Inquiries, ProductViews.
