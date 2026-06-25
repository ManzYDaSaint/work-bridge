import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware — Auth code rescue
 *
 * When the Supabase Site URL is used as the fallback redirect (because
 * `redirectTo` isn't in the allowlist yet, or the email was sent before
 * the allowlist was updated), the auth `?code=` lands on the homepage:
 *
 *   https://www.aganyu.com/?code=xxxx&type=recovery
 *
 * This middleware intercepts that, preserves all params, and forwards
 * the request to the proper handler at /auth/callback.
 */
export function middleware(request: NextRequest) {
    const { pathname, searchParams, origin } = request.nextUrl;

    // Only intercept paths that are NOT already the auth callback
    const isAuthPath = pathname.startsWith("/auth/");
    const hasCode = searchParams.has("code");

    if (hasCode && !isAuthPath) {
        // Build the correct callback URL preserving all search params
        const callbackUrl = new URL("/auth/callback", origin);
        searchParams.forEach((value, key) => {
            callbackUrl.searchParams.set(key, value);
        });
        // Default next destination for recovery tokens
        if (!callbackUrl.searchParams.has("next")) {
            const type = searchParams.get("type");
            callbackUrl.searchParams.set(
                "next",
                type === "recovery" ? "/auth/reset-password" : "/dashboard"
            );
        }
        return NextResponse.redirect(callbackUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Run on all paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public files (svg, png, jpg, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
