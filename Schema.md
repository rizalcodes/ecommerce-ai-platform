# Schema.md — AI-Powered Commerce Platform (v1)

**Status:** Final — Ready for Build
**Database:** PostgreSQL (hosted on Supabase)

---

## 1. Entity Relationship Overview

```
users ──< user_roles >── roles ──< role_permissions >── permissions

users (seller) ──< seller_profiles (1:1)

users (seller) ──< products >── categories

products ──< product_images

products ──< product_views

products ──< inquiries >── users (seller, denormalized for query speed)

users (seller) ──< notifications
```

---

## 2. Tables

### 2.1 `users`
Core account table for Seller and Admin roles. Buyers do not have accounts in v1.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR | UNIQUE, NOT NULL |
| password_hash | VARCHAR | NOT NULL |
| name | VARCHAR | NOT NULL |
| phone | VARCHAR | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

---

### 2.2 `roles`
Small fixed table for v1: `seller`, `admin`. Designed to allow future roles (Moderator, Store Manager, Staff) without schema changes.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR | UNIQUE, NOT NULL |

---

### 2.3 `permissions`
Fixed permission list for v1 (e.g. `product:create`, `product:edit`, `product:delete`, `category:manage`, `inquiry:manage`, `user:manage`, `analytics:view_platform`). No admin UI to edit these in v1 — managed via seed/migration.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR | UNIQUE, NOT NULL |

---

### 2.4 `role_permissions` (join table)

| Column | Type | Constraints |
|---|---|---|
| role_id | UUID | FK → roles.id |
| permission_id | UUID | FK → permissions.id |
| | | PK (role_id, permission_id) |

---

### 2.5 `user_roles` (join table)
Many-to-many for future flexibility (a user could hold multiple roles later); in v1 practice each user has exactly one role.

| Column | Type | Constraints |
|---|---|---|
| user_id | UUID | FK → users.id |
| role_id | UUID | FK → roles.id |
| | | PK (user_id, role_id) |

---

### 2.6 `seller_profiles`
1:1 extension of `users` for seller-specific storefront info.

| Column | Type | Constraints |
|---|---|---|
| user_id | UUID | PK, FK → users.id |
| store_name | VARCHAR | NOT NULL |
| store_description | TEXT | NULLABLE |
| whatsapp_number | VARCHAR | NULLABLE (used for Contact Seller WhatsApp shortcut) |
| avatar_url | VARCHAR | NULLABLE (Supabase Storage URL) |

---

### 2.7 `categories`
Admin-managed only (per Design/PRD decision — sellers cannot create categories).

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR | UNIQUE, NOT NULL |
| slug | VARCHAR | UNIQUE, NOT NULL |
| created_by | UUID | FK → users.id (admin who created it) |
| created_at | TIMESTAMP | DEFAULT now() |

---

### 2.8 `products`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| seller_id | UUID | FK → users.id, NOT NULL |
| category_id | UUID | FK → categories.id, NOT NULL |
| name | VARCHAR | NOT NULL |
| slug | VARCHAR | UNIQUE, NOT NULL |
| description | TEXT | NULLABLE |
| price | NUMERIC(12,2) | NOT NULL |
| stock | INTEGER | DEFAULT 0 |
| status | ENUM('active','inactive') | DEFAULT 'active' |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

Index: `(category_id)`, `(seller_id)`, `(status)` — supports filter/search performance.

---

### 2.9 `product_images`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK → products.id, NOT NULL |
| url | VARCHAR | NOT NULL (Supabase Storage URL) |
| is_main | BOOLEAN | DEFAULT false |
| sort_order | INTEGER | DEFAULT 0 |

---

### 2.10 `product_views`
Log table (not just a counter column) so weekly/trend analytics can be computed for the Admin Dashboard's "market trends" metric.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK → products.id, NOT NULL |
| viewed_at | TIMESTAMP | DEFAULT now() |

Index: `(product_id, viewed_at)` — supports both "most-viewed product" and time-bucketed trend queries.

---

### 2.11 `inquiries`
Buyer → Seller contact, replacing cart/checkout as the v1 conversion path.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK → products.id, NOT NULL |
| seller_id | UUID | FK → users.id, NOT NULL (denormalized for fast dashboard queries) |
| buyer_name | VARCHAR | NOT NULL |
| buyer_contact | VARCHAR | NOT NULL (email or phone) |
| message | TEXT | NULLABLE |
| status | ENUM('new','contacted','closed') | DEFAULT 'new' |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

Index: `(seller_id, status)` — supports seller dashboard inquiry breakdown.

---

### 2.12 `notifications`
In-app notification for sellers when a new inquiry arrives.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| type | VARCHAR | e.g. 'new_inquiry' |
| reference_id | UUID | NULLABLE (e.g. inquiry_id) |
| is_read | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT now() |

---

## 3. Seed Data Plan

Per PRD: realistic demo dataset needed since there's no live transaction data to fall back on.

| Entity | Target volume |
|---|---|
| Sellers | Multiple (e.g. 5-10) |
| Categories | 10+ (e.g. Fashion, Electronics, Beauty, Home, Sports, etc.) |
| Products | 50-100, distributed across sellers and categories |
| Product images | 1 main + 1-3 additional per product |
| Inquiries | A spread across all 3 statuses (New/Contacted/Closed), varied dates, so dashboards show realistic trend data |
| Product views | Backfilled with varied timestamps so "market trends" charts aren't flat |

---

## 4. Next Document

**Rules.md** — coding conventions and build rules for Claude Code to follow during implementation.
