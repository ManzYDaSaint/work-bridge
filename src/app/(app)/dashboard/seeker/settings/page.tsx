"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { User, Bell, Shield, Palette, Save } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="max-w-4xl space-y-12">
            <header>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Control Center</h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Architect your experience</p>
            </header>

            <div className="grid gap-8">
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
                                placeholder="seeker@example.com"
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Privacy Level</label>
                            <select className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all">
                                <option>Visible to verified employers only</option>
                                <option>Public profile</option>
                                <option>Incognito mode</option>
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
                        {[
                            { label: "New Job Alerts", desc: "Pulse notifications for roles matching your tech stack", defaultChecked: true },
                            { label: "Application Status Pulse", desc: "Get notified when an employer interacts with your profile", defaultChecked: true },
                            { label: "Marketing Insights", desc: "Occasional updates on career trends and platform features", defaultChecked: false },
                        ].map((setting, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                <div>
                                    <p className="font-black text-slate-900 dark:text-white">{setting.label}</p>
                                    <p className="text-xs text-slate-500 font-bold italic">{setting.desc}</p>
                                </div>
                                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded-full relative p-1 cursor-pointer">
                                    <div className={cn("h-5 w-5 rounded-full shadow-md transition-all", setting.defaultChecked ? "translate-x-5 bg-blue-600" : "bg-white")} />
                                </div>
                            </div>
                        ))}
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
                            onClick={() => window.location.href = '/auth/forgot-password'}
                            className="h-12 px-8 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                            Request Password Reset
                        </button>
                    </div>
                </section>

                <div className="flex justify-end">
                    <button className="h-16 px-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-2xl transition-all hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white active:scale-95 group">
                        Commit Changes
                        <Save size={18} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
