import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

export async function proxy(request: NextRequest) {
    // 1. Apply Rate Limiting to sensitive paths
    const path = request.nextUrl.pathname;
    if (path.startsWith("/api") || path === "/login" || path === "/register") {
        const ip = await getIP();
        const limit = path.startsWith("/api") ? 60 : 20; // Lower limit for pages
        const { success } = await rateLimit(ip, { limit, window: 60 * 1000 });

        if (!success) {
            return rateLimitResponse();
        }
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 2. Session Idle Timeout Enforcement (30 Minutes)
    if (user) {
        const lastActive = request.cookies.get("last-active")?.value;
        const now = Date.now();
        const timeoutMs = 30 * 60 * 1000; // 30 Minutes

        if (lastActive && now - parseInt(lastActive) > timeoutMs) {
            // Force logout
            await supabase.auth.signOut();
            const redirectResponse = NextResponse.redirect(new URL("/login?timeout=true", request.url));
            redirectResponse.cookies.delete("last-active");
            return redirectResponse;
        }

        // Update last-active timestamp on every valid request
        response.cookies.set("last-active", now.toString(), {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 3600 // 1 hour buffer
        });
    }

    // Protected: any /dashboard route requires auth
    if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect logged-in users away from /login and /register
    if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") && user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
