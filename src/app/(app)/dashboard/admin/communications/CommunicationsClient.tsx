"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Send, Sparkles, Mail, Eye, Save, CheckCircle2, MessageSquare, Phone, Crown, RefreshCw, UserCheck, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Audience = "ALL" | "SEEKERS" | "EMPLOYERS" | "PREMIUM_SEEKERS";
type Channel = "EMAIL" | "WHATSAPP" | "BOTH";

const audienceOptions: Array<{ value: Audience; label: string; description: string }> = [
    { value: "ALL", label: "All users", description: "Every active user in the platform." },
    { value: "SEEKERS", label: "Seekers", description: "All job seekers." },
    { value: "EMPLOYERS", label: "Employers", description: "All employer accounts." },
    { value: "PREMIUM_SEEKERS", label: "Premium seekers", description: "Only active premium job seekers with phone numbers." },
];

const channelOptions: Array<{ value: Channel; label: string; description: string; icon: any }> = [
    { value: "EMAIL", label: "Email Only", description: "Deliver via Resend email service.", icon: Mail },
    { value: "WHATSAPP", label: "WhatsApp Only", description: "Deliver personalized WhatsApp messages (Premium Seekers).", icon: MessageSquare },
    { value: "BOTH", label: "Both Email & WhatsApp", description: "Maximize reach across both Email and WhatsApp channels.", icon: Sparkles },
];

const defaultSubject = "Update your education details for better job matches";
const defaultBody = `Hello {{first_name}},

Your profile is almost ready for better job matches. Please update your Education section with your exact degree or programme, for example “BSc in Information Technology” or “Diploma in Accounting”.

This helps us match you with jobs that fit your qualifications and field of study.

Update your profile here: {{profile_url}}

Best regards,
The Aganyu Team`;

