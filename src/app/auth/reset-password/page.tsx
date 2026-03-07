"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Password updated successfully!");
            setTimeout(() => {
                router.push("/login");
            }, 2000);
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
                        Reset Integrity
                    </h1>
                    <p className="text-slate-400 mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-center">
                        Configure your new security credentials
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/90 backdrop-blur-3xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm Identity</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    required
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/10 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 group active:scale-95 border-none mt-2"
                        >
                            {isLoading ? "Updating..." : "Commit New Credentials"}
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>

                <p className="mt-10 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">
                    Need support?{" "}
                    <Link href="/help" className="text-blue-600 hover:text-blue-700 transition-colors ml-1">
                        Go to Help Center
                    </Link>
                </p>
            </motion.div>
        </AuthLayout>
    );
}
