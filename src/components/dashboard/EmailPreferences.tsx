"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SectionCard } from "@/components/dashboard/ui";
import { toast } from "sonner";

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
    return (
        <label className={`relative inline-flex cursor-pointer items-center ${disabled ? 'opacity-50' : ''}`}>
            <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
            <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#16324f] peer-checked:after:translate-x-full dark:bg-slate-700" />
        </label>
    );
}

export function EmailPreferences() {
    const [preferences, setPreferences] = useState({
        marketing: true,
        job_alerts: true,
        application_updates: true,
        weekly_digest: true,
        payment_notifications: true,
        security_alerts: true,
        profile_view_notifications: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch("/api/user/preferences")
            .then((res) => res.json())
            .then((data) => {
                if (!data.error) {
                    setPreferences({
                        marketing: data.marketing ?? true,
                        job_alerts: data.job_alerts ?? true,
                        application_updates: data.application_updates ?? true,
                        weekly_digest: data.weekly_digest ?? true,
                        payment_notifications: data.payment_notifications ?? true,
                        security_alerts: data.security_alerts ?? true,
                        profile_view_notifications: data.profile_view_notifications ?? true,
                    });
                }
            })
            .catch((e) => { console.error(e); })
            .finally(() => setLoading(false));
    }, []);

    const handleToggle = async (key: keyof typeof preferences, value: boolean) => {
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);
        setSaving(true);
        
        try {
            const res = await fetch("/api/user/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPreferences),
            });
            if (!res.ok) throw new Error("Failed to save");
            toast.success("Preferences updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update preferences");
            // Revert on failure
            setPreferences(preferences);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SectionCard title="User Preferences">
                <div className="flex p-6 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
            </SectionCard>
        );
    }

    return (
        <SectionCard title="User Preferences">
            <div className="space-y-8 p-6">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Email Notifications</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Job Alerts</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Get notified when new jobs match your saved search criteria.</p>
                            </div>
                            <Toggle checked={preferences.job_alerts} onChange={(val) => handleToggle("job_alerts", val)} disabled={saving} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Weekly Digest</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">A weekly summary of the best candidate matches for your roles.</p>
                            </div>
                            <Toggle checked={preferences.weekly_digest} onChange={(val) => handleToggle("weekly_digest", val)} disabled={saving} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Marketing & News</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Occasional updates on new features and Aganyu news.</p>
                            </div>
                            <Toggle checked={preferences.marketing} onChange={(val) => handleToggle("marketing", val)} disabled={saving} />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">In-App Notifications</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Application Updates</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Notifications when your applications or jobs change status.</p>
                            </div>
                            <Toggle checked={preferences.application_updates} onChange={(val) => handleToggle("application_updates", val)} disabled={saving} />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Payments & Rewards</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Get notified about payment successes and referral bonuses.</p>
                            </div>
                            <Toggle checked={preferences.payment_notifications} onChange={(val) => handleToggle("payment_notifications", val)} disabled={saving} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Security & System</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Important system warnings and security alerts.</p>
                            </div>
                            <Toggle checked={preferences.security_alerts} onChange={(val) => handleToggle("security_alerts", val)} disabled={saving} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile Views</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Be notified when someone views your professional profile.</p>
                            </div>
                            <Toggle checked={preferences.profile_view_notifications} onChange={(val) => handleToggle("profile_view_notifications", val)} disabled={saving} />
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}