export default function CommunicationsClient({ initialCounts }: { initialCounts: Record<string, number> }) {
    const [activeTab, setActiveTab] = useState<"BROADCAST" | "INBOX">("BROADCAST");
    const [audience, setAudience] = useState<Audience>("PREMIUM_SEEKERS");
    const [channel, setChannel] = useState<Channel>("BOTH");
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [testEmail, setTestEmail] = useState("");
    const [testPhone, setTestPhone] = useState("");
    const [sending, setSending] = useState(false);
    
    // Telemetry & Preview
    const [previewCount, setPreviewCount] = useState(initialCounts[audience] ?? 0);
    const [whatsappCount, setWhatsappCount] = useState(0);
    const [premiumCount, setPremiumCount] = useState(0);
    const [previewRecipients, setPreviewRecipients] = useState<Array<{ email: string; first_name: string; phone?: string; is_premium?: boolean }>>([]);
    const [result, setResult] = useState<{ sentEmail: number; failedEmail: number; sentWhatsApp: number; failedWhatsApp: number; skippedWhatsApp: number; total: number } | null>(null);

    // Live WhatsApp Inbox State
    const [conversations, setConversations] = useState<Array<any>>([]);
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    const draftKey = "aganyu-admin-communications-draft";

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.subject) setSubject(parsed.subject);
                if (parsed.body) setBody(parsed.body);
                if (parsed.audience) setAudience(parsed.audience);
                if (parsed.channel) setChannel(parsed.channel);
                if (parsed.testEmail) setTestEmail(parsed.testEmail);
                if (parsed.testPhone) setTestPhone(parsed.testPhone);
            }
        } catch {
            // Ignore storage errors.
        }
    }, []);

    useEffect(() => {
        const draft = { audience, channel, subject, body, testEmail, testPhone };
        try {
            window.localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch {
            // Ignore storage errors.
        }
    }, [audience, channel, subject, body, testEmail, testPhone]);

    const fetchPreview = async (nextAudience: Audience = audience) => {
        try {
            const data = await apiFetchJson<{
                count: number;
                whatsappCount: number;
                premiumCount: number;
                recipients: Array<{ email: string; first_name: string; phone?: string; is_premium?: boolean }>;
                conversations?: Array<any>;
            }>(`/api/admin/communications?audience=${nextAudience}&limit=6`);

            setPreviewCount(data.count ?? 0);
            setWhatsappCount(data.whatsappCount ?? 0);
            setPremiumCount(data.premiumCount ?? 0);
            setPreviewRecipients(data.recipients ?? []);
            if (data.conversations) {
                setConversations(data.conversations);
                if (data.conversations.length > 0 && !selectedPhone) {
                    setSelectedPhone(data.conversations[0].phone);
                }
            }
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

    const activeConversation = useMemo(
        () => conversations.find((c) => c.phone === selectedPhone) || conversations[0] || null,
        [conversations, selectedPhone]
    );

    const targetCount = useMemo(
        () => (channel === "WHATSAPP" ? whatsappCount : previewCount),
        [channel, whatsappCount, previewCount]
    );

    const handleSend = async (mode: "send" | "test") => {
        if (!subject.trim() || !body.trim()) {
            toast.error("Subject and message body are required.");
            return;
        }

        if (mode === "send") {
            if (targetCount <= 0) {
                if (channel === "WHATSAPP") {
                    toast.error(`There are no recipients with registered WhatsApp numbers in "${selectedAudienceMeta.label}". Try selecting "Email Only" or "Both".`);
                } else {
                    toast.error("There are no recipients in this audience. Pick a different audience.");
                }
                return;
            }

            const shouldConfirm = targetCount >= 25;
            if (shouldConfirm) {
                const confirmed = window.confirm(
                    `You are about to send a campaign via ${channel} to ${targetCount} recipients in ${selectedAudienceMeta.label}. Continue?`
                );
                if (!confirmed) {
                    toast.info("Bulk campaign cancelled.");
                    return;
                }
            }
        }

        if (mode === "test") {
            if ((channel === "EMAIL" || channel === "BOTH") && (!testEmail.trim() || !testEmail.includes("@"))) {
                toast.error("Please enter a valid test email address.");
                return;
            }
            if ((channel === "WHATSAPP" || channel === "BOTH") && !testPhone.trim()) {
                toast.error("Please enter a valid test WhatsApp phone number.");
                return;
            }
        }

        setSending(true);
        setResult(null);

        try {
            const payload = {
                audience,
                channel,
                subject,
                body,
                mode,
                testEmail: mode === "test" ? testEmail || undefined : undefined,
                testPhone: mode === "test" ? testPhone || undefined : undefined,
            };

            const data = await apiFetchJson<{
                sentEmail: number;
                failedEmail: number;
                sentWhatsApp: number;
                failedWhatsApp: number;
                skippedWhatsApp: number;
                total: number;
            }>("/api/admin/communications", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            toast.success(
                mode === "test"
                    ? "Test campaign sent successfully!"
                    : `Campaign dispatched to ${data.total} recipients.`
            );

            setResult({
                sentEmail: data.sentEmail ?? 0,
                failedEmail: data.failedEmail ?? 0,
                sentWhatsApp: data.sentWhatsApp ?? 0,
                failedWhatsApp: data.failedWhatsApp ?? 0,
                skippedWhatsApp: data.skippedWhatsApp ?? 0,
                total: data.total ?? 0,
            });

            if (mode === "send") {
                void fetchPreview(audience);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to dispatch the campaign.");
        } finally {
            setSending(false);
        }
    };

    const handleSendLiveReply = async () => {
        if (!activeConversation || !replyText.trim()) {
            toast.error("Please enter a message to reply.");
            return;
        }

        setSendingReply(true);

        try {
            await apiFetchJson("/api/admin/communications", {
                method: "POST",
                body: JSON.stringify({
                    mode: "reply",
                    replyPhone: activeConversation.phone,
                    replyText: replyText.trim()
                })
            });

            toast.success(`WhatsApp reply sent to ${activeConversation.first_name || activeConversation.phone}`);
            
            // Append message locally for instant UI response
            const newMessage = {
                id: Date.now().toString(),
                phone: activeConversation.phone,
                direction: "OUTBOUND",
                message_text: replyText.trim(),
                created_at: new Date().toISOString()
            };

            setConversations((prev) =>
                prev.map((c) =>
                    c.phone === activeConversation.phone
                        ? {
                              ...c,
                              last_message: replyText.trim(),
                              updated_at: newMessage.created_at,
                              messages: [newMessage, ...(c.messages || [])]
                          }
                        : c
                )
            );

            setReplyText("");
        } catch (err: any) {
            toast.error(err.message || "Failed to send WhatsApp reply.");
        } finally {
            setSendingReply(false);
        }
    };

    const resetDraft = () => {
        setAudience("PREMIUM_SEEKERS");
        setChannel("BOTH");
        setSubject(defaultSubject);
        setBody(defaultBody);
        setTestEmail("");
        setTestPhone("");
        try {
            window.localStorage.removeItem(draftKey);
        } catch {
            // Ignore storage errors
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Communications & Messaging Hub"
                subtitle="Send personalized Email & WhatsApp messages to Seekers, Employers, or Premium accounts, and manage 2-way WhatsApp user replies."
            />

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => setActiveTab("BROADCAST")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        activeTab === "BROADCAST"
                            ? "bg-[#16324f] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white/80 text-slate-600 hover:bg-stone-100 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                    <Send size={15} /> Broadcast Campaigns
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("INBOX")}
                    className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        activeTab === "INBOX"
                            ? "bg-[#16324f] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white/80 text-slate-600 hover:bg-stone-100 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                    <MessageCircle size={15} className="text-emerald-500" /> Live WhatsApp Inbox
                    {conversations.length > 0 && (
                        <span className="ml-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
                            {conversations.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === "BROADCAST" ? (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
                    <div className="space-y-6">
                        {/* Channel Selector */}
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="mb-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Delivery Channel</p>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">How should this communication be sent?</h3>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                {channelOptions.map((opt) => {
                                    const IconComp = opt.icon;
                                    const isSelected = channel === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setChannel(opt.value)}
                                            className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                                                isSelected
                                                    ? "border-[#16324f] bg-[#16324f]/5 dark:border-slate-200 dark:bg-slate-800"
                                                    : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <IconComp size={18} className={opt.value === "WHATSAPP" ? "text-emerald-500" : "text-blue-500"} />
                                                    <p className="font-semibold text-slate-900 dark:text-white">{opt.label}</p>
                                                </div>
                                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
                                            </div>

                                            {opt.value === "WHATSAPP" && (
                                                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Crown size={12} /> Premium Priority
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Audience Selector */}
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Audience</p>
                                    <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Who should receive this message?</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge label={`${previewCount} Total`} variant="blue" />
                                    <Badge label={`${whatsappCount} WhatsApp`} variant="green" />
                                </div>
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
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-slate-900 dark:text-white">{option.label}</p>
                                            {option.value === "PREMIUM_SEEKERS" && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                    PREMIUM
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message Composition Form */}
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Campaign Content</p>
                                    <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Draft personalized message</h3>
                                </div>
                                <button type="button" onClick={resetDraft} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    <Save size={14} /> Reset draft
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Subject / WhatsApp Heading</label>
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
                                        rows={10}
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
                        {/* Preview Panel */}
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye size={16} className="text-slate-500" />
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Audience Preview</h3>
                                </div>
                                <button type="button" onClick={() => void fetchPreview(audience)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <RefreshCw size={14} />
                                </button>
                            </div>

                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {selectedAudienceMeta.description}
                            </p>

                            <div className="mt-4 space-y-2">
                                {previewRecipients.length > 0 ? previewRecipients.map((recipient, idx) => (
                                    <div key={idx} className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">{recipient.first_name || "User"}</p>
                                            {recipient.is_premium && (
                                                <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                                    <Crown size={10} /> Premium
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1">{recipient.email}</p>
                                        {recipient.phone ? (
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                <Phone size={10} /> {recipient.phone}
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-[11px] text-slate-400 font-normal">No WhatsApp phone registered</p>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-400">No preview recipients available for this audience.</p>
                                )}
                            </div>
                        </div>

                        {/* Send Test Section */}
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="mb-3 flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-500" />
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Send test</h3>
                            </div>

                            <div className="space-y-3">
                                {(channel === "EMAIL" || channel === "BOTH") && (
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold text-slate-400">Test Email</label>
                                        <input
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            placeholder="admin@aganyu.com"
                                            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                        />
                                    </div>
                                )}

                                {(channel === "WHATSAPP" || channel === "BOTH") && (
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold text-slate-400">Test WhatsApp Phone</label>
                                        <input
                                            value={testPhone}
                                            onChange={(e) => setTestPhone(e.target.value)}
                                            placeholder="+265 999 123 456"
                                            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                        />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => void handleSend("test")}
                                    disabled={sending}
                                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                >
                                    <Sparkles size={13} /> Send test preview
                                </button>
                            </div>
                        </div>

                        {/* Dispatch Campaign */}
                        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="mb-4 flex items-center gap-2">
                                <Send size={16} className="text-slate-500" />
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Dispatch Campaign</h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleSend("send")}
                                disabled={sending || targetCount <= 0}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 shadow-md"
                            >
                                {sending ? <Mail size={14} className="animate-pulse" /> : <Send size={14} />} 
                                {sending ? "Dispatching..." : `Send via ${channel} to ${targetCount} recipient${targetCount === 1 ? "" : "s"}`}
                            </button>

                            {result && (
                                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <CheckCircle2 size={14} /> Dispatch Telemetry Summary
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {(channel === "EMAIL" || channel === "BOTH") && (
                                            <p>Emails Sent: <span className="font-bold">{result.sentEmail}</span> (Failed: {result.failedEmail})</p>
                                        )}
                                        {(channel === "WHATSAPP" || channel === "BOTH") && (
                                            <p>WhatsApp Sent: <span className="font-bold">{result.sentWhatsApp}</span> (Failed: {result.failedWhatsApp}, Skipped: {result.skippedWhatsApp})</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            ) : (
                /* Live 2-Way WhatsApp Inbox View */
                <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    {/* Left Conversations List */}
                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Seeker WhatsApp Threads</h3>
                            <button type="button" onClick={() => void fetchPreview(audience)} className="text-slate-400 hover:text-slate-600">
                                <RefreshCw size={14} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {conversations.length > 0 ? (
                                conversations.map((conv) => {
                                    const isSelected = selectedPhone === conv.phone;
                                    return (
                                        <button
                                            key={conv.phone}
                                            type="button"
                                            onClick={() => setSelectedPhone(conv.phone)}
                                            className={`w-full rounded-xl border p-3 text-left transition-all ${
                                                isSelected
                                                    ? "border-emerald-500 bg-emerald-50/60 dark:border-emerald-600 dark:bg-emerald-950/40"
                                                    : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-slate-900 dark:text-white">{conv.first_name || conv.phone}</p>
                                                {conv.is_premium && (
                                                    <Crown size={12} className="text-amber-500" />
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-slate-500 font-mono">{conv.phone}</p>
                                            <p className="mt-1 line-clamp-1 text-xs text-slate-600 dark:text-slate-300">{conv.last_message}</p>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="p-4 text-center text-xs text-slate-400">
                                    No incoming WhatsApp replies yet. Outbound broadcasts with user replies will appear here in real-time.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Active Conversation Chat Thread */}
                    <div className="flex flex-col rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70 min-h-[500px]">
                        {activeConversation ? (
                            <>
                                <div className="border-b border-stone-200 pb-4 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {activeConversation.first_name || "Seeker"}
                                        </h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Phone size={12} className="text-emerald-500" /> {activeConversation.phone}
                                        </p>
                                    </div>
                                    {activeConversation.is_premium && (
                                        <Badge label="Premium Seeker" variant="yellow" />
                                    )}
                                </div>

                                {/* Chat Messages Container */}
                                <div className="flex-1 space-y-3 overflow-y-auto py-6">
                                    {[...(activeConversation.messages || [])].reverse().map((msg: any, i: number) => {
                                        const isInbound = msg.direction === "INBOUND";
                                        return (
                                            <div
                                                key={i}
                                                className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                                            >
                                                <div
                                                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs shadow-sm ${
                                                        isInbound
                                                            ? "bg-stone-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                                            : "bg-emerald-600 text-white dark:bg-emerald-700"
                                                    }`}
                                                >
                                                    <p className="whitespace-pre-wrap">{msg.message_text}</p>
                                                    <p
                                                        className={`mt-1 text-[10px] ${
                                                            isInbound ? "text-slate-400" : "text-emerald-100"
                                                        }`}
                                                    >
                                                        {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 2-Way Reply Box */}
                                <div className="border-t border-stone-200 pt-4 dark:border-slate-800">
                                    <div className="flex gap-2">
                                        <input
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    void handleSendLiveReply();
                                                }
                                            }}
                                            placeholder="Type direct WhatsApp message to seeker..."
                                            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => void handleSendLiveReply()}
                                            disabled={sendingReply || !replyText.trim()}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                        >
                                            <Send size={15} /> Send
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                                <MessageCircle size={32} className="text-slate-300 dark:text-slate-700" />
                                <p className="mt-2 text-sm">Select a conversation on the left to view messages and respond.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
