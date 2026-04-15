import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthError } from "@supabase/supabase-js";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { isOnboardingComplete } from "@/lib/onboarding";

function isBenignUnauthenticatedAuthError(error: AuthError): boolean {
    if (error.status === 401) return true;
    const msg = error.message?.toLowerCase() ?? "";
    return msg.includes("session missing");
}

export async function middleware(request: NextRequest) {
    const start = Date.now();
    const path = request.nextUrl.pathname;

    // 1. Apply Rate Limiting to sensitive paths
    if (path.startsWith("/api") || path === "/login" || path === "/register") {
        const ip = await getIP();
        const limit = path.startsWith("/api") ? 60 : 20;
        const { success } = await rateLimit(ip, { limit, window: 60 * 1000 });

        if (!success) {
            return rateLimitResponse(request);
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

    // Do not call `getUser()` for `/api/*`: route handlers already resolve the session (via
    // `validateAuth` / `getSession`), and duplicating it here doubled Supabase Auth traffic and
    // triggered `over_request_rate_limit` (429) on parallel dashboard fetches.
    const isProtectedRoute = path.startsWith("/dashboard") || path === "/onboarding" || path.startsWith("/api");
    const isAuthGate = path === "/login" || path === "/register";
    const shouldCallGetUser =
        isAuthGate || path.startsWith("/dashboard") || path === "/onboarding";

    let user = null;
    if (shouldCallGetUser) {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (
            authError &&
            path !== "/login" &&
            path !== "/register" &&
            !isBenignUnauthenticatedAuthError(authError)
        ) {
            console.error(`[proxy.ts] Auth error for ${path}:`, authError.message);
        }
        user = authUser;
    }

    // 2. Session Idle Timeout Enforcement (30 Minutes)
    if (user) {
        const lastActiveValue = request.cookies.get("last-active")?.value;
        const lastActive = lastActiveValue ? parseInt(lastActiveValue) : null;
        const now = Date.now();
        const timeoutMs = 30 * 60 * 1000;

        if (lastActive && !isNaN(lastActive) && now - lastActive > timeoutMs) {
            console.log(`[proxy.ts] Session timeout for ${user.id} at ${path}`);
            await supabase.auth.signOut();
            const redirectResponse = withCookies(NextResponse.redirect(new URL("/login?timeout=true", request.url)), response);
            redirectResponse.cookies.delete("last-active");
            redirectResponse.cookies.delete("wb_onboarding_done");
            return redirectResponse;
        }

        response.cookies.set("last-active", now.toString(), {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 3600
        });
    }

    // 3. Protected Route Redirects
    if (path.startsWith("/dashboard") && !user) {
        return withCookies(NextResponse.redirect(new URL("/login", request.url)), response);
    }

    // 4. Onboarding Gate with Caching
    if (user && isProtectedRoute) {
        const isAlreadyComplete = request.cookies.get("wb_onboarding_done")?.value === "true";

        if (!isAlreadyComplete) {
            const { data: account, error: accountError } = await supabase
                .from("users")
                .select(`
                    role,
                    onboarding_completed_at,
                    seeker:job_seekers(full_name, location, bio, qualification, skills),
                    employer:employers(company_name, industry, location)
                `)
                .eq("id", user.id)
                .single();

            if (!accountError) {
                const complete = isOnboardingComplete({
                    role: account?.role || "JOB_SEEKER",
                    seeker: (account as any)?.seeker || null,
                    employer: (account as any)?.employer || null,
                    completedAt: account?.onboarding_completed_at || null,
                });

                if (complete) {
                    response.cookies.set("wb_onboarding_done", "true", {
                        path: "/",
                        maxAge: 3600,
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                    });
                }

                if (!complete && path !== "/onboarding") {
                    return withCookies(NextResponse.redirect(new URL("/onboarding", request.url)), response);
                }

                if (complete && path === "/onboarding") {
                    return withCookies(NextResponse.redirect(new URL("/dashboard", request.url)), response);
                }

                if (path === "/dashboard") {
                    const rolePath = account?.role === "ADMIN" ? "admin" : account?.role === "EMPLOYER" ? "employer" : "seeker";
                    return withCookies(NextResponse.redirect(new URL(`/dashboard/${rolePath}`, request.url)), response);
                }
            }
        }
    }

    // Redirect logged-in users away from /login and /register
    if (isAuthGate && user) {
        return withCookies(NextResponse.redirect(new URL("/dashboard", request.url)), response);
    }
    
    // Clear `last-active` cookie on /login page to prevent immediate timeout upon logging in after a long time
    if (path === "/login" && !user) {
        response.cookies.delete("last-active");
    }

    // Experiment assignments
    if (!request.cookies.get("wb_exp_onboarding")) {
        const variant = Math.random() < 0.5 ? "A" : "B";
        response.cookies.set("wb_exp_onboarding", variant, {
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            sameSite: "lax",
        });
    }

    if (process.env.NODE_ENV === "development") {
        const duration = Date.now() - start;
        if (duration > 500) {
            console.log(`[proxy.ts] ${path} took ${duration}ms`);
        }
    }

    return response;
}

/**
 * Helper to preserve cookies (including Supabase session and last-active) when redirecting
 */
function withCookies(to: NextResponse, from: NextResponse) {
    from.cookies.getAll().forEach((c) => to.cookies.set(c.name, c.value, c));
    return to;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
