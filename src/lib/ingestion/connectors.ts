/**
 * Aganyu Job Ingestion Engine — Pluggable Connectors
 *
 * Implements:
 * 1. RSSConnector: Parses XML/RSS feeds using standard item fields
 * 2. RestApiConnector: Standard JSON API parser
 * 3. Connector Registry & Factory
 */

import crypto from "crypto";
import type {
    JobSourceConnector,
    DiscoveredJobRef,
    FetchedPayload,
    IngestionSource,
    ConnectorType
} from "./types";

// ─────────────────────────────────────────────────────────────────
// RSS Connector
// ─────────────────────────────────────────────────────────────────

export class RSSConnector implements JobSourceConnector {
    readonly connectorType: ConnectorType = 'RSS';

    async discoverJobs(source: IngestionSource): Promise<DiscoveredJobRef[]> {
        const url = source.feed_url || source.base_url;
        const res = await fetch(url, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...source.custom_headers,
            },
        });

        if (!res.ok) {
            throw new Error(`[RSSConnector] Failed to fetch feed ${url}: ${res.statusText}`);
        }

        const xmlText = await res.text();
        const items = extractRssItems(xmlText);
        const discoveredRefs: DiscoveredJobRef[] = [];
        const seenUrls = new Set<string>(); // Deduplicate URLs across digest pages
        let digestProcessed = false; // Only process the MOST RECENT digest post

        for (const item of items) {
            const rawTitle = item.title || '';
            // Strip WP RSS boilerplate suffixes like "appeared first on Site Name."
            const cleanTitle = rawTitle
                .replace(/<[^>]*>/g, '')
                .replace(/\s+appeared\s+first\s+on\s+.+?\.?$/i, '')
                .trim();
            const itemUrl = item.link || source.base_url;

            // Check if item title or content looks like a daily digest / list post
            const isDigestPost = /posts\s+for\s+\d+/i.test(cleanTitle) 
                || /job\s+vacancies\s+for/i.test(cleanTitle)
                || /vacancies\s+for/i.test(cleanTitle)
                || /latest\s+jobs/i.test(cleanTitle)
                || (item.description && (item.description.includes('/job/') || item.description.includes('/vacancy/')));

            if (isDigestPost && itemUrl) {
                // OPTIMIZATION: Only process the FIRST (most recent) digest post
                if (digestProcessed) {
                    console.log(`[RSSConnector] Skipping older digest: "${cleanTitle}"`);
                    continue;
                }
                digestProcessed = true;

                // Fetch the latest digest page HTML and extract child job links
                try {
                    const pageRes = await fetch(itemUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        }
                    });
                    if (pageRes.ok) {
                        const html = await pageRes.text();

                        // Only extract from the JOB VACANCIES table, skip CONSULTANCIES/TENDERS/BIDS sections
                        const jobSectionMatch = html.match(/<td[^>]*>\s*<strong>\s*JOB VACANCIES\s*<\/strong>\s*<\/td>[\s\S]*?(?=<td[^>]*>\s*<strong>\s*(?:CONSULTANCIES|TENDERS|OTHER|FUNDING|SCHOLARSHIPS))/i);
                        const searchHtml = jobSectionMatch ? jobSectionMatch[0] : html;

                        // Extract job links matching standard vacancy path patterns
                        const jobLinkRegex = /<a[^>]+href=["']([^"']*\/(?:job|vacancy|position|career|post)\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
                        let match;
                        while ((match = jobLinkRegex.exec(searchHtml)) !== null) {
                            const jobUrl = match[1];
                            const jobTitle = match[2].replace(/<[^>]*>/g, '').trim();

                            // Skip duplicates, empty titles, and RSS links
                            if (!jobTitle || !jobUrl || jobTitle.length <= 2 || jobTitle.toLowerCase().includes('rss')) continue;
                            if (seenUrls.has(jobUrl)) continue;
                            seenUrls.add(jobUrl);

                            discoveredRefs.push({
                                externalId: crypto.createHash('md5').update(jobUrl).digest('hex'),
                                url: jobUrl,
                                title: jobTitle,
                                lastModified: item.pubDate,
                                metadata: { isSubJobPage: true, rawTitle: jobTitle },
                            });
                        }
                    }
                } catch (e) {
                    console.error(`[RSSConnector] Failed to extract digest sub-links from ${itemUrl}:`, e);
                }
            } else {
                if (!seenUrls.has(itemUrl)) {
                    seenUrls.add(itemUrl);
                    discoveredRefs.push({
                        externalId: item.link || item.guid || crypto.createHash('md5').update(cleanTitle).digest('hex'),
                        url: itemUrl,
                        title: cleanTitle,
                        lastModified: item.pubDate,
                        metadata: { rawItem: item },
                    });
                }
            }
        }

        return discoveredRefs;
    }

    async fetchJob(ref: DiscoveredJobRef, source: IngestionSource): Promise<FetchedPayload> {
        // If it's a direct sub-job page URL or target HTML link, fetch the full HTML
        if (ref.metadata?.isSubJobPage || ref.url.includes('/job/')) {
            try {
                const res = await fetch(ref.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        ...source.custom_headers,
                    }
                });
                if (res.ok) {
                    const html = await res.text();

                    // EARLY EXIT: Skip jobs marked as expired on the source website itself.
                    // Strip <style> blocks first so CSS rules like ".listing-expired { color:red }"
                    // don't false-positive as expiry signals.
                    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                    const isExpired =
                        /class="[^"]*listing-expired[^"]*"/.test(bodyHtml) ||
                        bodyHtml.includes('Applications have closed') ||
                        bodyHtml.includes('This listing has expired') ||
                        bodyHtml.includes('listing has expired');
                    if (isExpired) {
                        return {
                            rawContent: '',
                            contentType: 'TEXT',
                            url: ref.url,
                            checksum: 'EXPIRED_SKIP',
                        };
                    }

                    // ── STRATEGY 1: JSON-LD JobPosting Schema (Preferred) ──
                    // WP Job Manager embeds a complete JobPosting schema with title,
                    // description, deadline, company, location, and employment type.
                    // This is far more reliable than fragile CSS class parsing.
                    const jsonLdMatch = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?JobPosting[\s\S]*?)<\/script>/i.exec(html);
                    if (jsonLdMatch) {
                        try {
                            const schema = JSON.parse(jsonLdMatch[1]);
                            const posting = schema['@type'] === 'JobPosting' ? schema : null;
                            if (posting) {
                                // Decode HTML entities in the description
                                const rawDesc = (posting.description || '')
                                    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
                                // Strip HTML tags to get clean readable text
                                const cleanDesc = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                                const locationStr = posting.jobLocation?.address
                                    ? (typeof posting.jobLocation.address === 'string'
                                        ? posting.jobLocation.address
                                        : posting.jobLocation.address.addressLocality || JSON.stringify(posting.jobLocation.address))
                                    : '';

                                // Build a structured text payload the extraction engine can parse reliably
                                const structuredContent = [
                                    `<h1>${posting.title || ref.title || ''}</h1>`,
                                    posting.hiringOrganization?.name ? `<p>Organization: ${posting.hiringOrganization.name}</p>` : '',
                                    locationStr ? `<p>Location: ${locationStr}</p>` : '',
                                    posting.employmentType ? `<p>Type: ${Array.isArray(posting.employmentType) ? posting.employmentType.join(', ') : posting.employmentType}</p>` : '',
                                    posting.validThrough ? `<p>Closing Date: ${posting.validThrough}</p>` : '',
                                    posting.identifier?.value ? `<p>Apply URL: ${posting.identifier.value}</p>` : '',
                                    `<div class="job-description">${cleanDesc}</div>`,
                                ].filter(Boolean).join('\n');

                                const checksum = crypto.createHash('sha256').update(structuredContent).digest('hex');
                                return {
                                    rawContent: structuredContent,
                                    contentType: 'HTML',
                                    url: ref.url,
                                    checksum,
                                };
                            }
                        } catch (_parseErr) {
                            console.warn(`[RSSConnector] JSON-LD parse failed for ${ref.url}, falling back to HTML`);
                        }
                    }

                    // ── STRATEGY 2: Full HTML Fallback ──
                    // Prepend ref title to preserve the exact job title from RSS feed
                    const fullContent = ref.title ? `<h1>${ref.title}</h1>\n${html}` : html;
                    const checksum = crypto.createHash('sha256').update(fullContent).digest('hex');
                    return {
                        rawContent: fullContent,
                        contentType: 'HTML',
                        url: ref.url,
                        checksum,
                    };
                }
            } catch (err) {
                console.error(`[RSSConnector] Failed to fetch sub-page ${ref.url}:`, err);
            }
        }

        // Fallback to RSS item metadata content
        const rawContent = ref.metadata?.rawItem?.description || ref.metadata?.rawItem?.content || ref.title || "";
        const checksum = crypto.createHash('sha256').update(rawContent).digest('hex');

        return {
            rawContent,
            contentType: 'RSS',
            url: ref.url,
            checksum,
        };
    }
}

