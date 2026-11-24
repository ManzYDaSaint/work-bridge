# Aganyu Seeker Mobile App — Master Architectural Blueprint & Specification

> **Target Platform:** iOS & Android (Cross-Platform via React Native & Expo SDK 52+)  
> **Audience:** Job Seekers, Fresh Graduates, University Students, Interns, and Attachment Seekers in Malawi & Sub-Saharan Africa  
> **Backend Integration:** Aganyu Core (Next.js 16 App Router + Supabase PostgreSQL with `pgvector` + PayChangu MWK Payments)  
> **Author:** Antigravity System Architect  
> **Status:** Planning Mode / Blueprint (Zero Code Executed)

---

## 1. Executive Summary & Product Vision

### 1.1 The Problem
In the emerging Malawian labor market, job seekers encounter high friction when using traditional web-only job boards:
1. **Application Black Hole:** Seekers submit CVs and never hear back; there is zero transparency on candidate screening or review status.
2. **Connectivity & Device Constraints:** Most seekers access the internet via budget Android smartphones with metered mobile data, erratic network coverage, and intermittent electricity.
3. **Delayed Discoverability:** Urgent employment opportunities, attachment calls, or scholarships expire before seekers check web portals.
4. **Credential Legitimacy:** Traditional platforms suffer from low employer trust due to unverified certificates and unformatted CVs.

### 1.2 The Solution
The **Aganyu Seeker Mobile App** transforms Aganyu into an offline-first, mobile-first career companion that:
- Delivers instant push & WhatsApp notifications the moment an application moves to `SHORTLISTED` or `INTERVIEWING`.
- Employs **Hybrid Semantic AI Matchmaking** (`pgvector` embeddings) to bring hyper-relevant vacancies directly to the seeker's feed.
- Provides a **Gamified Profile Strength Engine** that guides candidates to optimize their "Professional DNA" and submit verified credentials for an official "Proven Expertise" badge.
- Offers seamless 1-tap local mobile money payments (**Airtel Money & TNM Mpamba via PayChangu**) for the MWK 1,000/month Premium Alert tier.

---

## 2. Target Persona & User Journey

### 2.1 Personas
1. **The University Graduate (e.g., Kondwani, 23, Lilongwe):**
   - *Needs:* Entry-level software/finance roles, quick alerts, easy CV generation, transparent application tracking.
   - *Behavior:* Uses Android, relies on Airtel Data bundles, wants direct WhatsApp notifications.
2. **The College Intern / Attachment Seeker (e.g., Tadala, 20, Blantyre):**
   - *Needs:* Short-term attachments, internships, NGO training programs, scholarships.
   - *Behavior:* Needs clear filters for unpaid/stipend attachments and verified employer safety checkmarks.
3. **The Experienced Professional (e.g., Chimwemwe, 31, Zomba):**
   - *Needs:* Discreet job exploration with privacy toggles (`ANONYMOUS` or `HIDDEN` visibility), salary transparency, executive vacancies.

### 2.2 Core Seeker Journey
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Quick Onboard  │ ───► │  AI Match Feed  │ ───► │   1-Tap Apply   │ ───► │ Status Tracker  │
│ Phone/Google Auth│      │ "94% Match" Card│      │Screening Answers│      │ Live Stage Step │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 3. UI/UX Design System & Mobile Information Architecture

### 3.1 Design Tokens (Mirroring Aganyu Web)
To maintain 1:1 brand consistency with Aganyu Web (`globals.css` / Tailwind CSS v4):

| Element | Specification / Token | Hex / Value |
|---|---|---|
| **Primary Brand** | Emerald / Jade Green | `#059669` (Dark: `#10b981`) |
| **Secondary Accent** | Indigo / Violet | `#4f46e5` (Dark: `#6366f1`) |
| **Warning / Attention** | Amber | `#d97706` (Dark: `#f59e0b`) |
| **Danger / Knockout** | Rose / Crimson | `#e11d48` (Dark: `#f43f5e`) |
| **Background (Light)** | Off-white / Cool Slate | `#f8fafc` |
| **Background (Dark)** | Midnight Slate | `#0f172a` |
| **Surface Card** | Clean White / Dark Gray | `#ffffff` / `#1e293b` |
| **Border Subdued** | Slate 200 / 800 | `#e2e8f0` / `#334155` |
| **Typography** | Inter / System Sans-Serif | Regular (400), Medium (500), SemiBold (600), Bold (700) |
| **Icons** | Lucide Icons | `lucide-react-native` (Stroke: 1.75 - 2) |

