# Aganyu — Talent Marketplace Platform

> **Malawi's premier AI-powered talent marketplace** connecting job seekers, students, and interns with employers through semantic discovery, verified trust, and a structured hiring pipeline.

---

## What is Aganyu?

Aganyu has evolved from a traditional job board into an **intelligent talent ecosystem**. By leveraging cutting-edge AI and vector embeddings, Aganyu moves beyond simple keyword matching to understand the *meaning* and *context* of professional experience. 

The platform enables "Zero-Noise" discovery, where employers find the perfect fit based on professional DNA, and job seekers are guided by gamified profile optimization to maximize their visibility.

The platform serves three audiences:

- **Job Seekers & Graduates** — build a rich, AI-optimized profile with verified certifications to get discovered by the right employers.
- **Students** — configure your profile for internship or attachment search and appear in relevant employer discovery pools.
- **Employers** — post structured job listings, leverage semantic matchmaking to find top talent, and manage a transparent hiring pipeline.

---

## Core Features

### 🧠 AI & Intelligent Matchmaking

Aganyu utilizes a **Hybrid Matchmaking Engine** to eliminate the "semantic gap" in hiring:
- **Semantic Discovery (pgvector + HuggingFace)**: Instead of exact keyword matches, the platform uses vector embeddings (`all-MiniLM-L6-v2`) to understand that a "Frontend Developer" is conceptually similar to a "React Engineer."
- **Professional DNA**: Seeker profiles (bio, skills, experience) are converted into high-dimensional vectors, allowing for intuitive "meaning-based" discovery.
- **Hybrid Scoring**: Match scores are calculated by blending **Hard Constraints** (must-have skills, minimum experience) with **Semantic Affinity** (how well the candidate's overall background fits the role's intent).
- **Real-time Sync**: Embeddings are automatically updated whenever a seeker modifies their profile or an employer updates a job listing.

### 🛡️ Trust & Security Layer

To ensure a safe and professional marketplace, Aganyu implements a multi-tier trust system:
- **Verified Employer Badges**: Admins vet companies to grant a "Verified" badge, signaling legitimacy to candidates and reducing scams.
- **Certificate Verification Pipeline**: An admin-led workflow to review and verify professional credentials, moving beyond self-declared skills to "Proven Expertise."
- **Privacy-First Design**: Three visibility levels (`PUBLIC`, `ANONYMOUS`, `HIDDEN`) ensure seekers can explore opportunities without risking their current employment.

### 🎯 Talent Marketplace (Discovery Engine)

- **Gamified Profile Readiness**
  - Interactive "Profile Strength" meter with actionable suggestions to help seekers optimize their visibility.
  - Full bio, skills, experience, education, certifications, and portfolio links.
  - Profile view analytics — see how many employers have viewed your profile.

- **Employer Discover Page** (`/dashboard/employer/discover`)
  - AI-powered semantic search and traditional filters.
  - Candidate cards linked to full public profile pages.

- **Employer Talent Pool**
  - **Save Candidate**: Bookmark talent for future roles.
  - **Invite to Apply**: Direct, structured invitations to promising candidates.

### 📋 Structured Hiring Pipeline

- **Structured Listings**: Jobs include `must_have_skills`, `nice_to_have_skills`, and "Knockout" screening questions.
- **Closed-Loop Feedback**: Seekers receive instant notifications whenever an employer updates their application status (`SHORTLISTED`, `INTERVIEWING`, etc.), eliminating the "application black hole."
- **Transparent Screening**: Automated computation of screening scores and breakdowns for every applicant.

---

### 🎓 Onboarding & Notifications

- **Guided Onboarding**: Multi-step flow capturing professional background, search intent, and visibility preferences.
- **Smart Notifications**: In-platform alerts for invites, status updates, and AI-suggested job matches.

---

### 👩‍💼 Admin Dashboard

- **Verification Center**: Dedicated tools to verify employers and candidate certificates.
- **System Management**: Full control over users, jobs, and a comprehensive audit log for all systemic mutations.

---

### 💳 Payments & Subscriptions