// ─────────────────────────────────────────────────────────────────
// REST API Connector
// ─────────────────────────────────────────────────────────────────

export class RestApiConnector implements JobSourceConnector {
    readonly connectorType: ConnectorType = 'REST_API';

    async discoverJobs(source: IngestionSource): Promise<DiscoveredJobRef[]> {
        const url = source.feed_url || source.base_url;
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'AganyuJobIngestionEngine/1.0 (+https://aganyu.com)',
                ...source.custom_headers,
            },
        });

        if (!res.ok) {
            throw new Error(`[RestApiConnector] Failed API call ${url}: ${res.statusText}`);
        }

        const json = await res.json();
        const listPath = source.selector_config?.listPath || 'jobs';
        const items: any[] = Array.isArray(json) ? json : (json[listPath] || []);

        const idKey = source.selector_config?.idKey || 'id';
        const titleKey = source.selector_config?.titleKey || 'title';

        return items.map(item => {
            const externalId = String(item[idKey] || item.url || crypto.createHash('md5').update(item[titleKey] || '').digest('hex'));
            return {
                externalId,
                url: item.url || `${source.base_url}/${externalId}`,
                title: item[titleKey],
                metadata: { rawJson: item },
            };
        });
    }

    async fetchJob(ref: DiscoveredJobRef, _source: IngestionSource): Promise<FetchedPayload> {
        const rawContent = JSON.stringify(ref.metadata?.rawJson || {});
        const checksum = crypto.createHash('sha256').update(rawContent).digest('hex');

        return {
            rawContent,
            contentType: 'JSON',
            url: ref.url,
            checksum,
        };
    }
}