---

### 3.2 Mobile Information Architecture (5-Tab Structure)

```
========================================================================
                          AGANYU SEEKER APP
========================================================================
┌──────────────────────────────────────────────────────────────────────┐
│  TAB 1: DISCOVER (Feed & Semantic Match)                            │
│  - Top Header: Profile Strength Progress Widget & Alert Bell         │
│  - Filter Pills: [ All ] [ Remote ] [ Full-Time ] [ Internships ]   │
│  - Match Feed: Hybrid AI Match Cards ("95% Match", Skill tags)       │
├──────────────────────────────────────────────────────────────────────┤
│  TAB 2: OPPORTUNITIES (Scholarships, Grants, Training)              │
│  - Segmented Switcher: [ Opportunities ] [ Direct Jobs ]             │
│  - Search Bar + Malawi District Filter (Lilongwe, Blantyre, etc.)   │
│  - Deadline Urgency Badges ("3 days left", "Verified Organization") │
├──────────────────────────────────────────────────────────────────────┤
│  TAB 3: APPLICATIONS (Pipeline Tracker)                             │
│  - Summary Counters: [ Applied: 4 ] [ Shortlisted: 1 ] [ Interviews ]│
│  - Application Card with Timeline Stepper:                          │
│    (● Applied) ── (● Reviewing) ── (● Shortlisted) ── (○ Offer)     │
│  - Direct In-App Interview Invitations & Feedback Notes              │
├──────────────────────────────────────────────────────────────────────┤
│  TAB 4: SAVED & ALERTS (Personal Career Vault)                      │
│  - Bookmarked Jobs with offline cache indicator                      │
│  - Job Alert Triggers (Keyword + District + Desired Salary)         │
│  - WhatsApp Notification Toggle (Active status & phone sync)        │
├──────────────────────────────────────────────────────────────────────┤
│  TAB 5: PROFILE & TRUST (Digital DNA & CV)                          │
│  - Header: Avatar, Name, Verified Badge, Readiness Score (e.g. 86%)  │
│  - Visibility Switcher: [ Public / Anonymous / Hidden ]              │
│  - Experience & Education List (Add / Edit Modals)                   │
│  - Certificate Verification Center (Capture document / Status: PENDING)│
│  - Export PDF CV & PayChangu Premium Billing Hub                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Screen-by-Screen UX Specifications

#### Screen 1: Splash & Onboarding Flow
- **Splash:** Aganyu Logo animated fade-in, checks session token via SecureStore.
- **Role Guard:** Strict verification ensuring the authenticated account has `role: 'JOB_SEEKER'`. If an employer logs in, route them to web dashboard notice.
- **Guided 3-Step Profile Setup:**
  - *Step 1: Identity & Location:* Full Name, Phone (Malawi formatted `+265...`), City/District.
  - *Step 2: Professional DNA:* Primary Domain/Specialty, Education Degree, 3+ Skills (Autocomplete tag selector).
  - *Step 3: Visibility & Intent:* Looking for (Full-time / Attachment), Visibility mode.

#### Screen 2: Discover / AI Match Feed
- **Profile Strength Meter Card:**
  - Dynamic gauge displaying completion percentage (`calculateProfileStrength()`).
  - Actionable prompt: *"Add your university degree to boost match accuracy by +15%"*.
- **Job Card UI Elements:**
  - Verified Employer Badge with shield icon.
  - Semantic Match Score pill: Emerald (`>= 85%`), Amber (`60% - 84%`), Gray (`< 60%`).
  - Location pin (`Blantyre, Malawi`), Working Mode (`On-site` / `Hybrid` / `Remote`), Salary/Stipend preview.
  - Must-Have Skills badges (green highlight if candidate has skill, gray outline if missing).
  - Quick Actions: Swipe right to save, tap to view full job sheet.

#### Screen 3: Job Detail & 1-Tap Application Sheet
- **Header:** Company banner, logo, verified badge, date posted, application deadline.
- **Match Breakdown:** Skill match vs. Experience match breakdown.
- **Job Overview:** Rich description, Responsibilities, Nice-to-have skills.
- **Knockout Screening Questions:**
  - If the job has screening questions, present clean native inputs (Multiple choice, boolean switch, short text).
- **Sticky Bottom Action:**
  - If already applied: Button disabled (`Applied on Oct 14 — In Review`).
  - If not applied: Primary action button `Submit Application` (Uses pre-filled Aganyu CV or attached PDF).

#### Screen 4: Application Timeline Tracker
- **Status Progression Component:**
  - Visual status pill: `SUBMITTED` $\to$ `SCREENING` $\to$ `SHORTLISTED` $\to$ `INTERVIEWING` $\to$ `HIRED` / `REJECTED`.
  - Explanatory copy (e.g., *"Employer reviewed your application and moved you to Interview Stage on Nov 20"*).
- **Interview Details Modal:** Displays interview time, Google Meet / WhatsApp call link, or physical office directions in Lilongwe/Blantyre.

#### Screen 5: Profile & Certificate Trust Hub
- **Digital DNA Editor:** Edit bio, work history, education history, and skills list.
- **Certificate Verification Pipeline:**
  - Native Document/Camera picker to take a photo of Diploma/Degree/Certification.
  - Status indicators: `NOT_SUBMITTED`, `PENDING_REVIEW`, `VERIFIED` (green checkmark), `REJECTED` (with admin notes).
- **PDF CV Export:** 1-tap download and sharing of Aganyu-formatted PDF CV via native Share Sheet.

#### Screen 6: Premium Subscription (PayChangu MWK Mobile Money)
- **Value Proposition Card:** Instant WhatsApp alerts, priority applicant badge, unlimited AI match notifications.
- **Pricing:** MWK 1,000 / month.
- **Payment Method Selection:**
  - **Airtel Money** (Malawi)
  - **TNM Mpamba** (Malawi)
  - **Debit/Credit Card**
- **Payment Flow:** Seamless in-app deep link / mobile web checkout sheet with auto-polling for payment webhook confirmation.

---

## 4. API Endpoints Specification & Mobile Integration

The mobile app connects to the existing Aganyu Next.js API Gateway and Supabase backend. All calls use either direct Supabase JWT sessions or HTTPS requests with `Authorization: Bearer <SUPABASE_JWT>`.

### 4.1 Authentication & Session
### 4.0 Authentication & Network Contract for Mobile
All mobile requests sent to the Aganyu Next.js API Gateway must include the standard mobile Bearer Authorization header populated from the Supabase session token stored in `expo-secure-store`:

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
Content-Type: application/json
```
*Note: The Aganyu auth guard (`src/lib/auth-guard.ts`) automatically validates both web cookies and `Bearer` headers.*

