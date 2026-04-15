"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MapPin, Briefcase, Clock } from "lucide-react";
import { getLiveMetrics } from "@/app/actions/metrics";

const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const dummyActivities = [
    { company: "Google", role: "Senior Frontend Engineer", location: "Mountain View, CA", time: "2m ago" },
    { company: "Airbnb", role: "Product Designer", location: "Remote", time: "5m ago" },
    { company: "Meta", role: "Backend Developer", location: "Menlo Park, CA", time: "12m ago" },
    { company: "Spotify", role: "Engineering Manager", location: "New York, NY", time: "18m ago" },
    { company: "Netflix", role: "Fullstack Engineer", location: "Los Gatos, CA", time: "25m ago" },
];

export default function LiveActivity() {
    const [index, setIndex] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [metrics, setMetrics] = useState<{
        activeJobs: number;
        talentProfiles: number;
        recentActivities: Array<{ company: string; role: string; location: string; time: string }>;
    }>({
        activeJobs: 0,
        talentProfiles: 0,
        recentActivities: []
    });

    const displayActivities = metrics.recentActivities.length > 0 ? metrics.recentActivities : (isLoaded ? [] : dummyActivities);

    useEffect(() => {
        const fetchMetrics = async () => {
            const data = await getLiveMetrics();
            if (data) {
                setMetrics({
                    activeJobs: data.activeJobs,
                    talentProfiles: data.talentProfiles,
                    recentActivities: data.recentActivities || []
                });
            }
            setIsLoaded(true);
        };
        fetchMetrics();

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % displayActivities.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [displayActivities.length]);

    return (
        <section className="py-24 bg-white dark:bg-[#020617] relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
                    <div className="lg:max-w-xl">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                            Real-time platform <br />
                            <span className="text-blue-600">engagement.</span>
                        </h2>
                        <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 font-light">
                            See what's happening right now on WorkBridge. Our community is constantly growing and connecting.
                        </p>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                    {isLoaded ? `${metrics.activeJobs.toLocaleString()}` : "12k+"}
                                </div>
                                <div className="text-slate-500 text-sm uppercase tracking-widest font-bold">Active Jobs</div>
                            </div>
                            <div>
                                <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                    {isLoaded ? `${metrics.talentProfiles.toLocaleString()}` : "45k+"}
                                </div>
                                <div className="text-slate-500 text-sm uppercase tracking-widest font-bold">Talent Profiles</div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:max-w-md">
                        <div className="relative h-48 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-4 left-8 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/50">
                                Live Feed
                            </div>

                            <AnimatePresence mode="wait">
                                {displayActivities.length > 0 ? (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className="flex flex-col h-full justify-center pt-4"
                                    >
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-xl font-black text-blue-600 shadow-sm">
                                                {displayActivities[index]?.company?.[0] || "W"}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{displayActivities[index]?.company}</div>
                                                <div className="text-sm text-slate-500">{displayActivities[index]?.role}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-blue-500/50" />
                                                {displayActivities[index]?.location}
                                            </div>
                                            <div className="flex items-center gap-1.5 ml-auto">
                                                <Clock size={14} className="text-blue-500/50" />
                                                {displayActivities[index]?.time && displayActivities[index].time.includes("ago")
                                                    ? displayActivities[index].time
                                                    : displayActivities[index]?.time
                                                        ? formatTimeAgo(displayActivities[index].time)
                                                        : "Just now"}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : isLoaded ? (
                                    <div className="flex flex-col h-full justify-center items-center text-slate-400 text-sm">
                                        No recent activities.
                                    </div>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
