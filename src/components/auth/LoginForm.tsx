"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginForm() {
    const searchParams = useSearchParams();
    const isTimeout = searchParams.get("timeout") === "true";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    // const [magicLoading, setMagicLoading] = useState(false);
    // const [showMfa, setShowMfa] = useState(false);
    // const [mfaCode, setMfaCode] = useState("");
    // const [mfaError, setMfaError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }

        // Check for MFA
        // const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        // if (aalError) {
        //     toast.error(aalError.message);
        //     setIsLoading(false);
        //     return;
        // }

        // if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        //     setShowMfa(true);
        //     setIsLoading(false);
        // } else {
        //     router.push("/dashboard");
        //     router.refresh();
        //     setIsLoading(false);
        // }
    };

    // const handleMfaVerify = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     setIsLoading(true);
    //     setMfaError(null);

    //     try {
    //         const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    //         if (factorsError) throw factorsError;

    //         const totpFactor = factors.totp[0];
    //         if (!totpFactor) throw new Error("No MFA factor found");

    //         const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    //             factorId: totpFactor.id
    //         });
    //         if (challengeError) throw challengeError;

    //         const { error: verifyError } = await supabase.auth.mfa.verify({
    //             factorId: totpFactor.id,
    //             challengeId: challengeData.id,
    //             code: mfaCode
    //         });

    //         if (verifyError) throw verifyError;

    //         router.push("/dashboard");
    //         router.refresh();
    //     } catch (err: any) {
    //         setMfaError(err.message || "Invalid verification code");
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // const handleGoogleLogin = async () => {
    //     await supabase.auth.signInWithOAuth({
    //         provider: "google",
    //         options: { redirectTo: `${window.location.origin}/auth/callback` },
    //     });
    // };

    // const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();
    //     setMagicLoading(true);
    //     const { error } = await supabase.auth.signInWithOtp({
    //         email,
    //         options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    //     });
    //     if (error) {
    //         toast.error(error.message);
    //     } else {
    //         toast.success("Magic link sent! Check your email.");
    //     }
    //     setMagicLoading(false);
    // };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
        >
            {/* Header */}
            <div className="flex flex-col items-center mb-10">
                <Link href="/">
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-16 h-16 flex items-center justify-center mb-6"
                    >
                        <Image src="/logo-black.svg" alt="WorkBridge" width={64} height={64} priority />
                    </motion.div>
                </Link>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter text-center">
                    Welcome back
                </h2>
                <p className="text-slate-400 mt-2 text-xs font-black uppercase tracking-widest text-center">Continue your professional journey</p>
            </div>

            {isTimeout && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 bg-slate-900 text-white rounded-[2rem] flex items-center gap-4 shadow-2xl border border-slate-800"
                >
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Security Protocol</p>
                        <p className="text-xs font-bold text-slate-300">Session expired due to 30 minutes of inactivity. Please re-authenticate.</p>
                    </div>
                </motion.div>
            )}

            {/* Form Card */}
            <div className="bg-white/90 backdrop-blur-3xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
                <AnimatePresence mode="wait">
                    {/* {showMfa ? (
                        <motion.form
                            key="mfa"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleMfaVerify}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2 mb-4">
                                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                                    <ShieldCheck size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">MFA Challenge</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    Security protocol initiated. Please enter the 6-digit code from your authenticator app.
                                </p>
                            </div>

                            <div className="space-y-1.5 text-center">
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="000 000"
                                    required
                                    className="w-full h-20 px-8 rounded-2xl bg-slate-50 border border-slate-200 font-black text-3xl tracking-[0.5em] text-center text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:tracking-normal"
                                />
                                {mfaError && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase">{mfaError}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || mfaCode.length !== 6}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 border-none"
                            >
                                {isLoading ? "Verifying..." : "Verify Identity"}
                                <ArrowRight size={16} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowMfa(false)}
                                className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Back to login
                            </button>
                        </motion.form>
                    ) : (
                    )} */}
                    <motion.form
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handlePasswordLogin}
                        className="space-y-6"
                    >
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="e.g. seeker@example.com"
                                required
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-end px-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Password</label>
                                <Link href="/auth/forgot-password" title="forgot-password" className="text-[10px] text-blue-600 hover:text-blue-700 font-black uppercase tracking-widest transition-colors">
                                    Reset?
                                </Link>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-bold"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 cursor-pointer bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/10 text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 group active:scale-95 border-none"
                        >
                            {isLoading ? "Signing in..." : "Authorize Access"}
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.form>
                </AnimatePresence>

                {/* Divider */}
                {/* <div className="flex items-center my-10 px-4">
                    <div className="flex-1 border-t border-slate-100" />
                    <span className="mx-4 text-[9px] text-slate-300 uppercase font-black tracking-[0.3em]">Or</span>
                    <div className="flex-1 border-t border-slate-100" />
                </div> */}

                {/* Google OAuth */}
                {/* <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mb-4 shadow-sm active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                    </svg>
                    Google Single Sign-On
                </button> */}

                {/* Magic Link */}
                {/* <form onSubmit={handleMagicLink}>
                    <button
                        type="submit"
                        disabled={magicLoading || !email}
                        className="w-full py-2 text-[9px] text-slate-400 hover:text-blue-600 font-black transition-colors uppercase tracking-[0.3em]"
                    >
                        {magicLoading ? "Sending Signal..." : "Request Magic Link"}
                    </button>
                </form> */}
            </div>

            <p className="mt-10 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">
                New to WorkBridge?{" "}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 transition-colors ml-1">
                    Create Account
                </Link>
            </p>
        </motion.div>
    );
}
