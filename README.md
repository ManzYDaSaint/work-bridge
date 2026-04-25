# WorkBridge — Talent Marketplace Platform

> **Malawi's premier talent marketplace** connecting job seekers, students, and interns with employers through proactive discovery, skill-based matching, and a structured hiring pipeline.

---

## What is WorkBridge?

WorkBridge has evolved from a traditional job board into a **proactive talent marketplace**. Instead of waiting for candidates to apply, employers can now discover, save, and directly invite talent — while job seekers build a rich, verifiable online presence that works for them 24/7.

The platform serves three audiences:

- **Job Seekers & Graduates** — build a full professional profile with skills, experience, education, certifications, and portfolio links to get discovered by employers.
- **Students** — configure your profile for internship or attachment search and appear in relevant employer discovery pools.
- **Employers** — post structured job listings, discover pre-screened talent, manage a hiring pipeline, and invite promising candidates directly.

---

## Core Features

### 🎯 Talent Marketplace (Discovery Engine)

- **Seeker Profiles with Online Presence**
  - Full bio, skills, experience, education, certifications, and portfolio links
  - Avatar upload and profile completion tracking
  - Profile view analytics — see how many employers have viewed your profile

- **Privacy Controls** — seekers choose one of three visibility levels:
  - `PUBLIC` — full profile visible to employers including contact details
  - `ANONYMOUS` — skills and experience visible, name/photo/contacts hidden
  - `HIDDEN` — does not appear in any employer discovery pool

- **Search Intent** — seekers declare what they are looking for:
  - Actively looking for jobs
  - Open to offers
  - Seeking internship or attachment
  - Not looking

- **Employer Discover Page** (`/dashboard/employer/discover`)
  - Filter by skills, search intent, and seniority level
  - Skill-based search with debounced input
  - Candidate cards linked to full public profile pages

### 👤 Candidate Profile View (`/dashboard/employer/talent/[id]`)

When an employer clicks a candidate, they see:
- Full profile: bio, experience, education, certifications, portfolio links
- Contact information (only for `PUBLIC` profiles)
- WhatsApp direct message button (if candidate enabled it)
- **Save Candidate** button — bookmark candidates to a personal talent pool
- **Invite to Apply** button — opens a modal to select a role and send a direct in-platform message

### ⭐ Saved Talent Pool (`/dashboard/employer/talent/saved`)

- Employers bookmark candidates they want to revisit
- Dedicated "Saved Talent" page with card grid and one-click unsave
- Accessible from the employer sidebar

### ✉️ Invite to Apply (Direct Messaging)

- Employers select a role and optionally write a custom message
- Platform sends an in-app message and a notification to the candidate
- Message is stored in the existing conversations/messages system

### ✨ Automated Matchmaking

**For Employers — Suggested Candidates on Job Detail Page** (`/dashboard/employer/jobs/[id]`):
- Each job detail page has a "✨ Suggested Candidates" tab
- Queries all visible candidates whose skills overlap with job requirements
- Shows matched skills per candidate highlighted in green
- One-click "Invite" button per candidate card

**For Seekers — Recommended Jobs on Dashboard**:
- Seeker dashboard shows a "Recommended for You" widget
- Matches active job listings whose skill requirements overlap with the seeker's skills
- Updates automatically as the seeker adds skills to their profile

---

### 📋 Structured Hiring Pipeline

- Employers post jobs with structured requirements:
  - `skills`, `must_have_skills`, `nice_to_have_skills`
  - `minimum_years_experience`, `screening_questions`, `salary_range`, `deadline`
  - Work mode: `REMOTE`, `HYBRID`, `ON_SITE`

- When a seeker applies, the server computes a **transparent screening score**:
  - Required skill match check
  - Optional skill match
  - Experience vs. minimum requirement
  - Screening question answers
  - Stores: `screening_score`, `screening_summary`, `screening_breakdown`, `meets_required_criteria`

- Employer pipeline stages: `PENDING` → `SHORTLISTED` → `INTERVIEWING` → `HIRED` / `REJECTED`

- Employers can view the candidate pipeline per job from the Jobs list or Job Detail page

---

### 🎓 Onboarding Flow

New users (both students and graduates) complete a multi-step onboarding that captures:
- Personal details and professional background
- Skills, experience, and education
- Search intent (job, internship, open to offers, etc.)
- Profile visibility preference (set before entering the discovery pool)

---

### 🔔 Notifications

- In-platform notifications for invite events, application updates, and messages
- Seekers receive a notification when an employer invites them to apply

---

### 👩‍💼 Admin Dashboard

- Manage users, employer accounts, job listings, and applications
- Approve or reject employer accounts
- Audit log for all platform actions

---

### 💳 Payments & Subscriptions