// ─────────────────────────────────────────────────────────────────
// Connector Registry
// ─────────────────────────────────────────────────────────────────

const connectorRegistry: Map<ConnectorType, JobSourceConnector> = new Map();

// Register built-in connectors
connectorRegistry.set('RSS', new RSSConnector());
connectorRegistry.set('REST_API', new RestApiConnector());

export function getConnector(type: ConnectorType): JobSourceConnector {
    const connector = connectorRegistry.get(type);
    if (!connector) {
        throw new Error(`No connector registered for type: ${type}`);
    }
    return connector;
}

// ─────────────────────────────────────────────────────────────────
// Helper: Simple XML/RSS Item Parser
// ─────────────────────────────────────────────────────────────────

interface RssItem {
    title: string;
    link?: string;
    guid?: string;
    pubDate?: string;
    description?: string;
    content?: string;
}

function extractRssItems(xml: string): RssItem[] {
    const items: RssItem[] = [];
    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[0];
        items.push({
            title: getXmlTagValue(itemXml, 'title') || '',
            link: getXmlTagValue(itemXml, 'link'),
            guid: getXmlTagValue(itemXml, 'guid'),
            pubDate: getXmlTagValue(itemXml, 'pubDate'),
            description: getXmlTagValue(itemXml, 'description'),
            content: getXmlTagValue(itemXml, 'content:encoded') || getXmlTagValue(itemXml, 'content'),
        });
    }

    return items;
}

function getXmlTagValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tagName}>`, 'i');
    const match = regex.exec(xml);
    if (!match) return undefined;
    const val = (match[1] || match[2] || '').trim();
    
    // Strip HTML tags and decode common XML/HTML entities
    return val
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
}
