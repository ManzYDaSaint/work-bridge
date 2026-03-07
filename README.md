# 🌉 WorkBridge: The Verified Talent Marketplace

WorkBridge is a next-generation job matching platform designed for high-trust professional environments. It combines **AI-driven semantic matching** with **cryptographic and manual verification** to ensure that every candidate is both qualified and privacy-protected.

## 🚀 System Architecture

WorkBridge is built on a modern, serverless-first stack optimized for security and rapid iteration.

### Tech Stack
- **Framework**: Next.js 16+ (App Router, Server Components)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **AI Engine**: Google Gemini (Semantic matching, Bio anonymization)
- **Auditing**: PostgreSQL Trigger-based immutable logs
- **Payments**: Flutterwave (Airtel Money & Mpamba compatible)
- **Styling**: Tailwind CSS v4 + daisyUI

---

## 🛡️ Core Robustness Pillars

We handle sensitive PII (Personally Identifiable Information) and professional credentials using a "Zero-Trust" framework:

1. **AI Anonymization**: All job seeker bios and resumes are automatically redacted (emails, phones, specific names) using semantic AI before being presented to employers.
2. **Conditional Reveal**: Employer access to PII is gated. Seekers must explicitly approve "Profile Reveal" requests before their full identity is visible.
3. **Corporate Auditing**: Employers undergo a manual trust audit upon registration. Core actions like job deployment and profile reveals are restricted until they reach `APPROVED` status.
4. **Database-Level Auditing**: Every sensitive operation (User updates, Job applications, Transactions) is captured by immutable PostgreSQL triggers, ensuring a tamper-proof audit trail.
5. **Verified Certificates**: A multi-tier qualification system (Tiers 0-4) that rewards job seekers for verified academic and professional credentials.

---

## 🗺️ User Experience Flows

WorkBridge follows a **Landing-First** strategy, building trust through early marketing value before account creation.

### 👤 Job Seeker Flow
Registration → **AI Anonymization** (Profile redacted via Gemini) → **Verification** (Certificates uploaded/audited) → **Reveal Control** (Approve/Reject employer access requests).

### 🏢 Employer Flow
Registration → **Trust Audit** (Account starts as `PENDING`) → **Workspace Access** (Browse anonymized talent pool) → **Approval** (Unlock "Deploy Role" and "Profile Reveal" requests).

---

## 📂 Project Structure

- `src/app/(marketing)`: High-conversion landing pages, pricing, and legal (Privacy/Terms).
- `src/app/(app)`: Specialized dashboards for **Job Seekers**, **Employers**, and **Admins**.
- `src/app/api`: Secure API endpoints with built-in **Auth Guards** enforcing role and status-based access.
- `src/lib`: Core logic for AI matching (`ai.ts`), audits (`audit.ts`), and security gatekeeping (`auth-guard.ts`).
- `supabase/`: Database schema definitions, RLS policies, and automated audit triggers.

---

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 20+
- A Supabase Project
- Gemini API Key (for matching features)

### 2. Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env.local` based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
3. Initialize the database:
   Run the contents of `supabase/schema.sql` in your Supabase SQL Editor to set up tables, RLS, and **Audit Triggers**.

4. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Quality Assurance
Before pushing code, run the system health check:
```bash
npm run check
```

---

## 🏗️ Future Roadmap
- [x] AI-driven profile anonymization.
- [x] Status-based Corporate auth-guards.
- [ ] Autonomous OCR-based certificate verification.
- [ ] Real-time Admin Dashboard alerts for high-risk data events.
- [ ] Advanced "Semantic Match" visualizations for Employers.

---
Built with ❤️ by **Antigravity** for the next generation of verified work.
