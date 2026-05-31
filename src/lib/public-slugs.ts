export function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

export function buildPublicProfileSlug(name: string | null | undefined, id: string) {
    const base = slugify(name || "candidate") || "candidate";
    return `${base}-${id.replace(/-/g, "").slice(0, 8)}`;
}

export function buildPublicJobSlug(title: string | null | undefined, id: string) {
    const base = slugify(title || "job") || "job";
    return `${base}-${id.replace(/-/g, "").slice(0, 8)}`;
}
