export type UserRole = 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN';
export type EmployerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type JobStatus = 'ACTIVE' | 'EXPIRED' | 'FILLED' | 'ARCHIVED' | 'PENDING' | 'REJECTED';
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type JobWorkMode = 'REMOTE' | 'HYBRID' | 'ON_SITE';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SHORTLISTED' | 'INTERVIEWING' | 'INVITED' | 'WITHDRAWN';
export type ScreeningAnswer = 'YES' | 'NO';

/** How candidates should apply to this job. */
export type ApplicationMethod = 'one_tap' | 'external_url' | 'email' | 'whatsapp' | 'phone' | 'manual';

/** Who is responsible for this listing. */
export type PostingType = 'DIRECT' | 'AGENCY' | 'AGANYU';

/** Where the vacancy originated from. */
export type JobSource =
    | 'Employer Portal'
    | 'Recruitment Agency'
    | 'Website Scraper'
    | 'LinkedIn'
    | 'Facebook'
    | 'Newspaper'
    | 'Email Submission'
    | 'Manual Entry'
    | 'API Import';

export interface ScreeningQuestion {
    id: string;
    question: string;
    expectedAnswer: ScreeningAnswer;
    required: boolean;
}

export interface ScreeningBreakdownItem {
    label: string;
    met: boolean;
    detail: string;
    required?: boolean;
}

export interface Certificate {
    id: string;
    seekerId: string;
    url: string;
    fileName?: string;
    parsedQualification?: string | null;
    parsedCertName?: string | null;
    isNameVerified: boolean;
    createdAt: string;
}

export interface JobSeeker {
    id: string;
    full_name: string;
    bio?: string;
    location?: string;
    phone?: string;
    whatsapp?: boolean;
    skills?: string[];
    salaryExpectation?: string;
    seniorityLevel?: string;
    employmentType?: string;
    experience?: Array<{
        role: string;
        company: string;
        startDate: string;
        endDate?: string;
        description: string;
    }>;
    completion?: number;
    isSubscribed?: boolean;
    avatarUrl?: string;
    avatar_url?: string;
    resumeUrl?: string;
    resume_url?: string;
    employmentStatus?: string | null;
    hasBadge?: boolean;
    qualification?: string | null;
    preferredWorkModes?: string[];
    preferredJobTypes?: string[];
    preferredLocations?: string[];
    preferredSkills?: string[];
    publicSlug?: string | null;
    education?: Array<Record<string, unknown>>;
    /** Filled by GET /api/me and server layouts */
    applicationsThisMonth?: number;
}

export interface Employer {
    id: string; // References Users primary key
    company_name: string;
    companyName: string;
    industry?: string;
    location?: string;
    website?: string;
    description?: string;
    status: EmployerStatus;
    profile_views: number;
    logo_url?: string;
    logoUrl?: string;
    recruiterVerified?: boolean;
    default_scheduling_link?: string;
    defaultSchedulingLink?: string;
    _count?: {
        jobs: number;
    };
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    plan: "FREE" | "PREMIUM" | "PRO";
    jobSeeker?: JobSeeker;
    employer?: Employer;
    createdAt?: string;
    viewedAt?: string;
    onboardingComplete?: boolean;
    onboardingCompletedAt?: string | null;
    email_preferences?: {
        marketing: boolean;
        job_alerts: boolean;
        application_updates: boolean;
        weekly_digest: boolean;
    };
}

export interface Job {
    id: string;
    title: string;
    description?: string;
    location: string;
    type: JobType | string;
    work_mode?: JobWorkMode | string;
    status: JobStatus;
    skills: string[];
    salary_range?: string;
    must_have_skills?: string[];
    nice_to_have_skills?: string[];
    minimum_years_experience?: number | null;
    qualification?: string | null;
    screening_questions?: ScreeningQuestion[] | null;
    employer: {
        company_name: string;
        companyName: string;
        id?: string;
        logoUrl?: string | null;
    };
    _count?: {
        applications: number;
        shortlisted?: number;
    };
    isNew?: boolean;
    deadline?: string;
    createdAt?: string;
    viewedAt?: string;
    lastAlertSentAt?: string;
    public_slug?: string;
    publicSlug?: string;

    // ── Job Architecture V2 ─────────────────────────────────────────────────
    /** Controls how candidates submit their application. Defaults to 'one_tap'. */
    application_method?: ApplicationMethod;
    /** URL to redirect candidates for external ATS applications (method = external_url). */
    external_apply_url?: string | null;
    /** Email address for CV submissions (method = email). */
    apply_email?: string | null;
    /** WhatsApp number for applications (method = whatsapp). */
    apply_whatsapp?: string | null;
    /** Phone number to call (method = phone). */
    apply_phone?: string | null;
    /** Free-text instructions shown to candidates (method = manual). */
    application_instructions?: string | null;
    /** When true, internal One-Tap apply is offered alongside any external method. */
    allow_one_tap_apply?: boolean;
    /** Who is responsible for this listing. */
    posting_type?: PostingType;
    /** Displayed company name — overrides employer.company_name when set. */
    display_company_name?: string | null;
    /** Source of the vacancy for analytics. */
    job_source?: JobSource | string;
}

export interface Application {
    id: string;
    jobId: string;
    userId: string;
    status: ApplicationStatus;
    screeningScore?: number;
    meetsRequiredCriteria?: boolean;
    screeningSummary?: string;
    screeningBreakdown?: ScreeningBreakdownItem[];
    screeningAnswers?: Record<string, ScreeningAnswer>;
    interviewLink?: string;
    user?: User;
    job?: Job;
    createdAt?: string;
    viewedAt?: string;
}

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    type?: string;
    jobId?: string;
}

export interface Subscription {
    id: string;
    userId: string;
    plan: 'FREE' | 'PREMIUM';
    endDate?: string;
}

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    tx_ref: string;
    paymentMethod?: string;
    createdAt: string;
}


export interface AdminMetrics {
    totalUsers: number;
    totalJobSeekers: number;
    totalEmployers: number;
    totalJobs: number;
    totalApplications?: number;
}

export interface AuditLog {
    id: string;
    action: string;
    path: string;
    method: string;
    statusCode: number;
    ip?: string;
    createdAt: string;
    userId?: string;
    user?: {
        email: string;
        role: UserRole;
    };
}

export interface AuditLogResponse {
    items: AuditLog[];
    total: number;
    limit: number;
    offset: number;
}


export interface SavedJob {
    id: string;
    job_id: string;
    seeker_id: string;
    created_at: string;
    job: Job;
}