- Powered by **PayChangu** (Airtel Money, TNM Mpamba, Card — MWK)
- **WorkBridge Badge** — seeker credibility badge
- **WorkBridge Plus** — premium seeker plan

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Vanilla CSS / Tailwind CSS v4 |
| Icons | lucide-react |
| Forms | React Hook Form + Zod |
| Database | Supabase (PostgreSQL + Row Level Security) |
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
│   │   ├── seeker/           # Seeker dashboard, profile, applications, saved jobs
│   │   ├── employer/         # Employer dashboard, jobs, candidates, discover, saved talent
│   │   └── admin/            # Admin user, employer, job, and audit management
│   ├── api/
│   │   ├── profile/          # Seeker profile GET/PUT, certificates CRUD, avatar upload
│   │   ├── employer/
│   │   │   ├── discover/     # Talent search + candidate public profile
│   │   │   ├── jobs/[id]/matches/  # Skill-based matchmaking for a job
│   │   │   ├── messages/invite/    # Invite to Apply messaging
│   │   │   └── talent/       # Save/unsave candidates, saved list
│   │   ├── seeker/jobs/recommended/ # Seeker-side job recommendations
│   │   ├── jobs/             # Public job listing + application endpoints
│   │   ├── applications/     # Application submission and management
│   │   └── notifications/    # In-platform notification management
│   └── onboarding/           # Multi-step onboarding for new users
├── components/
│   ├── profile/              # SeekerProfile form with certs, portfolio, marketplace prefs
│   ├── dashboard/            # Shared UI: SectionCard, Badge, Tabs, StatCard, PageHeader
│   └── layout/               # DashboardLayout, sidebar navigation
├── lib/
│   ├── validations/          # Zod schemas for profile, jobs, applications
│   ├── auth-guard.ts         # Server-side auth helper
│   ├── supabase-server.ts    # Server Supabase client
│   └── api.ts                # Client-side fetch helpers
supabase/
├── schema.sql                # Full canonical schema (source of truth)
└── migrations/               # Incremental SQL migrations
```

---

## Database Schema Highlights

### `job_seekers` table (key fields)
```sql
search_intent    TEXT  -- ACTIVELY_LOOKING | OPEN_TO_OFFERS | SEEKING_INTERNSHIP | NOT_LOOKING
profile_visibility TEXT -- PUBLIC | ANONYMOUS | HIDDEN
portfolio_links  TEXT[] -- Array of URL strings
profile_views    INTEGER -- Incremented every time an employer views the profile
```

### `employer_saved_candidates` table
```sql
employer_id  UUID  -- references employers
seeker_id    UUID  -- references job_seekers
notes        TEXT  -- optional employer notes
created_at   TIMESTAMP
```

### `certificates` table
```sql
seeker_id      UUID
title          TEXT
issuer         TEXT
issue_date     DATE
credential_url TEXT
```

---

## Setup

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project
- PayChangu credentials (for payment features)
- Resend credentials (for email notifications)

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
NEXT_PUBLIC_APP_URL=
PAYCHANGU_SECRET_KEY=
RESEND_API_KEY=
```

### 3. Apply the database schema

**Fresh database:**
```bash
# Option A — apply the full canonical schema
psql -h <host> -U postgres -d postgres -f supabase/schema.sql

# Option B — use Supabase CLI
npx supabase db push
```

**Existing database (apply incremental migrations):**
```bash
npx supabase db push
```

Key migrations to ensure are applied:
- `20260424170000_add_talent_marketplace_fields.sql` — adds `search_intent`, `profile_visibility`, `portfolio_links` to `job_seekers`
- `20260424210000_add_talent_marketplace_advanced.sql` — adds `profile_views` to `job_seekers` and creates `employer_saved_candidates` table

### 4. Run locally

```bash
npm run dev
```

### 5. Type check

```bash
npm run type-check
```

---

## Deployment

**For a fresh environment:**

1. Provision Supabase project
2. Apply `supabase/schema.sql` or run all migrations in order
3. Configure all environment variables in your deployment platform (Vercel, etc.)
4. Deploy — `npm run build && npm start`

**For an existing environment:**

1. Back up the database
2. Run `npx supabase db push` to apply pending migrations
3. Verify the new columns are present (`profile_views`, `profile_visibility`, `search_intent`, `employer_saved_candidates` table)
4. Deploy the updated app

---

## Current Platform Status

### ✅ Working

| Feature | Status |
|---|---|
| Public job board (`/jobs`) | ✅ |
| Structured job posting with screening | ✅ |
| Transparent screening score on apply | ✅ |
| Employer hiring pipeline (Shortlist → Interview → Hire) | ✅ |
| Full seeker profile (bio, skills, experience, education) | ✅ |
| Certifications management | ✅ |
| Portfolio links | ✅ |
| Profile visibility & search intent controls | ✅ |
| Profile view analytics for seekers | ✅ |
| Marketplace preferences in onboarding | ✅ |
| Employer Discover page with filters | ✅ |
| Candidate public profile page | ✅ |
| Save Candidate / Talent Pool | ✅ |
| Invite to Apply (direct messaging) | ✅ |
| Skill-based matchmaking (employer side) | ✅ |
| Suggested Candidates on Job Detail page | ✅ |
| Recommended Jobs widget on seeker dashboard | ✅ |
| In-platform notifications | ✅ |
| Payments & subscriptions (PayChangu) | ✅ |
| Admin dashboard | ✅ |
| Mobile responsive UI | ✅ |

---

## Privacy Design

WorkBridge takes candidate privacy seriously. The platform enforces the following rules at every level:

- **`HIDDEN` profiles** never appear in employer discovery or matchmaking results
- **`ANONYMOUS` profiles** show skills, experience, and bio — but name, avatar, location, and contact details are masked in all views (Discover page, Candidate Profile page, Suggested Candidates tab, Saved Talent page)
- **Contact details** (email, phone, WhatsApp) are only exposed for `PUBLIC` profiles
- **Row Level Security (RLS)** is enforced at the database level for all tables

---

*WorkBridge — Built for Malawi. Built to grow.*