---

### 4.1 Authentication & Session
| Method | Endpoint | Description | Request Body | Response Shape |
|---|---|---|---|---|
| `POST` | Supabase Auth `signInWithPassword` | Seeker Login | `{ email, password }` | `{ access_token, user, session }` |
| `POST` | Supabase Auth `signInWithOtp` | Passwordless WhatsApp / Phone OTP | `{ phone: "+265..." }` | `{ message: "OTP sent" }` |
| `POST` | Supabase Auth `verifyOtp` | Verify OTP Code | `{ phone, token }` | `{ access_token, user }` |
| `POST` | `/api/auth/logout` | Invalidate session | None | `{ success: true }` |
| `GET` | `/api/me` | Fetch authenticated seeker profile | None | `{ id, email, role: "JOB_SEEKER", profile: {...} }` |

---

### 4.2 Seeker Dashboard & Discovery APIs
| Method | Endpoint | Description | Request Params / Body | Response Shape |
|---|---|---|---|---|
| `GET` | `/api/seeker/jobs` | Paginated public job listings | `?page=1&limit=20&district=Lilongwe` | `{ jobs: Array<Job>, total, page }` |
| `GET` | `/api/recommendations/jobs` | Personalized AI matches | `?limit=10` | `{ recommendations: Array<{ job: Job, matchScore: number }> }` |
| `GET` | `/api/seeker/saved-jobs` | List seeker's bookmarked jobs | None | `Array<{ id, job: Job, created_at }>` |
| `POST` | `/api/seeker/saved-jobs` | Save/Bookmark a job | `{ jobId: string }` | `{ success: true, savedJobId }` |
| `DELETE`| `/api/seeker/saved-jobs` | Unsave a job | `{ jobId: string }` | `{ success: true }` |
| `GET` | `/api/seeker/analytics` | Profile view count & performance | None | `{ profileViews: number, recentViewers: [] }` |

