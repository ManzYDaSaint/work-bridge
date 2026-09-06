"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Send, Users, Sparkles, Mail, FileText, Eye, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Audience = "ALL" | "SEEKERS" | "EMPLOYERS" | "PREMIUM_SEEKERS";

const audienceOptions: Array<{ value: Audience; label: string; description: string }> = [
    { value: "ALL", label: "All users", description: "Every active user in the platform." },
    { value: "SEEKERS", label: "Seekers", description: "All job seekers." },
    { value: "EMPLOYERS", label: "Employers", description: "All employer accounts." },
    { value: "PREMIUM_SEEKERS", label: "Premium seekers", description: "Only premium job seekers." },
];

const defaultSubject = "Update your education details for better job matches";
const defaultBody = `Hello {{first_name}},

Your profile is almost ready for better job matches. Please update your Education section with your exact degree or programme, for example “BSc in Information Technology” or “Diploma in Accounting”.

This helps us match you with jobs that fit your qualifications and field of study.

Update your profile here: {{profile_url}}

Best regards,
The Aganyu Team`;

export default function CommunicationsClient({ initialCounts }: { initialCounts: Record<string, number> }) {
    const [audience, setAudience] = useState<Audience>("SEEKERS");
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [testEmail, setTestEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [previewCount, setPreviewCount] = useState(initialCounts[audience] ?? 0);
    const [previewRecipients, setPreviewRecipients] = useState<Array<{ email: string; first_name: string }>>([]);
    const [result, setResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);

    const draftKey = "aganyu-admin-communications-draft";

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.subject) setSubject(parsed.subject);
                if (parsed.body) setBody(parsed.body);
                if (parsed.audience) setAudience(parsed.audience);
                if (parsed.testEmail) setTestEmail(parsed.testEmail);
            }
        } catch {
            // Ignore malformed local storage payloads.
        }
    }, []);

    useEffect(() => {
        const draft = { audience, subject, body, testEmail };
        try {
            window.localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch {
            // Ignore storage errors silently.
        }
    }, [audience, subject, body, testEmail]);

    const fetchPreview = async (nextAudience: Audience = audience) => {
        try {
            const data = await apiFetchJson<{ count: number; recipients: Array<{ email: string; first_name: string }> }>(`/api/admin/communications?audience=${nextAudience}&limit=5`);
            setPreviewCount(data.count ?? 0);
            setPreviewRecipients(data.recipients ?? []);
        } catch {
            setPreviewCount(initialCounts[nextAudience] ?? 0);
            setPreviewRecipients([]);
        }
    };

    useEffect(() => {
        void fetchPreview(audience);
    }, [audience]);

    const selectedAudienceMeta = useMemo(
        () => audienceOptions.find((option) => option.value === audience) ?? audienceOptions[0],
        [audience]
    );

    const handleSend = async (mode: "send" | "test") => {
        if (!subject.trim() || !body.trim()) {
            toast.error("Subject and email body are required.");
            return;
        }

        if (mode === "send") {
            if (previewCount <= 0) {
                toast.error("There are no recipients in this audience. Pick a different audience or adjust the filters.");
                return;
            }

            const shouldConfirm = previewCount >= 25;
            if (shouldConfirm) {
                const confirmed = window.confirm(
                    `You are about to send ${previewCount} personalized emails to ${selectedAudienceMeta.label}. This is a bulk campaign and should only be done after checking the message and audience. Continue?`
                );

                if (!confirmed) {
                    toast.info("Bulk send cancelled.");
                    return;
                }
            }
        }

        if (mode === "test") {
            if (!testEmail.trim() || !testEmail.includes("@")) {
                toast.error("Please enter a valid test email address.");
                return;
            }
        }

        setSending(true);
        setResult(null);

        try {
            const payload = {
                audience,
                subject,
                body,
                mode,
                testEmail: mode === "test" ? testEmail || undefined : undefined,
            };

            const data = await apiFetchJson<{ sent: number; failed: number; skipped: number; total: number; preview: string[] }>("/api/admin/communications", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            toast.success(mode === "test" ? "Test email sent." : `Campaign sent to ${data.total} recipients.`);
            setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0, skipped: data.skipped ?? 0 });

            if (mode === "send") {
                void fetchPreview(audience);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to send the email campaign.");
        } finally {
            setSending(false);
        }
    };

    const resetDraft = () => {
        setAudience("SEEKERS");
        setSubject(defaultSubject);
        setBody(defaultBody);
        setTestEmail("");
        try {
            window.localStorage.removeItem(draftKey);
        } catch {
            // Ignore local storage errors.
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Communications"
                subtitle="Draft and send personalized emails to selected users, seekers, employers, or premium accounts."
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
                <div className="space-y-6">
                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Audience</p>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Who should receive this message?</h3>
                            </div>
                            <Badge label={`${previewCount} recipients`} variant="blue" />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {audienceOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setAudience(option.value)}
                                    className={`rounded-2xl border p-4 text-left transition-all ${
                                        audience === option.value
                                            ? "border-[#16324f] bg-[#16324f]/5 dark:border-slate-200 dark:bg-slate-800"
                                            : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                                    }`}
                                >
                                    <p className="font-semibold text-slate-900 dark:text-white">{option.label}</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Draft email</p>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Message content</h3>
                            </div>
                            <button type="button" onClick={resetDraft} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                <Save size={14} /> Reset draft
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Subject</label>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                    placeholder="Update your education details for better job matches"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Body</label>
                                <textarea
                                    rows={12}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                />
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                                Merge tags supported: <span className="font-semibold">{'{{first_name}}'}</span>, <span className="font-semibold">{'{{profile_url}}'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="space-y-6">
                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="mb-4 flex items-center gap-2">
                            <Eye size={16} className="text-slate-500" />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Preview</h3>
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {selectedAudienceMeta.description}
                        </p>

                        <div className="mt-4 space-y-2">
                            {previewRecipients.length > 0 ? previewRecipients.map((recipient) => (
                                <div key={recipient.email} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{recipient.first_name || "User"}</p>
                                    <p>{recipient.email}</p>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400">No preview recipients available for this audience.</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="mb-4 flex items-center gap-2">
                            <Mail size={16} className="text-slate-500" />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Send test</h3>
                        </div>
                        <input
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        <button
                            type="button"
                            onClick={() => void handleSend("test")}
                            disabled={sending}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                            <Sparkles size={14} /> Send test email
                        </button>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="mb-4 flex items-center gap-2">
                            <Send size={16} className="text-slate-500" />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Send campaign</h3>
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleSend("send")}
                            disabled={sending}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                            {sending ? <Mail size={14} className="animate-pulse" /> : <Send size={14} />} 
                            {sending ? "Sending..." : `Send to ${previewCount} recipients`}
                        </button>

                        {result && (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                                <div className="flex items-center gap-2 font-semibold">
                                    <CheckCircle2 size={14} /> Campaign summary
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p>Sent: {result.sent}</p>
                                    <p>Failed: {result.failed}</p>
                                    <p>Skipped: {result.skipped}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
