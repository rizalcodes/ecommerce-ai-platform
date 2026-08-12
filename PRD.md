# PRD — AI-Powered Commerce Platform (v1)

**Status:** Final — Ready for Build
**Date:** 12 August 2026
**Niche:** E-Commerce / Retail (general multi-category marketplace)

---

## 1. Product Positioning

**Statement:**
> "An AI-powered commerce platform built to help businesses sell better and understand their customers."

**Not:** "Another AI SaaS template."

**Value proposition:** "E-commerce platform + Business Intelligence + AI Assistant" — differentiated from generic template-seller offerings by including full auth, a real per-role dashboard, and an integrated AI feature as standard.

**Design priority order:** Trust > Product clarity > Business value > AI capability > Visual personality

**Go-to-market note:** The demo/portfolio build is a general multi-category marketplace (like Shopee — clothing, electronics, beauty, etc., multiple sellers/categories) to showcase system capability. Sales positioning to real freelance clients is as a **configurable single-store website** — most clients need one store for their own business, not a full multi-vendor marketplace. The architecture supports both without extra engineering (a client is simply onboarded as a single seller, or seller+admin merged).

---

## 2. Background

Built by a self-taught Python developer (~1.5 years) with 7 shipped projects, including `ecommerce-bi-dashboard` (Plotly Dash, PostgreSQL, competitive pricing analysis for Lazada vs Zalora Malaysia) — extended here with auth, product management, and an AI chatbot rather than starting from zero.

This is the top-priority project while Shipd/Project Olympus is paused. Sold via Dribbble and Braintrust (kept separate from LinkedIn, which maintains a developer/AI positioning).

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js |
| Backend | Python — FastAPI |
| Database | PostgreSQL |
| Auth | JWT-based |
| File/Image Storage | Supabase Storage |
| Database Hosting | Supabase (consolidated with storage) |
| Backend Hosting | Railway |
| Frontend Hosting | Vercel |
| Email (transactional) | Resend |
| AI | Gemini API (free tier) |
| Build tooling | Claude Code |

---

## 4. Roles & Access

| Role | Login required | Notes |
|---|---|---|
| Buyer | ❌ No | Public browsing only in v1. No account needed since there's no cart/checkout to gate. Buyer accounts added only if a client requests cart functionality (v1.1+). |
| Seller | ✅ Yes | Manages own products, views own dashboard, handles inquiries. |
| Admin | ✅ Yes | Manages platform: users, categories, analytics. |

**RBAC architecture:** Users → Roles → Permissions (not a flat `user.role` field), for future scalability (potential future roles: Moderator, Store Manager, Staff). Kept simple in implementation for v1 — no full permission-management UI needed yet.

---

## 5. Core Features (v1)

### 5.1 Product Catalog
- Product CRUD, scoped to the logged-in seller
- Fields: name, description, price, stock, category, images
- Product image management: main image + multiple images, stored via Supabase Storage
- Categories are **admin-managed only** (not seller-generated) — keeps taxonomy consistent for analytics; sellers pick from existing categories when listing a product

### 5.2 Search & Filter
- **Buyer side:** category, price range, sort (newest/price), availability
- **Admin side:** seller, category, product status

### 5.3 Contact Seller (replaces Cart/Checkout as the conversion path)
- **Inquiry Form** — buyer submits an inquiry (no login required), saved to database
- Inquiry lifecycle status: **New → Contacted → Closed**
- Seller notified via **in-app notification + email (Resend)**
- **WhatsApp shortcut** available as a secondary, quick-contact option
- Feeds seller dashboard metrics (see 5.5)

### 5.4 AI Product Assistant (Chatbot)
- **v1 scope:** Product discovery/recommendation only — e.g. "Recommend a laptop under RM3000" → searches product database and returns matches
- Data source: product database only
- Displayed as a **floating widget** on all pages (not a dedicated page)
- **Deferred to v1.5/v2:** AI Business Analyst — answers business/analytics questions ("which category performs best", "why did inquiries drop") using the analytics database. Kept as a separate system since it needs a different data source and context.

### 5.5 Dashboards

Because there is no cart/checkout, there is no sales data. Metrics are reframed around **demand & engagement signals**: product views and inquiries.

