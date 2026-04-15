const FREE_EMAIL_DOMAINS = new Set([
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "live.com",
    "msn.com"
]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
    "mailinator.com",
    "10minutemail.com",
    "tempmail.com",
    "guerrillamail.com",
    "yopmail.com",
    "trashmail.com"
]);

export function getEmailDomain(email: string): string {
    const at = email.lastIndexOf("@");
    if (at <= 0 || at === email.length - 1) return "";
    return email.slice(at + 1).trim().toLowerCase();
}

export function isFreeEmailDomain(email: string): boolean {
    const domain = getEmailDomain(email);
    return domain ? FREE_EMAIL_DOMAINS.has(domain) : false;
}

export function isDisposableEmailDomain(email: string): boolean {
    const domain = getEmailDomain(email);
    return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}

export function canUseEmailForRegistration(email: string): { ok: boolean; reason?: string } {
    if (isDisposableEmailDomain(email)) {
        return {
            ok: false,
            reason: "Temporary email addresses are not allowed. Please use a permanent email.",
        };
    }

    return { ok: true };
}

export function getCorporateEmailGuidance(email: string): string | null {
    if (isFreeEmailDomain(email)) {
        return "For faster recruiter verification, use your company email domain.";
    }

    return null;
}
