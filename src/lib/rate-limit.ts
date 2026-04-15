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

export function rateLimitResponse(request?: Request) {
    const acceptsHtml = request?.headers.get("accept")?.includes("text/html");

    if (acceptsHtml) {
        return new NextResponse(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Slow Down | WorkBridge</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-h: 100vh; margin: 0; background: #f8fafc; color: #0f172a; }
                    .card { background: white; padding: 2.5rem; border-radius: 1.5rem; shadow: 0 25px 50px -12px rgba(0,0,0,0.1); max-width: 400px; text-align: center; border: 1px solid #e2e8f0; }
                    .icon { font-size: 3rem; margin-bottom: 1rem; }
                    h1 { font-size: 1.5rem; font-weight: 800; margin: 0 0 0.5rem; color: #1e293b; }
                    p { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 2rem; }
                    .btn { display: inline-block; background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: 600; font-size: 0.875rem; transition: background 0.2s; }
                    .btn:hover { background: #1d4ed8; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">⏳</div>
                    <h1>Slow Down</h1>
                    <p>You're moving a bit fast for our systems. Please wait a moment before trying again to ensure WorkBridge remains secure for everyone.</p>
                    <a href="/dashboard" class="btn">Return to Safety</a>
                </div>
            </body>
            </html>`,
            {
                status: 429,
                headers: {
                    "Content-Type": "text/html",
                    "Retry-After": "60",
                }
            }
        );
    }

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
