"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiFetchJson } from "@/lib/api";
import { Employer } from "@/types";
import { MapPin, CheckCircle, Save, Sparkles, Building2, ExternalLink, Edit3, Briefcase, Clock, X, Plus, Trash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

export default function EmployerProfile() {
    const [profile, setProfile] = useState<Employer | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const fetchProfile = async () => {
        try {
            const res = await apiFetch("/api/employer/profile");
            const data: Employer = await res.json();
            setProfile(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfile(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSaving(true);
        try {
            await apiFetchJson("/api/employer/profile", {
                method: "PUT",
                body: JSON.stringify({
                    companyName: profile.companyName,
                    industry: profile.industry,
                    location: profile.location,
                    website: profile.website,
                    description: profile.description,
                }),
            });
            await fetchProfile();
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full shadow-2xl shadow-blue-500/20"
            />
        </div>
    );

    if (!profile) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-24">
            {/* Header Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-effect p-10 md:p-14 rounded-[3.5rem] border border-slate-200 dark:border-slate-800/50 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] -z-10" />
                <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14">
                    <div className="relative group">
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-[3rem] bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white text-6xl font-black shadow-2xl shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-500">
                            {profile.companyName?.[0] ?? "C"}
                        </div>
                        {profile.status === "APPROVED" && (
                            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-green-500 shadow-xl border border-slate-100 dark:border-slate-700">
                                <CheckCircle size={32} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                {profile.companyName || "Organization Unnamed"}
                            </h2>
                            <button onClick={() => setEditing(!editing)} className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors shadow-sm self-center md:self-auto">
                                <Edit3 size={20} />
                            </button>
                        </div>
                        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
                            {profile.description || "Building the industry elite. Define your organizational mission to attract the world's most capable professionals."}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                            <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
                                <MapPin size={18} className="text-blue-500" />
                                {profile.location || "Central Operations"}
                            </div>
                            <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
                                <Building2 size={18} className="text-indigo-500" />
                                {profile.industry || "Market Pioneer"}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="space-y-12">
                {editing ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-effect p-10 rounded-[3rem] border border-blue-500/30 shadow-2xl space-y-8"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Organization Editor</h3>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setEditing(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all">
                                    {saving ? "Updating..." : "Commit Entity Changes"}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Company Name</label>
                                <input
                                    value={profile.companyName}
                                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                                    className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Industry Sector</label>
                                <input
                                    value={profile.industry || ""}
                                    onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                                    className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">HQ Location</label>
                                <input
                                    value={profile.location || ""}
                                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                    className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Corporate Website</label>
                                <input
                                    value={profile.website || ""}
                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                    className="w-full h-16 px-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mission Statement</label>
                                <textarea
                                    rows={5}
                                    value={profile.description || ""}
                                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                                    className="w-full p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                                />
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-effect p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-xl"
                    >
                        <div className="flex justify-between items-center mb-8 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                            <h3>Entity Overview</h3>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                {profile.description || "The organization's mission has not been articulated yet."}
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
