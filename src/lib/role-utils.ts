export type PublicUserRole = "JOB_SEEKER" | "EMPLOYER";

export function normalizeRequestedRole(role: string | null | undefined): PublicUserRole | null {
    const normalized = role?.trim().toLowerCase();
    if (normalized === "employer") return "EMPLOYER";
    if (normalized === "seeker" || normalized === "job_seeker" || normalized === "candidate") return "JOB_SEEKER";
    return null;
}

export function isFreshUserRecord(createdAt?: string | null): boolean {
    if (!createdAt) return false;
    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return false;
    return Date.now() - createdTime < 5 * 60 * 1000;
}

export function resolveEffectiveRole({
    requestedRole,
    metadataRole,
    existingRole,
    createdAt,
}: {
    requestedRole: PublicUserRole | null;
    metadataRole: PublicUserRole | null;
    existingRole?: PublicUserRole | null;
    createdAt?: string | null;
}): PublicUserRole {
    const preferredRole = requestedRole || metadataRole;
    const isFresh = isFreshUserRecord(createdAt ?? undefined);

    if (preferredRole && (!existingRole || existingRole === preferredRole || isFresh)) {
        return preferredRole;
    }

    return existingRole || metadataRole || "JOB_SEEKER";
}