---

### 4.3 Applications Pipeline APIs
| Method | Endpoint | Description | Request Body | Response Shape |
|---|---|---|---|---|
| `GET` | `/api/applications` | List candidate's active & past applications | None | `Array<{ id, status, job: Job, employer: Employer, created_at, viewed_at }>` |
| `GET` | `/api/applications/[id]` | Single application detail with full audit trail | None | `{ id, status, screeningAnswers, auditTrail: [], job: Job }` |
| `POST` | `/api/applications` | Apply for a job | `{ jobId: string, coverNote?: string, screeningAnswers?: Record<string, any> }` | `{ id, status: "SUBMITTED", created_at }` |
| `POST` | `/api/applications/[id]/withdraw`| Withdraw application | `{ reason?: string }` | `{ success: true }` |

---

### 4.4 Opportunities & Attachments APIs
| Method | Endpoint | Description | Request Params / Body | Response Shape |
|---|---|---|---|---|
| `GET` | `/api/opportunities` | Public opportunities feed | `?page=1&limit=20&type=INTERNSHIP` | `{ opportunities: Array<Opportunity>, total }` |
| `GET` | `/api/opportunities/[slug]` | Detailed opportunity page | None | `Opportunity` object with requirements |
| `POST` | `/api/opportunities/view` | Track view event | `{ slug: string }` | `{ success: true }` |

---

### 4.5 Profile, Credentials & Verification APIs
| Method | Endpoint | Description | Request Body | Response Shape |
|---|---|---|---|---|
| `GET` | `/api/profile` | Full seeker profile data | None | `{ bio, skills: [], experience: [], education: [], qualification, visibility }` |
| `PUT` | `/api/profile` | Update profile information | Partial profile object | Updated profile object |
| `POST` | `/api/profile/avatar` | Upload profile image | `multipart/form-data` (`file`) | `{ avatarUrl: string }` |
| `POST` | `/api/profile/certificates`| Upload certificate for verification | `multipart/form-data` (`file`, `title`, `issuer`) | `{ id, title, verification_status: "PENDING" }` |
| `GET` | `/api/profile/certificates`| Fetch verification status list | None | `Array<SeekerCertificate>` |
| `POST` | `/api/seeker/cv-parse` | Extract skills & history from uploaded PDF | `multipart/form-data` (`file`) | `{ extractedSkills: [], summary: string }` |

---

### 4.6 Notifications & Push Registration
| Method | Endpoint | Description | Request Body | Response Shape |
|---|---|---|---|---|
| `GET` | `/api/notifications` | In-app notification list | None | `Array<{ id, title, message, read: boolean, created_at }>` |
| `PATCH`| `/api/notifications` | Mark notifications as read | `{ ids: string[] }` or `{ all: true }` | `{ success: true }` |
| `POST` | `/api/notifications/push-subscribe`| Register Expo Push Token | `{ pushToken: string, platform: "ios" | "android" }` | `{ registered: true }` |
| `GET` | `/api/seeker/preferences` | Get alert preferences | None | `{ whatsapp_enabled, min_match_score, frequency }` |
| `PUT` | `/api/seeker/preferences` | Update alert preferences | `{ whatsapp_enabled, min_match_score, frequency }` | `{ success: true }` |

---

### 4.7 Payments & Subscriptions (PayChangu)
| Method | Endpoint | Description | Request Body | Response Shape |
|---|---|---|---|---|
| `GET` | `/api/seeker/subscription` | Check current subscription status | None | `{ isPremium: boolean, subscription: {...}, preferences: {...} }` |
| `POST` | `/api/seeker/subscription` | Initiate PayChangu Mobile Money payment | `{ mobileMoneyNumber: string, operator: "AIRTEL" | "TNM", returnUrl: string }` | `{ checkoutUrl: string, reference: string }` |
| `GET` | `/api/seeker/subscription/verify`| Check payment completion | `?tx_ref=string` | `{ verified: boolean, status: "ACTIVE" }` |

