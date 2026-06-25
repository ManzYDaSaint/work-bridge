"use client";

import { Suspense, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Briefcase, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleAuthButtons from "@/components/auth/GoogleAuthButtons";
import { cn } from "@/lib/utils";
import {
    canUseEmailForRegistration,
    getCorporateEmailGuidance,
} from "@/lib/email-safety";

type Role = "JOB_SEEKER" | "EMPLOYER";

const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: "", color: "bg-slate-200 dark:bg-slate-800" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score, text: "Weak", color: "bg-red-500", textCls: "text-red-500" };
    if (score === 2) return { score, text: "Fair", color: "bg-amber-400", textCls: "text-amber-500" };
    if (score === 3) return { score, text: "Good", color: "bg-blue-500", textCls: "text-blue-500" };
    return { score, text: "Strong", color: "bg-emerald-500", textCls: "text-emerald-500" };
};

function RegisterForm() {
    const searchParams = useSearchParams();
    const [role, setRole] = useState<Role>("JOB_SEEKER");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        const r = searchParams.get("role");
        if (r?.toLowerCase() === "employer") {
            setRole("EMPLOYER");
        }
    }, [searchParams]);

    useEffect(() => {
        fetch("/api/metrics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventName: "visit_register", stage: "visit", role }),
        }).catch(() => undefined);
    }, [role]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const email = formData.email.trim().toLowerCase();
        const emailValidation = canUseEmailForRegistration(email);
        if (!emailValidation.ok) {
            toast.error(emailValidation.reason || "Please use a valid email");
            setIsLoading(false);
            return;
        }

        const strength = getPasswordStrength(formData.password);
        if (strength.score < 3) {
            toast.error("Please use a stronger password (must include uppercase, lowercase, numbers, and be at least 8 characters long).");
            setIsLoading(false);
            return;
        }

        const employerGuidance = role === "EMPLOYER" ? getCorporateEmailGuidance(email) : null;
        if (employerGuidance) {
            toast.message(employerGuidance);
        }

        const referralCode = searchParams.get("ref") || undefined;

        const { data: signUpData, error } = await supabase.auth.signUp({
            email,
            password: formData.password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    role,
                    referral_code: referralCode,
                },
            },
        });

        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }

        try {
            const regRes = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password: formData.password, role, userId: signUpData.user?.id }),
            });
            if (!regRes.ok) {
                const regBody = await regRes.json().catch(() => ({}));
                console.error("[register] profile creation failed:", regBody);
                toast.warning("Account created but profile setup had an issue. Please contact support if login fails.");
            }
            await fetch("/api/metrics/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ eventName: "register_completed", stage: "register", role }),
            });
        } catch (err) {
            console.error("[register] post-signup hook error:", err);
            // Non-blocking — don't block navigation but do log
        }

        // Force sign out to prevent auto-login if Supabase is configured to return a session on sign up
        await supabase.auth.signOut();

        toast.success("Account created. Verify your email, then complete onboarding.");
        router.push("/login");
        setIsLoading(false);
    };

    return (
        <AuthLayout>
            <div className="w-full">
                <div className="mb-8 text-center">
                    <Link href="/" className="inline-flex items-center justify-center mb-5" aria-label="Go to home">
                        <div className="logo-black">
                            <Image src="/logo-black.svg" alt="Aganyu" width={84} height={84} priority style={{ width: "5.5rem", height: "auto" }} />
                        </div>
                        <div className="logo-white">
                            <Image src="/logo.svg" alt="Aganyu" width={84} height={84} priority style={{ width: "5.5rem", height: "auto" }} />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Create your account</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Email, password, role. We will collect the rest after login.</p>
                </div>

                <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-7">
                    <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
                        <button
                            type="button"
                            onClick={() => setRole("JOB_SEEKER")}
                            className={cn(
                                "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                                role === "JOB_SEEKER"
                                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            )}
                        >
                            <User size={14} />
                            Candidate
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("EMPLOYER")}
                            className={cn(
                                "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                                role === "EMPLOYER"
                                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            )}
                        >
                            <Briefcase size={14} />
                            Employer
                        </button>
                    </div>

                    <GoogleAuthButtons mode="register" role={role} />

                    <div className="my-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">or email</span>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-medium text-slate-600 dark:text-slate-300">Email</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                required
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-medium text-slate-600 dark:text-slate-300">Password</label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Create a strong password"
                                required
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
                            />
                            {formData.password && (() => {
                                const st = getPasswordStrength(formData.password);
                                return (
                                    <div className="mt-2">
                                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div className={cn("h-full transition-all duration-300", st.color)} style={{ width: `${(st.score / 4) * 100}%` }} />
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between">
                                            <span className={cn("text-[10px] font-medium uppercase tracking-wider", st.textCls)}>
                                                {st.text}
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                Use 8+ chars, mix of cases & numbers
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        >
                            {isLoading ? "Creating account..." : "Create account"}
                            <ArrowRight size={16} />
                        </button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                        Sign in
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}

function RegisterFallback() {
    return (
        <AuthLayout>
            <div className="w-full min-h-[50vh] flex items-center justify-center text-slate-400 text-sm">Loading...</div>
        </AuthLayout>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<RegisterFallback />}>
            <RegisterForm />
        </Suspense>
    );
}
