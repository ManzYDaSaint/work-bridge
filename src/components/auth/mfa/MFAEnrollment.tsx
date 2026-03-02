"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Key, CheckCircle2, QrCode, ArrowRight, Download, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MFAEnrollment() {
    const [status, setStatus] = useState<"idle" | "enrolling" | "verifying" | "active">("idle");
    const [qrCode, setQrCode] = useState<string>("");
    const [factorId, setFactorId] = useState<string>("");
    const [verifyCode, setVerifyCode] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const supabase = createBrowserSupabaseClient();

    const startEnrollment = async () => {
        setError(null);
        setStatus("enrolling");
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: "totp",
                issuer: "WorkBridge",
            });

            if (error) throw error;

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setStatus("verifying");
        } catch (err: any) {
            setError(err.message || "Failed to start enrollment");
            setStatus("idle");
        }
    };

    const verifyFactor = async () => {
        setError(null);
        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId
            });

            if (challengeError) throw challengeError;

            const { data, error } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: verifyCode
            });

            if (error) throw error;

            // Fetch Recovery Codes (type-safe bypass for potential SDK mismatch)
            const { data: codes, error: codesError } = await (supabase.auth.mfa as any).getRecoveryCodes();
            if (!codesError && codes) {
                setRecoveryCodes(codes.recovery_codes);
            }

            setStatus("active");
        } catch (err: any) {
            setError(err.message || "Invalid verification code");
        }
    };

    const downloadRecoveryCodes = () => {
        const content = "WORKBRIDGE MFA RECOVERY CODES\n\nKeep these codes in a secure place. Each code can only be used once.\n\n" + recoveryCodes.join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "workbridge-recovery-codes.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="glass-effect p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative">
            <div className="flex items-center gap-4 mb-8">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
                    status === "active" ? "bg-green-500/10 text-green-500" : "bg-blue-600/10 text-blue-600"
                )}>
                    {status === "active" ? <ShieldCheck size={24} /> : <Key size={24} />}
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Multi-Factor Guard</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Double-layer authentication protocol</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {status === "idle" && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Strengthen your account security by requiring a unique code from your authenticator app (like Google Authenticator or Authy) whenever you sign in.
                        </p>
                        <button
                            onClick={startEnrollment}
                            className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl active:scale-95"
                        >
                            <ShieldCheck size={16} /> Enable Security Layer
                        </button>
                    </motion.div>
                )}

                {status === "verifying" && (
                    <motion.div
                        key="verifying"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-slate-100">
                                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                            </div>
                            <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium px-4">
                                Scan this QR code with your authenticator app, then enter the 6-digit verification code below.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                                    className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-black text-2xl tracking-[0.5em] text-center text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:tracking-normal placeholder:font-bold"
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest justify-center"
                                >
                                    <ShieldAlert size={14} />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                onClick={verifyFactor}
                                disabled={verifyCode.length !== 6}
                                className="w-full h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                            >
                                Verify & Activate <ArrowRight size={16} />
                            </button>

                            <button
                                onClick={() => setStatus("idle")}
                                className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Cancel Enrollment
                            </button>
                        </div>
                    </motion.div>
                )}

                {status === "active" && (
                    <motion.div
                        key="active"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-6 py-4"
                    >
                        <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center text-green-500 shadow-xl shadow-green-500/10">
                            <CheckCircle2 size={40} />
                        </div>
                        <div className="text-center">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase">Protocol Active</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                                Multi-Factor Authentication is fully operational. Your professional identity is now under high-tier protection.
                            </p>
                        </div>

                        {recoveryCodes.length > 0 && (
                            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Emergency Recovery Codes</span>
                                        <button
                                            onClick={downloadRecoveryCodes}
                                            className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                                        >
                                            <Download size={12} /> Download
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {recoveryCodes.map((code) => (
                                            <div key={code} className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-center font-mono text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 select-all">
                                                {code}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 text-[9px] text-slate-400 font-medium text-center italic">
                                        Each code can be used once for emergency access. Store them securely.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="w-full p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-2xl flex items-center gap-3">
                            <ShieldCheck size={20} className="text-green-500" />
                            <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Encryption Level: Maximum</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