- Powered by **PayChangu** (Airtel Money, TNM Mpamba, Card — MWK)
- **Aganyu Badge** — seeker credibility badge
- **Aganyu Plus** — premium seeker plan

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Vanilla CSS / Tailwind CSS v4 |
| Icons | lucide-react |
| Forms | React Hook Form + Zod |
| Database | Supabase (PostgreSQL + pgvector) |
| AI/Embeddings | HuggingFace Inference API (`all-MiniLM-L6-v2`) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (avatars, resumes) |
| Realtime | Supabase Realtime (messages, notifications) |
| Payments | PayChangu |
| Email | Resend |

---

## Repository Structure

```
src/
├── app/
│   ├── (marketing)/          # Public pages: landing, jobs, pricing, terms
│   ├── (app)/dashboard/
│   │   ├── seeker/           # Seeker dashboard (Gamified), profile, applications
│   │   ├── employer/         # Employer dashboard, semantic discover, job management
│   │   └── admin/            # Admin verification center, user/job management
│   ├── api/
│   │   ├── profile/          # Profile updates + Embedding sync
│   │   ├── jobs/             # Job CRUD + Embedding sync
│   │   └── ...               # Other API endpoints
│   └── onboarding/           # Multi-step onboarding
├── components/
│   ├── profile/              # SeekerProfile form
│   ├── dashboard/            # Shared UI (VerifiedBadge, SectionCard, etc.)
│   └── layout/               # DashboardLayout, sidebar navigation
├── lib/
│   ├── embedding-service.ts  # HuggingFace vector generation
│   ├── sync-embeddings.ts    # Database vector synchronization
│   ├── candidate-match.ts    # Hybrid AI scoring logic
│   ├── auth-guard.ts         # Server-side auth helper
│   └── ...                   # Other utilities
supabase/
└── schema.sql                # Full canonical schema (source of truth)
```

---

## Database Schema Highlights

### `job_seekers` table (key fields)
```sql
embedding        vector(384) -- AI Professional DNA for semantic search
search_intent    TEXT  -- ACTIVELY_LOOKING | OPEN_TO_OFFERS | ...
profile_visibility TEXT -- PUBLIC | ANONYMOUS | HIDDEN
portfolio_links  TEXT[]
```

### `jobs` table (key fields)
```sql
embedding        vector(384) -- AI Job Requirement DNA
must_have_skills TEXT[]
nice_to_have_skills TEXT[]
status           TEXT -- ACTIVE | FILLED | ARCHIVED
```

### `certificates` table
```sql
is_verified      BOOLEAN -- Admin-verified status
verification_tier INTEGER -- Level of vetting (0: None, 1: Link, 2: Manual)
```

---

## Setup

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project with `pgvector` enabled
- HuggingFace API Token (Optional but recommended)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HUGGINGFACE_TOKEN=
RESEND_API_KEY=
```

### 3. Apply the database schema

```bash
# Apply the full canonical schema
psql -h <host> -U postgres -d postgres -f supabase/schema.sql
```

---

## Current Platform Status

### ✅ Working

| Feature | Status |
|---|---|
| AI Semantic Matchmaking (HuggingFace + pgvector) | ✅ |
| Verified Employer Badges | ✅ |
| Admin Certificate Verification Pipeline | ✅ |
| Profile Strength Gamification (Actionable suggestions) | ✅ |
| Closed-loop Application Feedback (Instant notifications) | ✅ |
| Public job board & Structured job posting | ✅ |
| Transparent screening scores & pipeline management | ✅ |
| Full seeker profile & certifications management | ✅ |
| Profile visibility & search intent controls | ✅ |
| Employer Discover page with semantic filters | ✅ |
| Payments & subscriptions (PayChangu) | ✅ |
| Admin dashboard & Audit logging | ✅ |
| Mobile responsive UI | ✅ |

---

## Privacy Design

Aganyu enforces strict privacy rules at the database level (RLS):

- **`HIDDEN` profiles** never appear in discovery or AI matchmaking.
- **`ANONYMOUS` profiles** show skills/experience but mask identifying details.
- **Contact details** are strictly reserved for `PUBLIC` profiles.

---

*Aganyu — Built for Malawi. Built to grow.*
