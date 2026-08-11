export type JsonLdValue = Record<string, any>;

export function extractJsonLdObjects(html: string): JsonLdValue[] {
    const scripts = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
    const objects: JsonLdValue[] = [];

    for (const script of scripts) {
        const jsonText = script[1]?.trim();
        if (!jsonText) continue;

        try {
            const parsed = JSON.parse(jsonText);
            if (Array.isArray(parsed)) {
                objects.push(...parsed);
            } else {
                objects.push(parsed);
            }
        } catch {
            // Ignore invalid JSON-LD blocks
            continue;
        }
    }

    return objects;
}

export function findJobPostingJsonLd(html: string): JsonLdValue | null {
    const objects = extractJsonLdObjects(html);
    for (const obj of objects) {
        if (!obj) continue;
        const type = obj['@type'] || obj['type'];
        if (typeof type === 'string' && type.toLowerCase().includes('jobposting')) {
            return obj;
        }

        if (Array.isArray(type) && type.some((t) => typeof t === 'string' && t.toLowerCase().includes('jobposting'))) {
            return obj;
        }

        if (obj['mainEntity'] && typeof obj['mainEntity'] === 'object') {
            const mainType = obj['mainEntity']['@type'] || obj['mainEntity']['type'];
            if (typeof mainType === 'string' && mainType.toLowerCase().includes('jobposting')) {
                return obj['mainEntity'];
            }
        }
    }

    return null;
}

export function extractMetaTags(html: string): Record<string, string> {
    const meta: Record<string, string> = {};
    const regex = /<meta\s+([^>]*?)>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
        const attrs = match[1];
        const nameMatch = /(?:name|property|itemprop)=["']([^"']+)["']/i.exec(attrs);
        const contentMatch = /content=["']([^"']*)["']/i.exec(attrs);
        if (nameMatch && contentMatch) {
            meta[nameMatch[1].toLowerCase()] = contentMatch[1].trim();
        }
    }

    return meta;
}

export function extractOpenGraphFields(html: string): Record<string, string> {
    const meta = extractMetaTags(html);
    const og: Record<string, string> = {};
    for (const key of Object.keys(meta)) {
        if (key.startsWith('og:') || key.startsWith('twitter:')) {
            og[key] = meta[key];
        }
    }
    return og;
}

export function extractJobFieldsFromJsonLd(jobPosting: JsonLdValue): Partial<Record<string, any>> {
    const location = jobPosting.jobLocation?.address ?
        (typeof jobPosting.jobLocation.address === 'string'
            ? jobPosting.jobLocation.address
            : jobPosting.jobLocation.address.addressLocality || jobPosting.jobLocation.address.addressRegion || JSON.stringify(jobPosting.jobLocation.address))
        : null;

    return {
        title: jobPosting.title || null,
        description: jobPosting.description || null,
        display_company_name: jobPosting.hiringOrganization?.name || null,
        location,
        type: jobPosting.employmentType || null,
        deadline: jobPosting.validThrough || null,
        external_apply_url: jobPosting.url || jobPosting.identifier?.value || null,
        salary_range: jobPosting.baseSalary ? String(jobPosting.baseSalary) : null,
        application_instructions: jobPosting.applicationInstructions || null,
    };
}

export function extractBestTitle(meta: Record<string, string>): string | null {
    return meta['og:title'] || meta['twitter:title'] || meta['title'] || null;
}

export function extractBestDescription(meta: Record<string, string>): string | null {
    return meta['og:description'] || meta['twitter:description'] || meta['description'] || null;
}
