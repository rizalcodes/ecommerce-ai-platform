# Design.md — AI-Powered Commerce Platform (v1)

**Status:** Final direction locked — typography final pick pending
**Positioning:** "Premium AI Commerce Platform"

---

## 1. Core Feeling

Premium commerce experience powered by AI — modern retail, trustworthy, clean, approachable, premium.

**References:**
- Shopify premium storefront feeling
- Linear cleanliness
- Modern retail brands
- Minimal but functional SaaS UX

**Explicitly NOT:**
- Dark hacker aesthetic
- Neon AI theme
- Futuristic 3D AI style
- Generic AI startup / SaaS template / developer dashboard look

---

## 2. Color Palette

### Primary Background — Broken White
`#FAF9F6`
Usage: main page background, hero section, content areas
Purpose: warm, premium, product-focused (not sterile pure-white)

### Primary Accent — Sky Blue
Preferred: `#0EA5E9` · Alternative: `#38BDF8`
Usage: CTA buttons, active states, links, important highlights, AI assistant elements
Purpose: trust, technology, friendliness

### Text — Deep Charcoal
`#1E293B`
Usage: headlines, body text, navigation
**Never use pure black.**

### Secondary Accent (optional) — Warm Yellow
`#FBBF24`
Usage: micro-accent only — badges, notifications, highlights
**Do not use multiple bright colors simultaneously.**

### Accessibility note
Check contrast of `#0EA5E9` against `#FAF9F6` when used for small text/links — safe for large buttons, may need darkening for small link text. Verify at implementation time.

---

## 3. Typography

Avoid using only default Inter for everything — needs personality.

**Heading:** General Sans / Satoshi / Plus Jakarta Sans
Requirements: personality, modern, slightly warm, bold headlines

**Body:** Inter / IBM Plex Sans
Requirements: readable, neutral, professional

**Status:** Final pick still pending — reference styles.refero.design and bestfreefonts.com before locking. Reference: Summertime (Pinterest) for bold, confident headline energy.

---

## 4. Hero Section

**Avoid:**
- Abstract AI illustration
- 3D blobs
- Generic AI characters
- Floating gradient shapes
- Sky/cloud photo or video background (considered and dropped — pulls focus from product, conflicts with motion guidelines)

**Use:** Product-photography-driven hero. Reference: Bakery (Pinterest) — real product photography as the visual anchor, not illustration.

**Recommended composition:**

| Left | Right |
|---|---|
| Product/platform headline | Realistic product showcase (from seed data) |
| Value proposition | Small AI assistant card |
| CTA buttons | Small analytics preview card |

The hero should sell the product, not the technology.

---

## 5. Homepage Layout Reference

Reference: EverRoot Build (Pinterest) — clean structure that translates well to this platform:

1. Hero (per section 4)
2. Trust/stat strip (e.g. total products, sellers, categories — small stat cards, not a wall of numbers)
3. Featured/popular products grid (real photography)
4. "Why shop here" / value props (AI assistant, verified sellers, etc. — icon + short text, no long paragraphs)
5. Category browse section
6. Testimonials / social proof (if available — real only, never fabricated)
7. Footer (quick links, categories, contact)

---

## 6. Dashboard Design

Dashboard should feel like a real business tool, not a CRUD panel.

**Avoid:**
- Default shadcn dashboard styling
- Default blue Recharts
- Generic cards everywhere
- Glassmorphism

**Use:**
- Clean white cards
- Subtle borders
- Clear information hierarchy
- Brand-colored charts (Sky Blue / Charcoal / Warm Yellow accents — never default chart-library blue)
- Functional layout

**Inspiration:** Shopify Admin, Stripe Dashboard, Linear

**Seller Dashboard focus:** business operations — products, inventory, inquiries (by status), product performance (views/inquiries)

**Admin Dashboard focus:** platform intelligence — category performance, seller performance, market trends, platform-wide analytics

---

## 7. AI Chatbot Widget

- Floating widget, present on all pages (not a dedicated `/chat` page)
- Must be visually branded/integrated — not a generic "ChatGPT-style" chat bubble that looks bolted on
- Use Sky Blue as its primary accent, consistent with the rest of the UI
- v1 = Product Assistant only (visually, this can be framed subtly as "Ask about products")

---

## 8. Motion Guidelines

**Allowed:**
- Hover states on product cards
- Smooth filter transitions
- Button states
- Loading states

**Avoid:**
- Parallax
- Floating objects
- Excessive entrance animations
- Flashy effects

Reference tool for polish: emilkowal.ski/skill (animation/polish skill for Claude Code)

---

## 9. Anti-AI-Slop Checklist

**Avoid:**
- ❌ Purple-pink gradients
- ❌ Glassmorphism everywhere
- ❌ Generic 3D blobs
- ❌ Excessive rounded pill components
- ❌ AI-generated marketing copy
- ❌ Too many animations
- ❌ Fake statistics

**Prefer:**
- ✅ Real product images
- ✅ Realistic seed data
- ✅ Clear hierarchy
- ✅ Purposeful micro-interactions
- ✅ Human-written copy
- ✅ Functional UI

### Rejected references (anti-patterns to avoid, for calibration)
- **USD Bloom** (Pinterest ref) — purple gradient + 3D illustration; textbook AI-slop pattern
- **Stodio** (Pinterest ref) — dark theme, doesn't match Broken White direction
- **Zest Citrus** (Pinterest ref) — floating object graphics, too far from the trustworthy-tech direction Sky Blue is meant to convey

---

## 10. Design Priority Order

1. Trust
2. Product clarity
3. Business value
4. AI capability
5. Visual personality

---

## 11. Design Tools Reference

- **Design systems/reference:** styles.refero.design, supahero.io
- **AI design skills (Claude Code):** impeccable.style, tasteskill.dev, emilkowal.ski/skill, figma mcp
- **Video/motion:** jitter.video
- **Assets:** uppbeat.io (music), bestfreefonts.com (fonts)

---

## 12. Final Positioning Statement

> "An AI-powered commerce platform built to help businesses sell better and understand their customers."

Not: "Another AI SaaS template."
