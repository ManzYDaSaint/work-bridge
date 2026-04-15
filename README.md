# WorkBridge

WorkBridge is a Malawi-first job platform built around a lean public job board and a structured hiring workflow.

The product no longer relies on AI matching. Instead, employers define clear job requirements and seekers apply through a low-friction, profile-based flow. Employers then review candidates using transparent screening data:

- must-have skills
- nice-to-have skills
- minimum years of experience
- knockout questions
- shortlist / reject pipeline states

## Current Product Model

### Public experience

- Public visitors can browse jobs at `/jobs`.
- Jobs support `REMOTE`, `HYBRID`, and `ON_SITE`.
- The board is listing-first, dense, and filterable by search, work mode, and type.
- Public users can inspect job details before signing in.

### Job seeker experience

- Seekers maintain one reusable profile with:
  - bio
  - skills
  - experience
  - location
  - salary expectation
  - resume
  - certificates
- Seekers can save jobs, apply to jobs, and track application status.
- Applications now include screening answers when a job has knockout questions.
- Certificate uploads are currently stored for manual review, not AI verification.
- Seekers can still control profile reveals for privacy-sensitive hiring flows.

### Employer experience

- Employers post jobs with structured requirements.
- Employers review applications in a rule-based pipeline instead of using AI match scores.
- Candidate review shows:
  - screening score
  - whether required criteria were met
  - matched vs missing skills
  - years of experience
  - checklist breakdown per requirement
- Primary hiring action is now shortlisting, followed by deeper review and outreach.

### Admin experience

- Admins manage users, employers, jobs, and audit views.
- Employer audit is currently a simple rule-based/manual review helper, not an AI trust audit.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Supabase Auth + Postgres + RLS
- PayChangu payments (Airtel Money / TNM Mpamba / Card via MWK)
- Resend email notifications

## Current Hiring Logic

WorkBridge currently uses structured screening instead of AI.

### Job creation

Employers can define:

- `skills`
- `must_have_skills`
- `nice_to_have_skills`
- `minimum_years_experience`
- `screening_questions`

### Apply flow

When a seeker applies:

1. WorkBridge validates that the job is active.
2. The seeker must have a complete profile.
3. Required screening questions must be answered.
4. The server calculates a transparent screening result from:
   - required skill matches
   - optional skill matches
   - experience against minimum requirement
   - screening question answers
5. The application stores:
   - `screening_answers`
   - `screening_score`
   - `screening_summary`
   - `screening_breakdown`
   - `meets_required_criteria`

### Employer review

Employers no longer receive AI-generated fit results. They review a structured checklist and move applicants through the pipeline manually.

## Repository Structure

- `src/app/(marketing)`  
  Public landing pages, jobs page, pricing, privacy, terms

- `src/app/(app)`  
  Authenticated dashboards for seekers, employers, and admins

- `src/app/api`  
  API routes for jobs, applications, profiles, payments, admin, and messaging

- `src/components`  
  Public board UI, dashboard UI, profile forms, and marketing components

- `src/lib`  
  Shared helpers for auth, screening, payments, audit, email, and utility logic

- `supabase`  
  Schema and migrations

## Setup

### Prerequisites

- Node.js 20+
- npm
- Supabase project
- PayChangu credentials for payments
- Resend credentials for emails

### Install

```bash
npm install
```

### Environment

Create `.env.local` from `.env.example` and supply the required values for:

- Supabase
- PayChangu
- Resend
- app base URL

### Run locally

```bash
npm run dev
```

### Typecheck

```bash
npm run type-check
```

## Database Changes Required

If you are bringing up a fresh database or updating an older WorkBridge database, these are the important schema changes for the current product.

### Required migrations already present in this repo

Apply the migrations in `supabase/migrations`, especially:

- `20260322165403_add_plan_to_employers.sql`
- `20260322171800_add_plan_expires_at_to_employers.sql`
- `20260322175200_create_transactions_table.sql`
- `20260323_fix_seeker_rls.sql`
- `20260326120000_public_anon_jobs_read.sql`
- `20260326143000_add_work_mode_to_jobs.sql`
- `20260326160000_add_structured_screening.sql`
- `20260326170000_drop_notes_and_certificate_ai_columns.sql`

### Current schema requirements

The current app expects these job fields:

- `work_mode`
- `must_have_skills`
- `nice_to_have_skills`
- `minimum_years_experience`
- `screening_questions`

The current app expects these application fields:

- `screening_answers`
- `screening_score`
- `screening_summary`
- `screening_breakdown`
- `meets_required_criteria`

### Cleanup migrations now included

The first round of legacy cleanup is now implemented in SQL migrations:

1. `20260326170000_drop_notes_and_certificate_ai_columns.sql`
This removes the unused `notes` table and drops `certificates.verification_confidence` and `certificates.verification_summary`.

### Remaining cleanup worth reviewing later

These items are still in active use or still represent product decisions, so they were not dropped automatically:


2. `job_seekers.top_verification_tier` and `certificates.verification_tier`
These are still used in seeker and employer flows, even though certificate review is manual rather than AI-based.

3. `profile_reveals`
This privacy workflow is still wired into the product and RLS policies.

4. Any older payment/subscription labels in historic rows
Current code already uses `Plus` naming, but existing database records may still contain older wording depending on your environment.

## Recommended Deployment Sequence

For an existing environment:

1. Back up the database.
2. Apply all pending SQL migrations in order.
3. Verify `jobs` and `applications` contain the structured screening columns.
4. Start the app and test:
   - public `/jobs`
   - employer job creation
   - seeker application flow
   - employer candidate review
   - PayChangu webhook handling

For a fresh environment:

1. Provision Supabase.
2. Apply `supabase/schema.sql` or run the migrations in order.
3. Configure environment variables.
4. Run `npm install`.
5. Run `npm run dev`.

## Current Status

What is working now:

- lean public board
- structured job posting
- structured application screening
- employer candidate shortlist flow
- seeker saved jobs and applications
- payments and badges / plus plan
- TypeScript clean source tree

What is still worth a future pass:

- deeper review of legacy privacy and verification fields that are still intentionally in use
- lockfile refresh after dependency removals
- optional pruning of older marketing/help copy that is no longer essential

## Owner Note

This README describes the platform as it operates now, not the older AI-driven version.
