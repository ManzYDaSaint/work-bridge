"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employerProfileSchema, EmployerProfileValues } from "@/lib/validations/employer";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { Settings, Bell, Globe, Shield, Trash2, Camera, Loader2, Check } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/dashboard/ui";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
                {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-checked:bg-blue-600 rounded-full transition-colors
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                peer-checked:after:translate-x-full shadow-inner" />
        </label>
    );
}

export default function EmployerSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const router = useRouter();

    const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<EmployerProfileValues>({
        resolver: zodResolver(employerProfileSchema),
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiFetch("/api/employer/profile");
                if (res.ok) {
                    const data = await res.json();
                    reset({
                        companyName: data.companyName ?? "",
                        industry: data.industry ?? "",
                        location: data.location ?? "",
                        website: data.website ?? "",
                        description: data.description ?? "",
                    });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [reset]);

    const onSubmit = async (data: EmployerProfileValues) => {
        setSaving(true);
        try {
            const res = await apiFetchJson("/api/employer/profile", {
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
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Workspace Settings"
                subtitle="Configure your corporate identity and preferences"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Identity Form */}
                <div className="lg:col-span-2 space-y-8">
                    <SectionCard title="Corporate Identity">
                        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Company Name</label>
                                    <input
                                        {...register("companyName")}
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    />
                                    {errors.companyName && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.companyName.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Industry</label>
                                    <input
                                        {...register("industry")}
                                        placeholder="e.g. Technology, Finance"
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    />
                                    {errors.industry && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.industry.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Headquarters</label>
                                    <input
                                        {...register("location")}
                                        placeholder="City, Country"
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    />
                                    {errors.location && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.location.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Corporate Website</label>
                                    <input
                                        {...register("website")}
                                        placeholder="https://..."
                                        className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    />
                                    {errors.website && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.website.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Company mission & Vision</label>
                                <textarea
                                    {...register("description")}
                                    rows={5}
                                    placeholder="Describe your company culture and mission..."
                                    className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                                />
                                {errors.description && <p className="text-red-500 text-[10px] font-bold ml-2">{errors.description.message}</p>}
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                <button
                                    type="submit"
                                    disabled={saving || !isDirty}
                                    className="h-12 px-10 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : null}
                                    {saving ? "Updating..." : saveSuccess ? "Updated" : "Sync Profile"}
                                </button>
                                <AnimatePresence>
                                    {isDirty && !saving && (
                                        <motion.p
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-[10px] font-black text-orange-500 uppercase tracking-widest"
                                        >
                                            Unsaved Transitions Detected
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>
                        </form>
                    </SectionCard>
                </div>

                {/* Right Rail Settings */}
                <div className="space-y-8">
                    <SectionCard title="Preferences">
                        <SettingRow label="Application Alerts" desc="Email when new candidates apply">
                            <Toggle defaultChecked />
                        </SettingRow>
                        <SettingRow label="Hiring Velocity" desc="Show hiring speed badges on jobs">
                            <Toggle defaultChecked />
                        </SettingRow>
                        <SettingRow label="Candidate Privacy" desc="Blur seeker names until shortlist">
                            <Toggle />
                        </SettingRow>
                    </SectionCard>

                    <SectionCard title="System Management">
                        <div className="p-6 space-y-4">
                            <button className="w-full h-11 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                                <Globe size={14} /> Domain Verification
                            </button>
                            <button className="w-full h-11 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center gap-2">
                                <Trash2 size={14} /> Archive Workspace
                            </button>
                        </div>
                    </SectionCard>

                    <SectionCard title="Security Protocol">
                        <div className="p-6">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Identity Re-verification</p>
                            <button
                                onClick={() => window.location.href = '/auth/forgot-password'}
                                className="w-full h-11 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                            >
                                <Shield size={14} /> Request Password Reset
                            </button>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