---

## 5. Mobile Data Schema (Database Mapping)

The mobile app directly leverages the canonical Supabase schema. Below are the key tables and their mobile relevance:

```mermaid
erDiagram
    USERS ||--|| JOB_SEEKERS : "has profile"
    JOB_SEEKERS ||--o{ APPLICATIONS : "submits"
    JOB_SEEKERS ||--o{ SAVED_JOBS : "bookmarks"
    JOB_SEEKERS ||--o{ SEEKER_CERTIFICATES : "uploads"
    JOB_SEEKERS ||--o{ PREMIUM_SUBSCRIPTIONS : "subscribes"
    JOB_SEEKERS ||--o{ NOTIFICATION_PREFERENCES : "configures"
    JOBS ||--o{ APPLICATIONS : "receives"
    EMPLOYERS ||--o{ JOBS : "publishes"

    JOB_SEEKERS {
        uuid id PK
        uuid user_id FK
        text full_name
        text phone
        text location
        text bio
        text qualification
        text[] skills
        jsonb experience
        jsonb education
        text visibility "PUBLIC | ANONYMOUS | HIDDEN"
        vector embedding "384 dimensions"
    }

    APPLICATIONS {
        uuid id PK
        uuid job_id FK
        uuid seeker_id FK
        text status "SUBMITTED | SCREENING | SHORTLISTED | INTERVIEWING | HIRED | REJECTED"
        jsonb screening_answers
        numeric match_score
        timestamp created_at
        timestamp updated_at
    }

    SEEKER_CERTIFICATES {
        uuid id PK
        uuid seeker_id FK
        text title
        text issuer
        text document_url
        text verification_status "PENDING | VERIFIED | REJECTED"
        text admin_feedback
    }

    PREMIUM_SUBSCRIPTIONS {
        uuid id PK
        uuid seeker_id FK
        text status "ACTIVE | EXPIRED | CANCELLED"
        timestamp starts_at
        timestamp ends_at
        numeric amount_mwk "1000"
        text payment_reference
    }
```

---

## 6. Offline-First & Network Resiliency Architecture

Given the mobile data environment in Malawi (intermittent network, high cost of megabytes):

1. **State Management & Query Cache:**
   - Use **TanStack React Query (v5)** with persistent AsyncStorage cache adapter (`createAsyncStoragePersister`).
   - Query cache holds saved jobs, applications history, and candidate profile offline.
2. **Optimistic Updates:**
   - Bookmark/Unbookmark jobs updates the local UI immediately before sending API mutations.
   - Profile bio edits update locally and queue sync when network is restored.
3. **Data Saver Mode:**
   - Image optimization: Deliver thumbnail avatars via Supabase Image Transformation (`?width=120&quality=70`).
   - Lazy load rich job descriptions only when the user opens the job details screen.

---

## 7. Environment Variables & App Configuration (`.env`)

Create a `.env` configuration file inside the mobile app workspace (`/apps/mobile/.env`). The values below are pre-populated from your project's active infrastructure:

