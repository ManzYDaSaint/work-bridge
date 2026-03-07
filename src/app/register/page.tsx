"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Briefcase, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/components/auth/AuthLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Role = "JOB_SEEKER" | "EMPLOYER";

export default function RegisterPage() {
    const [role, setRole] = useState<Role>("JOB_SEEKER");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        companyName: "",
        industry: "",
        location: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        console.log(formData);
        const { error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    role,
                    fullName: formData.fullName,
                    companyName: formData.companyName,
                    industry: formData.industry,
                    location: formData.location,
                },
            },
        });

        if (error) {
            toast.error(error.message);
        } else {
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
                await fetch(`${apiBase}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...formData, role }),
                });
            } catch {
                // Backend registration is non-blocking
            }
            toast.success("Identity broadcasted! Verify your email to activate.");
            router.push("/login");
        }

        setIsLoading(false);
    };

    return (
        <AuthLayout>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
            >
                {/* Header */}
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        whileHover={{ rotate: -15 }}
                        className="w-16 h-16 flex items-center justify-center mb-6"
                    >
                        <Image src="/logo.svg" alt="WorkBridge" width={64} height={64} priority />
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-center">
                        Secure Onboarding
                    </h1>
                    <p className="text-slate-400 mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-center">Broadcast your professional intent</p>
                </div>

                {/* Form Card */}
                <div className="bg-white/90 backdrop-blur-3xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
                    {/* Role Toggle */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10 border border-slate-200/50">
                        <button
                            type="button"
                            onClick={() => setRole("JOB_SEEKER")}
                            className={cn(
                                "flex-1 flex items-center justify-center py-3 px-4 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all duration-300 gap-2",
                                role === "JOB_SEEKER"
                                    ? "bg-white text-slate-900 shadow-xl scale-[1.02]"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <User size={14} strokeWidth={3} />
                            CANDIDATE
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("EMPLOYER")}
                            className={cn(
                                "flex-1 flex items-center justify-center py-3 px-4 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all duration-300 gap-2",
                                role === "EMPLOYER"
                                    ? "bg-white text-slate-900 shadow-xl scale-[1.02]"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Briefcase size={15} strokeWidth={3} />
                            RECRUITER
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Verified Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter email address"
                                    required
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Security Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Create strong password"
                                    required
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                />
                            </div>

                            <AnimatePresence mode="wait">
                                {role === "JOB_SEEKER" ? (
                                    <motion.div
                                        key="seeker"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-1.5"
                                    >
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Identity</label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            placeholder="Professional full name"
                                            required
                                            onChange={handleInputChange}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="employer"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Corporate Entity</label>
                                            <input
                                                type="text"
                                                name="companyName"
                                                placeholder="Company name"
                                                required
                                                onChange={handleInputChange}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Industry</label>
                                                <input
                                                    type="text"
                                                    name="industry"
                                                    placeholder="Sector"
                                                    onChange={handleInputChange}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">HQ Base</label>
                                                <input
                                                    type="text"
                                                    name="location"
                                                    placeholder="City, Country"
                                                    required
                                                    onChange={handleInputChange}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/10 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 group active:scale-95 border-none mt-4"
                        >
                            {isLoading ? "Broadcasting..." : "Establish Profile"}
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>

                <p className="mt-10 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">
                    Verified member?{" "}
                    <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors ml-1">
                        Sign In
                    </Link>
                </p>
            </motion.div>
        </AuthLayout>
    );
}
