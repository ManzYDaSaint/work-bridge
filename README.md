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

### 💳 Payments & Aganyu Premium Engine

- Powered by **PayChangu** (Airtel Money, TNM Mpamba, Card — MWK 1,000/month).
- **Instant WhatsApp Alerts**: Direct-to-phone template delivery for matched job/opportunity alerts via Meta WhatsApp Cloud API.
- **Human-in-the-Loop Admin Match Engine**:
  - **Manual Review Mode**: Admins inspect AI match scores & qualification alignment before dispatching WhatsApp alerts.
  - **Auto-Pilot Dispatch Mode**: Automatic instant delivery for high-affinity candidate job matches.
- **Automated Lifecycle & Verification**: Real-time webhook processing, return-URL verification fallback, and daily cron job subscription expiry handling.

---

### 👩‍💼 Admin Dashboard

- **Human-in-the-Loop Match Approval**: Full UI to review, approve single/batch, or reject candidate notification matches before dispatch.
- **Premium Subscription Management**: Grant, revoke, monitor revenue, active subscriber counts, and audit logs.
- **Verification Center**: Dedicated tools to verify employers and candidate certificates.
- **System Management**: Full control over users, jobs, opportunities, and a comprehensive audit log for all systemic mutations.

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
| Messaging | Meta WhatsApp Cloud API |
| Auth | Supabase Auth |
| Storage | Supabase Storage (avatars, resumes) |
| Realtime | Supabase Realtime (messages, notifications) |
| Payments | PayChangu (MWK Mobile Money & Cards) |
| Email | Resend |

---

## Repository Structure

```
src/
├── app/
│   ├── (marketing)/          # Public pages: landing, jobs, pricing, terms
│   ├── (app)/dashboard/
│   │   ├── seeker/           # Seeker dashboard (Gamified), profile, subscription
│   │   ├── employer/         # Employer dashboard, semantic discover, job management
│   │   └── admin/            # Admin verification center, notifications, premium hub
│   ├── api/
│   │   ├── webhooks/         # PayChangu, Supabase, & WhatsApp webhooks
│   │   ├── cron/             # Subscription expiry & recurring task automation
│   │   ├── seeker/           # Seeker subscription initiation & management
│   │   └── admin/            # Admin match approval, subscriptions, settings
│   └── onboarding/           # Multi-step onboarding
├── components/
│   ├── dashboard/            # Premium cards, status widgets, section cards
│   └── layout/               # DashboardLayout, sidebar navigation
├── lib/
│   ├── subscription/         # PayChangu payment provider & subscription service
│   ├── notification/         # Orchestrator, WhatsApp worker, & dispatch settings
│   ├── candidate-match.ts    # Hybrid AI scoring logic
│   ├── auth-guard.ts         # Server-side auth helper
│   └── ...                   # Other utilities
supabase/
└── schema.sql                # Full canonical schema (source of truth)
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
PAYCHANGU_SECRET_KEY=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
CRON_SECRET=
HUGGINGFACE_TOKEN=
RESEND_API_KEY=
```

---

## Current Platform Status

### Working

| Feature | Status |
|---|---|
| AI Semantic Matchmaking (HuggingFace + pgvector) | Working |
| Aganyu Premium WhatsApp Alerts Engine | Working |
| PayChangu Payment Gateway Integration (Airtel/TNM/Card MWK) | Working |
| Admin Human-in-the-Loop Match Approval & Dispatch Mode Switcher | Working |
| Automated Subscription Expiry Cron & Return-URL Verification | Working |
| Opportunities Module (Scholarships, Grants, Fellowships, Training) | Working |
| Opportunity AI Matchmaking & Candidate Notifications | Working |
| Automated Social Media Sharing (LinkedIn & Facebook via Buffer API) | Working |
| Mission Control & System Event Observability Dashboard | Working |
| Employer CRM & Automation Queue Engine (`automation_tasks`) | Working |
| Multi-Channel Job Posting (One-tap, External URL, Email, WhatsApp) | Working |
| Verified Employer Badges | Working |
| Admin Certificate Verification Pipeline | Working |
| Profile Strength Gamification (Actionable suggestions) | Working |
| Closed-loop Application Feedback (Instant notifications) | Working |
| Public job board & Structured job posting | Working |
| Transparent screening scores & pipeline management | Working |
| Full seeker profile & certifications management | Working |
| Profile visibility & search intent controls | Working |
| Employer Discover page with semantic filters | Working |
| Payments & subscriptions (PayChangu) | Working |
| Admin dashboard & Audit logging | Working |
| Mobile responsive UI | Working |

### Engineering Health

```bash
npm run lint
npm run type-check
npm run build
```

The database schema is consolidated in `supabase/schema.sql` (and `supabase/migrations/20260726_master_canonical_schema.sql`). All production build checks (`npm run build`) pass cleanly.

---

## Privacy Design

Aganyu enforces strict privacy rules at the database level (RLS):

- **`HIDDEN` profiles** never appear in discovery or AI matchmaking.
- **`ANONYMOUS` profiles** show skills/experience but mask identifying details.
- **Contact details** are strictly reserved for `PUBLIC` profiles.

---

*Aganyu — Built for Malawi. Built to grow.*