```bash
# ==============================================================================
# AGANYU SEEKER MOBILE APP — ENVIRONMENT CONFIGURATION
# ==============================================================================

# --- Application Meta ---
EXPO_PUBLIC_APP_NAME="Aganyu Seeker"
EXPO_PUBLIC_APP_SLUG="aganyu-seeker"
EXPO_PUBLIC_APP_VERSION="1.0.0"
EXPO_PUBLIC_APP_ENVIRONMENT="production"

# --- Aganyu Backend API Gateway ---
# Local physical device testing: http://<YOUR_LAN_IP>:3000
# Production:
EXPO_PUBLIC_API_BASE_URL="https://aganyu.com"

# --- Supabase Mobile Integration (Active Project) ---
EXPO_PUBLIC_SUPABASE_URL="https://acqeocatqynwxfvrebib.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcWVvY2F0cXlud3hmdnJlYmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzM5NTQsImV4cCI6MjA5MjUwOTk1NH0.Q8K7LvtF3I6okMq_ZYsgNfXRbqBJyQE5QTp267Wl3OI"

# --- Supabase Storage Buckets ---
EXPO_PUBLIC_STORAGE_AVATARS_BUCKET="avatars"
EXPO_PUBLIC_STORAGE_RESUMES_BUCKET="resumes"
EXPO_PUBLIC_STORAGE_CERTIFICATES_BUCKET="certificates"

# --- Push Notifications & Device Analytics ---
# Configured via Expo Application Services (EAS)
EXPO_PUBLIC_EAS_PROJECT_ID="your-eas-project-uuid"
EXPO_PUBLIC_EXPO_PUSH_URL="https://exp.host/--/api/v2/push/send"

# --- PayChangu Payment Gateway (Malawi MWK Mobile Money) ---
EXPO_PUBLIC_PAYCHANGU_CURRENCY="MWK"
EXPO_PUBLIC_PREMIUM_MONTHLY_PRICE="1000"

# --- Regional Defaults (Malawi) ---
EXPO_PUBLIC_DEFAULT_COUNTRY_CODE="+265"
EXPO_PUBLIC_DEFAULT_COUNTRY="MW"
EXPO_PUBLIC_DEFAULT_CITY="Lilongwe"
EXPO_PUBLIC_DEFAULT_CURRENCY_SYMBOL="MWK"

# --- Sentry Crash Reporting (Production Monitoring) ---
EXPO_PUBLIC_SENTRY_DSN=""
```

---

## 8. Step-by-Step Implementation Roadmap

When transitioning from Planning Mode to Execution, follow this structured roadmap:

### Phase 1: Foundation & Infrastructure (Sprint 1)
- [ ] Initialize Expo project with TypeScript and Expo Router v3 / tabs navigation.
- [ ] Configure NativeWind v4 (Tailwind CSS) with Aganyu color tokens (`emerald-600`, `slate-900`, etc.).
- [ ] Implement Supabase Mobile Client with `expo-secure-store` for persistent session management.
- [ ] Build Auth flows: Splash, Login, Register, Forgot Password, and Role Guard (`JOB_SEEKER`).

### Phase 2: Profile & Trust Engine (Sprint 2)
- [ ] Implement Profile Screen with dynamic Gamified Profile Strength Meter.
- [ ] Build Profile Edit forms: Personal details, Domain selection, Skills tagger, Experience & Education.
- [ ] Build Certificate Upload flow using `expo-document-picker` / `expo-image-picker`.
- [ ] Implement Visibility Switcher (`PUBLIC` vs. `ANONYMOUS` vs. `HIDDEN`).

### Phase 3: Job & Opportunity Discovery (Sprint 3)
- [ ] Build Discover Tab with AI Hybrid Match Score badge (`85%+ Match`).
- [ ] Build Search & Filter bottom sheet (Districts, Job type, Working mode).
- [ ] Build Opportunities Tab (Scholarships, Internships, Attachments).
- [ ] Implement Job Detail View with Knockout Screening Question Form.
- [ ] Implement 1-Tap Application submission.

### Phase 4: Applications Tracker & Live Notifications (Sprint 4)
- [ ] Build Applications Tab with visual stage stepper (`APPLIED` $\to$ `SHORTLISTED` $\to$ `HIRED`).
- [ ] Setup Expo Push Notifications service: register token via `/api/notifications/push-subscribe`.
- [ ] Connect Supabase Realtime listeners to notify seeker instantly when application status changes.
- [ ] Build In-App Notification Center screen.

### Phase 5: Monetization & Offline Readiness (Sprint 5)
- [ ] Build Premium Subscription Screen (MWK 1,000 / month benefit highlights).
- [ ] Integrate PayChangu Mobile Money payment intent flow with return-URL verification.
- [ ] Configure TanStack Query offline cache persistence with AsyncStorage.
- [ ] End-to-end device testing on Android & iOS devices in low-bandwidth simulation.

---

## 9. Verdict & Sign-Off

This document serves as the **definitive structural blueprint** for the Aganyu Seeker Mobile App. 

Because the backend database schemas, RLS policies, match algorithms, and Next.js endpoints are already live and tested in production, **no backend redesign is required**. The mobile app functions as a fast, beautiful, and resilient client layer tailored specifically to empower Malawian talent.
