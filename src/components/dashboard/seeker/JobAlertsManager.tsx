"use client";

import { useState, useEffect } from "react";
import { Bell, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface JobAlert {
    id: string;
    keywords: string | null;
    location: string | null;
    job_type: string | null;
    work_mode: string | null;
    frequency: string;
}

export default function JobAlertsManager() {
    const [alerts, setAlerts] = useState<JobAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form state
    const [keywords, setKeywords] = useState("");
    const [location, setLocation] = useState("");
    const [frequency, setFrequency] = useState("WEEKLY");

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await apiFetch("/api/seeker/job-alerts");
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        } catch (error) {
            console.error("Failed to fetch alerts", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!keywords && !location) {
            toast.error("Please provide either keywords or a location.");
            return;
        }

        setIsCreating(true);
        try {
            const res = await apiFetch("/api/seeker/job-alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keywords, location, frequency }),
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                toast.success("Job alert created!");
                setAlerts([data.alert, ...alerts]);
                setKeywords("");
                setLocation("");
            } else {
                toast.error(data.error || "Failed to create alert");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await apiFetch(`/api/seeker/job-alerts?id=${id}`, {
                method: "DELETE",
            });
            
            if (res.ok) {
                setAlerts(alerts.filter(a => a.id !== id));
                toast.success("Alert deleted");
            } else {
                toast.error("Failed to delete alert");
            }
        } catch (error) {
            toast.error("Something went wrong");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <Bell className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Job Alerts</h2>
                    <p className="text-sm text-slate-500">Get notified when new jobs match your criteria.</p>
                </div>
            </div>

            {alerts.length < 5 ? (
                <form onSubmit={handleCreateAlert} className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Create New Alert</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <input
                                type="text"
                                placeholder="Keywords (e.g. Developer, Sales)"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Location (e.g. Blantyre, Remote)"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-4">
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                            </select>
                            
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Save Alert
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
                    You have reached the maximum limit of 5 job alerts. Please delete one to create a new one.
                </div>
            )}

            <div className="space-y-3">
                {alerts.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-4">You haven't created any alerts yet.</p>
                ) : (
                    alerts.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                    {alert.keywords || "Any Role"} {alert.location ? `in ${alert.location}` : ""}
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    {alert.frequency === "DAILY" ? "Daily" : "Weekly"} updates
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(alert.id)}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                                aria-label="Delete alert"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
