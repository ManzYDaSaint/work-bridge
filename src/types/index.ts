export type UserRole = 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN';
export type EmployerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type JobStatus = 'ACTIVE' | 'EXPIRED' | 'FILLED' | 'ARCHIVED' | 'PENDING' | 'REJECTED';
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type JobWorkMode = 'REMOTE' | 'HYBRID' | 'ON_SITE';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SHORTLISTED' | 'INTERVIEWING' | 'INVITED';
export type ScreeningAnswer = 'YES' | 'NO';

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
    hasBadge?: boolean;
    qualification?: string | null;
    preferredWorkModes?: string[];
    preferredJobTypes?: string[];
    preferredLocations?: string[];
    preferredSkills?: string[];
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
    plan?: 'FREE' | 'PREMIUM';
    planExpiresAt?: string;
    recruiterVerified?: boolean;
    _count?: {
        jobs: number;
    };
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    jobSeeker?: JobSeeker;
    employer?: Employer;
    createdAt?: string;
    onboardingComplete?: boolean;
    onboardingCompletedAt?: string | null;
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
    user?: User;
    job?: Job;
    createdAt?: string;
}

export interface AppNotification {
    id: string;
    userId: string;
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