**Seller Dashboard** — personal, operational focus:
- Total active products
- Inquiry breakdown by status (New / Contacted / Closed)
- Most-viewed products
- Most-inquired products

**Admin Dashboard** — platform-wide, business-intelligence focus (leverages prior `ecommerce-bi-dashboard` work):
- Total sellers, products, categories, inquiries (current period)
- Category performance (products + inquiries per category)
- Seller performance (ranked by inquiries received)
- Market trends (new listings per week, inquiry volume per week)
- Top 5 most-viewed products platform-wide

**Requires:** product view tracking (increment counter on product detail page load).

Design inspiration for both dashboards: Shopify Admin, Stripe Dashboard, Linear — clean white cards, subtle borders, clear hierarchy, brand-colored charts. Avoid default shadcn styling, default blue Recharts, and glassmorphism.

### 5.6 Seed Data
Realistic demo dataset: 50–100 products, multiple sellers, 10+ categories — needed so the dashboard and AI assistant have meaningful data to demonstrate, given there's no live transaction data.

---

## 6. Explicitly Out of Scope (v1)

| Feature | Status |
|---|---|
| Cart | ❌ Excluded |
| Checkout | ❌ Excluded |
| Payment gateway | ❌ Excluded |
| Product ratings/reviews | ❌ Excluded (needs buyer accounts to be trustworthy) |
| AI Business Analyst | ❌ Deferred to v1.5/v2 |

**Future (v1.5):** Buyer accounts, wishlist, cart, reviews
**Future (v2):** AI Business Analyst, RAG integration, MCP integration, advanced recommendation system

---

## 7. Routing Structure

**Public (no login):**
```
/
/products
/products/[id]
/sellers/[id]
/categories/[slug]
/login
/register
```

**Seller (protected):**
```
/seller/dashboard
/seller/products
/seller/products/new
/seller/products/[id]/edit
/seller/inquiries
/seller/inquiries/[id]
/seller/profile
```

**Admin (protected):**
```
/admin/dashboard
/admin/users
/admin/products
/admin/categories
/admin/analytics
```

**Global:** AI chatbot floating widget on all pages.

---

## 8. Design System (summary — full detail in Design.md)

**Positioning:** Premium AI Commerce Platform — modern retail, trustworthy, clean, approachable, premium. Explicitly avoiding generic AI-startup / SaaS-template / developer-dashboard look.

**References:** Shopify premium storefront feel, Linear cleanliness, Stripe Dashboard, modern retail brands.

**Palette:**
| Role | Color |
|---|---|
| Background | Broken White `#FAF9F6` |
| Primary accent | Sky Blue `#0EA5E9` (alt `#38BDF8`) |
| Text | Deep Charcoal `#1E293B` (never pure black) |
| Secondary/micro-accent | Warm Yellow `#FBBF24` |

**Typography:**
- Heading: General Sans / Satoshi / Plus Jakarta Sans (personality, modern, slightly warm, bold)
- Body: Inter / IBM Plex Sans (neutral, readable)

**Hero:** Product-photography-driven (real seed-data products). Layout: headline + value prop + CTA on the left; product showcase + small AI assistant card + small analytics preview card on the right. No abstract AI illustrations, 3D blobs, or floating gradients.

**Motion:** Subtle only — hover states, smooth filter transitions, button/loading states. No parallax, floating objects, or excessive entrance animations.

**Anti-AI-slop checklist:**
- ❌ Purple-pink gradients
- ❌ Glassmorphism everywhere
- ❌ Generic 3D blobs
- ❌ Excessive rounded pill components
- ❌ AI-generated marketing copy
- ❌ Too many animations
- ❌ Fake statistics
- ✅ Real product images, realistic seed data, clear hierarchy, purposeful micro-interactions, human-written copy, functional UI

---

## 9. Open Items for Design.md / Architecture.md

- Final typography pick (still gathering references from styles.refero.design / bestfreefonts.com)
- Detailed DB schema (Users, Roles, Permissions, Products, Categories, Inquiries, ProductViews)
- Notification implementation detail (Resend email templates, in-app notification model)

---

## 10. Next Documents

1. **Design.md** — full visual system, component specs
2. **Architecture.md** — system architecture, API structure, auth flow
3. **Schema.md** — database schema and relations
4. **Rules.md** — build/coding conventions for Claude Code
