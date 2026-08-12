# Rules.md — AI-Powered Commerce Platform (v1)

**Status:** Final — Ready for Build
**Purpose:** Coding conventions and build rules for Claude Code during implementation.

---

## 1. Workflow Discipline

Follow the same workflow used on all prior projects: **PRD → design docs → milestone breakdown → build → test → manual validation.** Do not skip straight to code without checking the relevant doc (PRD.md, Design.md, Architecture.md, Schema.md) first.

Build in the order: DB schema → backend API → frontend integration → polish/design pass. Don't build UI against endpoints that don't exist yet.

---

## 2. Scope Discipline

Only build what's in PRD.md Section 5 (Core Features) and Section 6 (Explicitly Out of Scope). Specifically:

- ❌ Do not build cart, checkout, or payment gateway code — even scaffolding "for later." It's out of scope for v1.
- ❌ Do not build buyer login/registration — buyers are unauthenticated in v1.
- ❌ Do not build product reviews/ratings.
- ❌ Do not build the AI Business Analyst — chatbot v1 is Product Assistant only, product-database-scoped.
- ❌ Do not let sellers create/edit categories — admin-only.

If a feature isn't explicitly listed in PRD.md, flag it before building rather than assuming it should be included.

---

## 3. Backend (FastAPI) Conventions

- Structure follows Architecture.md Section 3 exactly (`/core`, `/db`, `/models`, `/schemas`, `/routers`, `/services`)
- All request/response validation via Pydantic schemas — no raw dict handling in routers
- Every protected route uses the `permissions.py` dependency for RBAC checks — never trust a role/user_id passed in the request body for authorization decisions; always derive from the verified JWT
- Seller-scoped queries (products, inquiries, dashboard) always filter by `seller_id` from the JWT — never accept `seller_id` as a client-supplied filter for write operations
- External service calls (Gemini, Resend, Supabase Storage) live in `/services`, never called directly from routers
- API keys (Gemini, Resend, Supabase) loaded from environment variables via `core/config.py` — never hardcoded, never logged

---

## 4. Frontend (Next.js) Conventions

- Structure follows Architecture.md Section 2 (App Router layout)
- `proxy.ts` (the Next.js 16 replacement for `middleware.ts` — see Architecture.md Section 2) enforces route protection for `/seller/*` and `/admin/*` — don't rely on client-side conditional rendering alone to hide protected pages
- JWT handling via `lib/auth.ts` — keep token storage/retrieval logic centralized, not scattered across components
- All API calls go through `lib/api.ts` — no ad-hoc `fetch()` calls inside components
- AI chatbot widget mounted once in the root layout, not re-mounted per page

---

## 5. Design System Enforcement

Every UI surface must follow Design.md — this is a hard rule, not a suggestion:

- Colors: only Broken White `#FAF9F6`, Sky Blue `#0EA5E9`/`#38BDF8`, Deep Charcoal `#1E293B`, Warm Yellow `#FBBF24` (micro-accent only). No pure black, no purple/pink gradients.
- No glassmorphism, no default shadcn styling left unstyled, no default Recharts blue — charts must use the brand palette
- No 3D illustrations, blobs, or floating gradient shapes anywhere in the UI
- Motion limited to hover/transition/loading states only — no parallax, no floating objects, no heavy entrance animations
- Typography: heading font from the shortlist (General Sans/Satoshi/Plus Jakarta Sans), body from Inter/IBM Plex Sans — once locked, use consistently, don't mix in other fonts

If a generated component doesn't match Design.md, flag it and revise rather than shipping it as-is.

---

## 6. Data Integrity Rules

- Product view tracking (`product_views`) fires on every `/products/[id]` page load — this powers dashboard metrics, so it must not be skipped or stubbed
- Inquiry status transitions follow `New → Contacted → Closed` — don't add extra statuses without updating Schema.md and both dashboards
- Categories are seeded/managed only through admin-facing code paths — no seller-side category creation logic anywhere, including in seed scripts (seed scripts should assign products to pre-existing seeded categories)
- Seed data (50-100 products, multiple sellers, 10+ categories, spread inquiry statuses, backfilled view timestamps) must be realistic enough that dashboards and the AI assistant produce meaningful, non-trivial output — flat/empty demo data defeats the purpose of the differentiator

---

## 7. Copy & Content Rules

- No AI-generated-sounding marketing copy — write plainly, avoid generic buzzword-heavy hero text
- No fake statistics anywhere in the UI (per Design.md anti-slop checklist) — all displayed numbers must come from real seed data via the actual queries, never hardcoded placeholder numbers left in production code

---

## 8. Testing & Validation

- Manual validation pass required after each milestone (matches the standard workflow from prior projects), not just automated tests
- Before considering a milestone "done": verify RBAC boundaries manually (a seller cannot access another seller's products/inquiries; a seller cannot reach `/admin/*` endpoints)
- Verify the AI Product Assistant only ever responds using product-database context — no hallucinated products, no business/analytics data leaking into v1 chatbot responses

---

## 9. Out-of-Scope Reminders (Recap)

| Not in v1 | Deferred to |
|---|---|
| Cart / Checkout / Payment gateway | v1.5+ (client-driven add-on) |
| Buyer accounts / Wishlist | v1.5 |
| Product reviews/ratings | v1.5 |
| AI Business Analyst | v1.5 / v2 |
| RAG / MCP integration | v2 |
| Advanced recommendation system | v2 |

---

## 10. Document Set Complete

This is the last of the 5 core documents. Build order: **Schema.md → Architecture.md (backend) → Architecture.md (frontend) → Design.md (styling pass)**, referencing PRD.md throughout for scope checks.
