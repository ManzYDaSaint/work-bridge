import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { LRUCache } from "lru-cache";

interface RateLimitConfig {
    limit: number;
    window: number; // in milliseconds
}

const tokenCache = new LRUCache<string, number[]>({
    max: 1000,
    ttl: 60 * 1000, // 1 minute default
});

export async function rateLimit(identifier: string, config: RateLimitConfig) {
    const now = Date.now();
    const windowStart = now - config.window;

    const tokenCount = (tokenCache.get(identifier) as number[]) || [];
    const validTokens = tokenCount.filter((timestamp) => timestamp > windowStart);

    if (validTokens.length >= config.limit) {
        return {
            success: false,
            remaining: 0,
            reset: validTokens[0] + config.window
        };
    }

    validTokens.push(now);
    tokenCache.set(identifier, validTokens, { ttl: config.window });

    return {
        success: true,
        remaining: config.limit - validTokens.length,
        reset: now + config.window
    };
}

export async function getIP() {
    const forwarded = (await headers()).get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0];
    return "127.0.0.1";
}

export function rateLimitResponse() {
    return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
            status: 429,
            headers: {
                "Retry-After": "60",
            }
        }
    );
}
