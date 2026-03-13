"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { seekerProfileSchema, SeekerProfileValues } from "@/lib/validations/profile";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Shield, Save, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-checked:bg-blue-600 rounded-full transition-colors
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                peer-checked:after:translate-x-full shadow-inner" />
        </label>
    );
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const router = useRouter();

    const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<SeekerProfileValues>({
        resolver: zodResolver(seekerProfileSchema),
        defaultValues: {
            newJobAlerts: true,
            appStatusPulse: true,
            marketingInsights: false,
        }
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiFetch("/api/profile");
                if (res.ok) {
                    const data = await res.json();
                    reset({
                        fullName: data.fullName ?? "",
                        bio: data.bio ?? "",
                        location: data.location ?? "",
                        skills: data.skills ?? [],
                        experience: data.experience ?? [],
                        salaryExpectation: data.salaryExpectation ?? "",
                        seniorityLevel: data.seniorityLevel ?? "",
                        employmentType: data.employmentType ?? "",
                        emailAlias: data.emailAlias ?? "",
                        privacyLevel: data.privacyLevel ?? "VERIFIED_ONLY",
                        newJobAlerts: data.newJobAlerts ?? true,
                        appStatusPulse: data.appStatusPulse ?? true,
                        marketingInsights: data.marketingInsights ?? false,
                    });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [reset]);

    const onSubmit = async (data: SeekerProfileValues) => {
        setSaving(true);
        try {
            const res = await apiFetchJson("/api/profile", {
                method: "PUT",
                body: JSON.stringify(data),
            });
            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                router.refresh();
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl space-y-12 pb-20">
            <header>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Control Center</h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Architect your experience</p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8">
                {/* Profile Section */}
                <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                            <User size={24} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Profile Integrity</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email Alias</label>
                            <input
                                type="email"
                                {...register("emailAlias")}
                                placeholder="seeker@example.com"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                            {errors.emailAlias && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.emailAlias.message}</p>}
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Privacy Level</label>
                            <select
                                {...register("privacyLevel")}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            >
                                <option value="VERIFIED_ONLY">Visible to verified employers only</option>
                                <option value="PUBLIC">Public profile</option>
                                <option value="INCOGNITO">Incognito mode</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Notifications Section */}
                <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Bell size={24} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Signal Configuration</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                            <div>
                                <p className="font-black text-slate-900 dark:text-white">New Job Alerts</p>
                                <p className="text-xs text-slate-500 font-bold italic">Pulse notifications for roles matching your tech stack</p>
                            </div>
                            <Toggle
                                checked={watch("newJobAlerts") ?? true}
                                onChange={(val) => setValue("newJobAlerts", val, { shouldDirty: true })}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                            <div>
                                <p className="font-black text-slate-900 dark:text-white">Application Status Pulse</p>
                                <p className="text-xs text-slate-500 font-bold italic">Get notified when an employer interacts with your profile</p>
                            </div>
                            <Toggle
                                checked={watch("appStatusPulse") ?? true}
                                onChange={(val) => setValue("appStatusPulse", val, { shouldDirty: true })}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                            <div>
                                <p className="font-black text-slate-900 dark:text-white">Marketing Insights</p>
                                <p className="text-xs text-slate-500 font-bold italic">Occasional updates on career trends and platform features</p>
                            </div>
                            <Toggle
                                checked={watch("marketingInsights") ?? false}
                                onChange={(val) => setValue("marketingInsights", val, { shouldDirty: true })}
                            />
                        </div>
                    </div>
                </section>

                {/* Security Section */}
                <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600">
                            <Shield size={24} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Digital Vault</h2>
                    </div>

                    <div className="space-y-6">
                        <p className="text-sm text-slate-400 font-medium">Protect your professional records with periodic security updates.</p>
                        <button
                            type="button"
                            onClick={() => window.location.href = '/auth/forgot-password'}
                            className="h-12 px-8 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                            Request Password Reset
                        </button>
                    </div>
                </section>

                <div className="flex items-center justify-end gap-4 pt-4">
                    <AnimatePresence>
                        {isDirty && !saving && (
                            <motion.p
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] font-black text-orange-500 uppercase tracking-widest"
                            >
                                Unsaved Transitions Detected
                            </motion.p>
                        )}
                    </AnimatePresence>
                    <button
                        type="submit"
                        disabled={saving || !isDirty}
                        className="h-16 px-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-2xl transition-all hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white active:scale-95 group disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saveSuccess ? <Check className="w-5 h-5" /> : null}
                        {saving ? "Committing..." : saveSuccess ? "Committed" : "Commit Changes"}
                        {!saving && !saveSuccess && <Save size={18} className="group-hover:rotate-12 transition-transform" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
