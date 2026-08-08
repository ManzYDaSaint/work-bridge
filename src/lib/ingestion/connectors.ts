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

        for (const item of items) {
            const rawTitle = item.title || '';
            const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').trim();
            const itemUrl = item.link || source.base_url;

            // Check publication date — skip items published before last_crawl_at or older than 48 hours
            if (item.pubDate) {
                const itemDate = new Date(item.pubDate).getTime();
                if (!isNaN(itemDate)) {
                    // 1. If source was crawled previously, skip items published before last_crawl_at
                    if (source.last_crawl_at) {
                        const lastCrawlTime = new Date(source.last_crawl_at).getTime();
                        if (itemDate < lastCrawlTime) {
                            continue;
                        }
                    }
                    // 2. Hard limit: Skip items older than 48 hours
                    const maxAgeMs = 48 * 60 * 60 * 1000;
                    if (Date.now() - itemDate > maxAgeMs) {
                        continue;
                    }
                }
            }

            // Check if item title or content looks like a daily digest / list post
            const isDigestPost = /posts\s+for\s+\d+/i.test(cleanTitle) 
                || /job\s+vacancies\s+for/i.test(cleanTitle)
                || /vacancies\s+for/i.test(cleanTitle)
                || /latest\s+jobs/i.test(cleanTitle)
                || (item.description && (item.description.includes('/job/') || item.description.includes('/vacancy/')));

            if (isDigestPost && itemUrl) {
                // Fetch digest page HTML and extract child job links dynamically
                try {
                    const pageRes = await fetch(itemUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        }
                    });
                    if (pageRes.ok) {
                        const html = await pageRes.text();
                        // Extract job links matching standard vacancy path patterns (/job/, /vacancy/, /positions/, /careers/)
                        const jobLinkRegex = /<a[^>]+href=["']([^"']*\/(?:job|vacancy|position|career|post)\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
                        let match;
                        while ((match = jobLinkRegex.exec(html)) !== null) {
                            const jobUrl = match[1];
                            const jobTitle = match[2].replace(/<[^>]*>/g, '').trim();
                            if (jobTitle && jobUrl && jobTitle.length > 2 && !jobTitle.toLowerCase().includes('rss')) {
                                discoveredRefs.push({
                                    externalId: crypto.createHash('md5').update(jobUrl).digest('hex'),
                                    url: jobUrl,
                                    title: jobTitle,
                                    lastModified: item.pubDate,
                                    metadata: { isSubJobPage: true, rawTitle: jobTitle },
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[RSSConnector] Failed to extract digest sub-links from ${itemUrl}:`, e);
                }
            } else {
                discoveredRefs.push({
                    externalId: item.link || item.guid || crypto.createHash('md5').update(cleanTitle).digest('hex'),
                    url: itemUrl,
                    title: cleanTitle,
                    lastModified: item.pubDate,
                    metadata: { rawItem: item },
                });
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
                    let html = await res.text();
                    // Isolate main article/entry content container if available to strip site nav & header/footer
                    const entryMatch = /<div[^>]*class="[^"]*(?:entry-content|post-content|job-description|job-details)[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html)
                                    || /<article[\s\S]*?>([\s\S]*?)<\/article>/i.exec(html);

                    if (entryMatch && entryMatch[1]) {
                        html = entryMatch[1];
                    }

                    // Prepend ref title if present to preserve exact title
                    if (ref.title) {
                        html = `<h1>${ref.title}</h1>\n` + html;
                    }

                    const checksum = crypto.createHash('sha256').update(html).digest('hex');
                    return {
                        rawContent: html,
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
