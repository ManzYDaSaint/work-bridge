export type UserRole = 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN';
export type EmployerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SHORTLISTED' | 'INTERVIEWING' | 'INVITED';

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
    fullName: string;
    bio?: string;
    location?: string;
    skills?: string[];
    certificates?: Certificate[];
    salaryExpectation?: string;
    seniorityLevel?: string;
    employmentType?: string;
    emailAlias?: string;
    privacyLevel?: string;
    newJobAlerts?: boolean;
    appStatusPulse?: boolean;
    marketingInsights?: boolean;
    experience?: Array<{
        role: string;
        company: string;
        startDate: string;
        endDate?: string;
        description: string;
    }>;
    resume_url?: string;
    completion?: number;
    isSubscribed?: boolean;
    anonymizedSummary?: string;
    topVerificationTier?: number;
}

export interface Employer {
    id: string; // References Users primary key
    companyName: string;
    industry?: string;
    location?: string;
    website?: string;
    description?: string;
    status: EmployerStatus;
    profile_views: number;
    applicationAlerts?: boolean;
    hiringVelocity?: boolean;
    candidatePrivacy?: boolean;
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
}

export interface Job {
    id: string;
    title: string;
    description?: string;
    location: string;
    type: JobType | string;
    skills: string[];
    salary_range?: string;
    employer: {
        companyName: string;
        id?: string;
    };
    _count?: {
        applications: number;
    };
    isNew?: boolean;
    createdAt?: string;
}

export interface Application {
    id: string;
    jobId: string;
    userId: string;
    status: ApplicationStatus;
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

export interface Note {
    id: string;
    content: string;
    userId: string;
    createdAt: string;
}

export interface Subscription {
    id: string;
    userId: string;
    plan: 'FREE' | 'PREMIUM';
    status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';
    startDate: string;
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

export interface Conversation {
    id: string;
    seekerId: string;
    employerId: string;
    lastMessage?: string;
    lastMessageAt?: string;
    createdAt: string;
    // Joined data
    seeker?: JobSeeker;
    employer?: Employer;
    unreadCount?: number;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

export interface SavedJob {
    id: string;
    job_id: string;
    seeker_id: string;
    created_at: string;
    job: Job;
}

