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

        return items.map(item => {
            const rawTitle = item.title || '';
            const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').trim();
            return {
                externalId: item.link || item.guid || crypto.createHash('md5').update(cleanTitle).digest('hex'),
                url: item.link || source.base_url,
                title: cleanTitle,
                lastModified: item.pubDate,
                metadata: { rawItem: item },
            };
        });
    }

    async fetchJob(ref: DiscoveredJobRef, _source: IngestionSource): Promise<FetchedPayload> {
        // If content encoded in RSS metadata, use it directly
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
