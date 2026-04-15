import { UserRole } from "@/types";

type SeekerLite = {
    full_name?: string | null;
    location?: string | null;
    bio?: string | null;
    qualification?: string | null;
    skills?: string[] | null;
};

type EmployerLite = {
    company_name?: string | null;
    industry?: string | null;
    location?: string | null;
};

function hasText(value?: string | null): boolean {
    return !!value && value.trim().length > 0;
}

export function isOnboardingComplete(args: {
    role: UserRole;
    seeker?: SeekerLite | null;
    employer?: EmployerLite | null;
    completedAt?: string | null;
}): boolean {
    // If explicitly completed (via /api/onboarding/complete), always honour it
    if (args.completedAt) return true;

    if (args.role === "JOB_SEEKER") {
        return (
            hasText(args.seeker?.full_name) &&
            hasText(args.seeker?.location) &&
            hasText(args.seeker?.bio) &&
            hasText(args.seeker?.qualification) &&
            (args.seeker?.skills?.length ?? 0) > 0
        );
    }

    if (args.role === "EMPLOYER") {
        return (
            hasText(args.employer?.company_name) &&
            hasText(args.employer?.industry) &&
            hasText(args.employer?.location)
        );
    }

    return true;
}
