"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { PageHeader, Badge } from "@/components/dashboard/ui";
import { Send, Sparkles, Mail, Eye, Save, CheckCircle2, MessageSquare, Phone, Crown, RefreshCw, MessageCircle, CheckCheck, XCircle, Clock } from "lucide-react";
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

const defaultEmailSubject = "Update your education details for better job matches";
const defaultEmailBody = `Hello {{first_name}},

Your profile is almost ready for better job matches. Please update your Education section with your exact degree or programme, for example “BSc in Information Technology” or “Diploma in Accounting”.

This helps us match you with jobs that fit your qualifications and field of study.

Update your profile here: {{profile_url}}

Best regards,
The Aganyu Team`;

const defaultWhatsappHeading = "Update Education Details";
const defaultWhatsappBody = `Your profile is almost ready for better job matches. Please update your Education section with your exact degree or qualification.

Tap the button below to review and update your profile!`;

// Delivery status badge for outbound messages in the Live Inbox chat thread.
// Status is sourced from whatsapp_messages.status, updated in real-time by the webhook handler.
function DeliveryStatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    const s = status.toUpperCase();
    if (s === "DELIVERED") return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-200">
            <CheckCheck size={11} /> Delivered
        </span>
    );
    if (s === "FAILED") return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-300">
            <XCircle size={11} /> Failed
        </span>
    );
    // SENT = accepted by Meta (template queued for delivery)
    return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-100/70">
            <Clock size={10} /> Sent
        </span>
    );
}

export default function CommunicationsClient({ initialCounts }: { initialCounts: Record<string, number> }) {
    const [activeTab, setActiveTab] = useState<"BROADCAST" | "HISTORY" | "INBOX">("BROADCAST");
    const [audience, setAudience] = useState<Audience>("PREMIUM_SEEKERS");
    const [channel, setChannel] = useState<Channel>("BOTH");
    
    // Separate drafts for Email and WhatsApp
    const [emailSubject, setEmailSubject] = useState(defaultEmailSubject);
    const [emailBody, setEmailBody] = useState(defaultEmailBody);
    const [whatsappHeading, setWhatsappHeading] = useState(defaultWhatsappHeading);
    const [whatsappBody, setWhatsappBody] = useState(defaultWhatsappBody);
    const [activeDraftTab, setActiveDraftTab] = useState<"EMAIL" | "WHATSAPP">("EMAIL");

    const [testEmail, setTestEmail] = useState("");
    const [testPhone, setTestPhone] = useState("");
    const [sending, setSending] = useState(false);
    
    // Telemetry & Preview
    const [previewCount, setPreviewCount] = useState(initialCounts[audience] ?? 0);
    const [whatsappCount, setWhatsappCount] = useState(0);
    const [premiumCount, setPremiumCount] = useState(0);
    const [previewRecipients, setPreviewRecipients] = useState<Array<{ email: string; first_name: string; phone?: string; is_premium?: boolean }>>([]);
    const [result, setResult] = useState<{ sentEmail: number; failedEmail: number; sentWhatsApp: number; failedWhatsApp: number; skippedWhatsApp: number; total: number } | null>(null);
    const [campaignHistory, setCampaignHistory] = useState<Array<any>>([]);

    // UI Tabs & Modals
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewTab, setPreviewTab] = useState<"EDITOR" | "WHATSAPP_PREVIEW">("EDITOR");

    // Live WhatsApp Inbox State
    const [conversations, setConversations] = useState<Array<any>>([]);
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    const draftKey = "aganyu-admin-communications-draft-v3";

    const insertEmailTag = (tag: string) => {
        setEmailBody((prev) => `${prev} ${tag}`);
    };

    const insertWhatsappTag = (tag: string) => {
        setWhatsappBody((prev) => `${prev} ${tag}`);
    };

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.emailSubject) setEmailSubject(parsed.emailSubject);
                if (parsed.emailBody) setEmailBody(parsed.emailBody);
                if (parsed.whatsappHeading) setWhatsappHeading(parsed.whatsappHeading);
                if (parsed.whatsappBody) setWhatsappBody(parsed.whatsappBody);
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
        const draft = { audience, channel, emailSubject, emailBody, whatsappHeading, whatsappBody, testEmail, testPhone };
        try {
            window.localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch {
            // Ignore storage errors.
        }
    }, [audience, channel, emailSubject, emailBody, whatsappHeading, whatsappBody, testEmail, testPhone]);

    const fetchPreview = async (nextAudience: Audience = audience) => {
        try {
            const data = await apiFetchJson<{
                count: number;
                whatsappCount: number;
                premiumCount: number;
                recipients: Array<{ email: string; first_name: string; phone?: string; is_premium?: boolean }>;
                conversations?: Array<any>;
                history?: Array<any>;
            }>(`/api/admin/communications?audience=${nextAudience}&limit=6`);

            setPreviewCount(data.count ?? 0);
            setWhatsappCount(data.whatsappCount ?? 0);
            setPremiumCount(data.premiumCount ?? 0);
            setPreviewRecipients(data.recipients ?? []);
            if (data.history) {
                setCampaignHistory(data.history);
            }
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

    // Campaign detail modal & recipient drill-down
    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
    const [campaignRecipients, setCampaignRecipients] = useState<Array<any>>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);

    // Supabase Realtime Listener for Instant Live Inbox & Campaign status updates
    useEffect(() => {
        const supabase = createBrowserSupabaseClient();
        if (!supabase) return;

        const channel = supabase
            .channel("realtime-communications")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "whatsapp_messages" },
                () => {
                    void fetchPreview(audience);
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "campaign_broadcasts" },
                () => {
                    void fetchPreview(audience);
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [audience]);

    const fetchCampaignRecipients = async (broadcastId: string) => {
        setLoadingRecipients(true);
        try {
            const data = await apiFetchJson<{ recipients: Array<any> }>(
                `/api/admin/communications?broadcastId=${broadcastId}`
            );
            setCampaignRecipients(data.recipients || []);
        } catch {
            setCampaignRecipients([]);
        } finally {
            setLoadingRecipients(false);
        }
    };

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
        if (channel === "EMAIL" || channel === "BOTH") {
            if (!emailSubject.trim() || !emailBody.trim()) {
                toast.error("Email Subject and Message Body are required.");
                return;
            }
        }

        if (channel === "WHATSAPP" || channel === "BOTH") {
            if (!whatsappBody.trim()) {
                toast.error("WhatsApp Message Body is required.");
                return;
            }
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
                emailSubject,
                emailBody,
                whatsappHeading,
                whatsappBody,
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
            const errorMsg = err.message || "";
            if (errorMsg.includes("131047") || errorMsg.toLowerCase().includes("24 hour") || errorMsg.toLowerCase().includes("window")) {
                toast.error(
                    "Meta Policy: 24-hour reply window expired for this contact. Initiating broadcast template send...",
                    { duration: 6000 }
                );
                // Pre-fill test phone and switch to Broadcast tab for template dispatch
                setTestPhone(activeConversation.phone);
                setChannel("WHATSAPP");
                setActiveTab("BROADCAST");
            } else {
                toast.error(errorMsg || "Failed to send WhatsApp reply.");
            }
        } finally {
            setSendingReply(false);
        }
    };

    const resetDraft = () => {
        setAudience("PREMIUM_SEEKERS");
        setChannel("BOTH");
        setEmailSubject(defaultEmailSubject);
        setEmailBody(defaultEmailBody);
        setWhatsappHeading(defaultWhatsappHeading);
        setWhatsappBody(defaultWhatsappBody);
        setTestEmail("");
        setTestPhone("");
        try {
            window.localStorage.removeItem(draftKey);
        } catch {
            // Ignore storage errors
        }
        toast.info("Drafts reset to template defaults.");
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
                    onClick={() => setActiveTab("HISTORY")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        activeTab === "HISTORY"
                            ? "bg-[#16324f] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white/80 text-slate-600 hover:bg-stone-100 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                    <Clock size={15} className="text-amber-500" /> Campaign History
                    {campaignHistory.length > 0 && (
                        <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {campaignHistory.length}
                        </span>
                    )}
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
                <div className="space-y-6">
                    {/* Compact Configuration Header: Audience & Channel in a Single Crisp Card */}
                    <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Target Audience Segmented Pills */}
                            <div>
                                <div className="mb-2.5 flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Target Audience</label>
                                    <div className="flex items-center gap-1.5">
                                        <Badge label={`${previewCount} Total`} variant="blue" />
                                        <Badge label={`${whatsappCount} WhatsApp`} variant="green" />
                                        <button
                                            type="button"
                                            onClick={() => setPreviewModalOpen(true)}
                                            className="ml-1 inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                        >
                                            <Eye size={12} /> View List
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {audienceOptions.map((option) => {
                                        const isSelected = audience === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setAudience(option.value)}
                                                className={`flex flex-col items-center justify-center rounded-xl border px-3 py-2.5 text-center transition-all ${
                                                    isSelected
                                                        ? "border-[#16324f] bg-[#16324f] text-white shadow-sm dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900"
                                                        : "border-stone-200 bg-stone-50 text-slate-700 hover:border-stone-300 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                <span className="text-xs font-semibold leading-tight">{option.label}</span>
                                                {option.value === "PREMIUM_SEEKERS" && (
                                                    <span className={`mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-bold ${
                                                        isSelected ? "text-amber-300 dark:text-amber-600" : "text-amber-600 dark:text-amber-400"
                                                    }`}>
                                                        <Crown size={9} /> VIP
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Delivery Channel Segmented Pills */}
                            <div>
                                <div className="mb-2.5 flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Delivery Channel</label>
                                    <span className="text-xs text-slate-400">
                                        Targeting: <strong className="text-slate-700 dark:text-slate-200">{targetCount} recipients</strong>
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {channelOptions.map((opt) => {
                                        const IconComp = opt.icon;
                                        const isSelected = channel === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setChannel(opt.value)}
                                                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center transition-all ${
                                                    isSelected
                                                        ? "border-[#16324f] bg-[#16324f] text-white shadow-sm dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900"
                                                        : "border-stone-200 bg-stone-50 text-slate-700 hover:border-stone-300 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                <IconComp size={15} className={isSelected ? "text-white dark:text-slate-900" : (opt.value === "WHATSAPP" ? "text-emerald-500" : "text-blue-500")} />
                                                <span className="text-xs font-semibold">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Meta Template Banner (shown when WhatsApp channel is active) */}
                        {(channel === "WHATSAPP" || (channel === "BOTH" && (activeDraftTab === "WHATSAPP" || previewTab === "WHATSAPP_PREVIEW"))) && (
                            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">📋 WhatsApp Meta Template:</span>
                                    <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">aganyu_broadcast_announcement</code>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-emerald-700 dark:text-emerald-300">
                                    <span><strong>{"{{1}}"}</strong> First name (auto)</span>
                                    <span>•</span>
                                    <span><strong>{"{{2}}"}</strong> Heading + Message Body</span>
                                    <span>•</span>
                                    <span><strong>Button</strong> Dashboard Link</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Two-Column Work Area */}
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
                        {/* Left: Message Composer & Live Device Preview */}
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3 dark:border-slate-800">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Draft Campaign Message</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {channel === "BOTH"
                                                ? "Customize dedicated content for each channel"
                                                : channel === "EMAIL"
                                                ? "Compose email campaign with rich HTML support"
                                                : "Compose approved WhatsApp template broadcast"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(channel === "WHATSAPP" || (channel === "BOTH" && activeDraftTab === "WHATSAPP")) && (
                                            <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewTab("EDITOR")}
                                                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                                                        previewTab === "EDITOR"
                                                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                                                    }`}
                                                >
                                                    Editor
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewTab("WHATSAPP_PREVIEW")}
                                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                                                        previewTab === "WHATSAPP_PREVIEW"
                                                            ? "bg-emerald-600 text-white shadow-sm"
                                                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                                                    }`}
                                                >
                                                    <MessageSquare size={12} /> WhatsApp Bubble
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={resetDraft}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                            title="Reset draft to template default"
                                        >
                                            <Save size={13} /> Reset
                                        </button>
                                    </div>
                                </div>

                                {/* Channel Draft Switcher when channel === 'BOTH' */}
                                {channel === "BOTH" && (
                                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-stone-100 p-1 dark:bg-slate-800/80">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveDraftTab("EMAIL");
                                                setPreviewTab("EDITOR");
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                                                activeDraftTab === "EMAIL"
                                                    ? "bg-[#16324f] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                            }`}
                                        >
                                            <Mail size={13} /> 📧 Email Draft
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveDraftTab("WHATSAPP")}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                                                activeDraftTab === "WHATSAPP"
                                                    ? "bg-emerald-600 text-white shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                            }`}
                                        >
                                            <MessageSquare size={13} /> 💬 WhatsApp Broadcast Draft
                                        </button>
                                    </div>
                                )}

                                {/* --- 1. EMAIL DRAFT EDITOR --- */}
                                {(channel === "EMAIL" || (channel === "BOTH" && activeDraftTab === "EMAIL")) && (
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                                            <p className="font-semibold">📧 Email Channel Settings</p>
                                            <p className="mt-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                                                Emails support full formatting, multi-paragraph text, and personalized links.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                Email Subject Line
                                            </label>
                                            <input
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                                placeholder="e.g. Update your education details for better job matches"
                                            />
                                        </div>

                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Email Message Body
                                                </label>
                                                <span className="text-[11px] text-slate-400">HTML paragraph formatting supported</span>
                                            </div>
                                            <textarea
                                                rows={9}
                                                value={emailBody}
                                                onChange={(e) => setEmailBody(e.target.value)}
                                                className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-sans text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            />
                                        </div>

                                        {/* Email Merge Tags */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Email merge tags:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => insertEmailTag("{{first_name}}")}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-2xs"
                                                >
                                                    + {"{{first_name}}"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertEmailTag("{{profile_url}}")}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-2xs"
                                                >
                                                    + {"{{profile_url}}"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertEmailTag("{{company_name}}")}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-2xs"
                                                >
                                                    + {"{{company_name}}"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- 2. WHATSAPP DRAFT EDITOR --- */}
                                {(channel === "WHATSAPP" || (channel === "BOTH" && activeDraftTab === "WHATSAPP")) && (
                                    <>
                                        {previewTab === "EDITOR" ? (
                                            <div className="space-y-4">
                                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                                                    <p className="font-semibold">💬 WhatsApp Meta Template Broadcast</p>
                                                    <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                                                        Sent through approved template <code className="font-mono font-bold">aganyu_broadcast_announcement</code>. The recipient name is auto-injected into <strong>{"{{1}}"}</strong>, your message into <strong>{"{{2}}"}</strong>, and the button automatically routes to their dashboard.
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                        WhatsApp Heading / Title <span className="font-normal text-slate-400">(renders in bold)</span>
                                                    </label>
                                                    <input
                                                        value={whatsappHeading}
                                                        onChange={(e) => setWhatsappHeading(e.target.value)}
                                                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                                        placeholder="e.g. Update Education Details"
                                                    />
                                                </div>

                                                <div>
                                                    <div className="mb-1.5 flex items-center justify-between">
                                                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                            WhatsApp Message Body
                                                        </label>
                                                        <span className={`text-[11px] font-mono ${
                                                            (whatsappHeading.length + whatsappBody.length + 6) > 1024
                                                                ? "text-red-500 font-bold"
                                                                : (whatsappHeading.length + whatsappBody.length + 6) > 900
                                                                ? "text-amber-500 font-medium"
                                                                : "text-slate-400"
                                                        }`}>
                                                            WhatsApp Limit: {whatsappHeading.length + whatsappBody.length + 6} / 1024
                                                        </span>
                                                    </div>
                                                    <textarea
                                                        rows={7}
                                                        value={whatsappBody}
                                                        onChange={(e) => setWhatsappBody(e.target.value)}
                                                        className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-sans text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                                    />
                                                </div>

                                                {/* WhatsApp Merge Tags */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">WhatsApp tags:</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertWhatsappTag("{{first_name}}")}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-2xs"
                                                        >
                                                            + {"{{first_name}}"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertWhatsappTag("{{profile_url}}")}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-2xs"
                                                        >
                                                            + {"{{profile_url}}"}
                                                        </button>
                                                    </div>

                                                    {(whatsappHeading.length + whatsappBody.length + 6) > 1024 && (
                                                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                                                            ⚠️ Exceeds 1024 limit (will trim)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* WhatsApp Live Phone Bubble Preview */
                                            <div className="flex flex-col items-center justify-center rounded-xl bg-stone-100 p-6 dark:bg-slate-950">
                                                <div className="w-full max-w-[380px] rounded-2xl bg-[#e5ddd5] p-3 shadow-md dark:bg-slate-900 border border-[#d1d7db] dark:border-slate-800">
                                                    <div className="mb-2 flex items-center justify-between border-b border-black/5 pb-1 text-[11px] text-slate-500">
                                                        <span>WhatsApp Live Preview</span>
                                                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Aganyu Verified</span>
                                                    </div>
                                                    <div className="rounded-xl bg-white p-3.5 text-xs text-slate-800 shadow-xs dark:bg-emerald-950/60 dark:text-slate-100 border border-black/5 dark:border-emerald-800/40">
                                                        <p className="font-sans">
                                                            Hello <strong className="text-emerald-700 dark:text-emerald-400">*{previewRecipients[0]?.first_name || "Seeker"}*</strong>,
                                                        </p>
                                                        <div className="my-2.5 space-y-1.5 whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                                                            {whatsappHeading && <p className="font-bold text-slate-900 dark:text-white">*{whatsappHeading}*</p>}
                                                            <p>{whatsappBody.replace(/{{first_name}}/gi, previewRecipients[0]?.first_name || "Seeker").replace(/{{profile_url}}/gi, "https://aganyu.com/dashboard/seeker")}</p>
                                                        </div>
                                                        <p className="border-t border-stone-100 pt-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                                            Best regards,<br />
                                                            <span className="font-semibold">Aganyu Support</span>
                                                        </p>
                                                        
                                                        {/* Template URL Button Mockup */}
                                                        <div className="mt-3 border-t border-stone-100 pt-2.5 dark:border-slate-800">
                                                            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-center text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                                🔗 Go to Dashboard
                                                            </div>
                                                        </div>

                                                        <div className="mt-1 flex justify-end text-[9px] text-slate-400">
                                                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right: Unified Action & Dispatch Console */}
                        <div className="space-y-4">
                            {/* Send Test Box */}
                            <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-amber-500" />
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Send Test Preview</h3>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Test prior to bulk</span>
                                </div>

                                <div className="space-y-2.5">
                                    {(channel === "EMAIL" || channel === "BOTH") && (
                                        <div>
                                            <input
                                                value={testEmail}
                                                onChange={(e) => setTestEmail(e.target.value)}
                                                placeholder="Admin test email (e.g. hello@aganyu.com)"
                                                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            />
                                        </div>
                                    )}

                                    {(channel === "WHATSAPP" || channel === "BOTH") && (
                                        <div>
                                            <input
                                                value={testPhone}
                                                onChange={(e) => setTestPhone(e.target.value)}
                                                placeholder="Admin test phone (e.g. +265 999 123 456)"
                                                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => void handleSend("test")}
                                        disabled={sending}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all"
                                    >
                                        <Sparkles size={13} className="text-amber-500" /> Send Test
                                    </button>
                                </div>
                            </div>

                            {/* Dispatch Campaign Panel */}
                            <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Send size={16} className="text-blue-500" />
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dispatch Campaign</h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500">{targetCount} recipients</span>
                                </div>

                                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                                    Broadcast will be dispatched to <strong>{selectedAudienceMeta.label}</strong> via <strong>{channel}</strong>.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => void handleSend("send")}
                                    disabled={sending || targetCount <= 0}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16324f] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
                                >
                                    {sending ? <Mail size={15} className="animate-pulse" /> : <Send size={15} />}
                                    {sending ? "Broadcasting..." : `Send to ${targetCount} Recipient${targetCount === 1 ? "" : "s"}`}
                                </button>

                                {result && (
                                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                                        <div className="flex items-center gap-1.5 font-semibold">
                                            <CheckCircle2 size={13} /> Dispatch Telemetry
                                        </div>
                                        <div className="mt-1.5 space-y-0.5 text-[11px]">
                                            {(channel === "EMAIL" || channel === "BOTH") && (
                                                <p>Emails Sent: <strong>{result.sentEmail}</strong> (Failed: {result.failedEmail})</p>
                                            )}
                                            {(channel === "WHATSAPP" || channel === "BOTH") && (
                                                <p>WhatsApp Sent: <strong>{result.sentWhatsApp}</strong> (Failed: {result.failedWhatsApp}, Skipped: {result.skippedWhatsApp})</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Audience Preview Modal / Drawer */}
                    {previewModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                            <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3 dark:border-slate-800">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Audience Preview ({selectedAudienceMeta.label})</h3>
                                        <p className="text-xs text-slate-500">{selectedAudienceMeta.description}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewModalOpen(false)}
                                        className="rounded-lg p-1 text-slate-400 hover:bg-stone-100 hover:text-slate-600 dark:hover:bg-slate-800"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="max-h-[350px] space-y-2 overflow-y-auto pr-1">
                                    {previewRecipients.length > 0 ? (
                                        previewRecipients.map((recipient, idx) => (
                                            <div key={idx} className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-100">{recipient.first_name || "User"}</span>
                                                        {recipient.is_premium && (
                                                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                                <Crown size={10} /> VIP
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-500 mt-0.5">{recipient.email}</p>
                                                </div>
                                                {recipient.phone ? (
                                                    <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                        <Phone size={10} /> {recipient.phone}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">No phone</span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="py-6 text-center text-xs text-slate-400">No preview recipients available.</p>
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewModalOpen(false)}
                                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : activeTab === "HISTORY" ? (
                /* Campaign History View */
                <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Campaign Dispatch History</h3>
                            <p className="text-xs text-slate-500">Track real-time delivery performance and logs for all dispatched campaigns.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void fetchPreview(audience)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <RefreshCw size={13} /> Refresh
                        </button>
                    </div>

                    {campaignHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                                <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Audience & Channel</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Total</th>
                                        <th className="px-4 py-3">Sent</th>
                                        <th className="px-4 py-3">Failed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                                    {campaignHistory.map((camp) => (
                                        <tr key={camp.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/40">
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]">
                                                {new Date(camp.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{camp.audience}</div>
                                                <div className="text-[10px] text-slate-400">{camp.channel}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                    camp.status === 'COMPLETED'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : camp.status === 'PROCESSING'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                }`}>
                                                    {camp.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold">{camp.total_recipients || 0}</td>
                                            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{camp.sent_count || 0}</td>
                                            <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400">{camp.failed_count || 0}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCampaign(camp);
                                                        void fetchCampaignRecipients(camp.id);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                                >
                                                    <Eye size={12} /> Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-xs text-slate-400">
                            No campaigns dispatched yet. Dispatched campaigns will record delivery logs here.
                        </div>
                    )}

                    {/* Campaign Recipient Logs Drill-Down Modal */}
                    {selectedCampaign && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                            <div className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3 dark:border-slate-800">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                            Campaign Drill-Down ({selectedCampaign.audience})
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Dispatched on {new Date(selectedCampaign.created_at).toLocaleString()} via {selectedCampaign.channel}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCampaign(null);
                                            setCampaignRecipients([]);
                                        }}
                                        className="rounded-lg p-1 text-slate-400 hover:bg-stone-100 hover:text-slate-600 dark:hover:bg-slate-800"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {loadingRecipients ? (
                                    <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                                        Loading recipient logs...
                                    </div>
                                ) : campaignRecipients.length > 0 ? (
                                    <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                                        {campaignRecipients.map((rec, idx) => (
                                            <div
                                                key={rec.id || idx}
                                                className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                                            >
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{rec.email || "No Email"}</p>
                                                    <p className="font-mono text-[11px] text-slate-500">{rec.phone || "No Phone"}</p>
                                                    {rec.error_message && (
                                                        <p className="mt-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                                                            ⚠️ Error: {rec.error_message} {rec.error_code ? `(${rec.error_code})` : ""}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                        rec.status === 'DELIVERED' || rec.status === 'READ'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : rec.status === 'SENT'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                            : rec.status === 'FAILED'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                                            : 'bg-stone-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}>
                                                        {rec.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-xs text-slate-400">
                                        No individual recipient logs found for this campaign.
                                    </div>
                                )}

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCampaign(null);
                                            setCampaignRecipients([]);
                                        }}
                                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Live 2-Way WhatsApp Inbox View */
                <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    {/* Left Conversations List */}
                    <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Seeker WhatsApp Threads</h3>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const phoneInput = window.prompt("Enter recipient WhatsApp phone number (e.g. +265888123456 or 0888123456):");
                                        if (phoneInput && phoneInput.trim()) {
                                            const cleanPhone = phoneInput.trim();
                                            const existing = conversations.find(c => c.phone === cleanPhone);
                                            if (existing) {
                                                setSelectedPhone(cleanPhone);
                                            } else {
                                                const newConv = {
                                                    phone: cleanPhone,
                                                    first_name: "Direct Contact",
                                                    is_premium: false,
                                                    last_message: "Started direct thread",
                                                    messages: []
                                                };
                                                setConversations(prev => [newConv, ...prev]);
                                                setSelectedPhone(cleanPhone);
                                            }
                                        }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                >
                                    + New Chat
                                </button>
                                <button type="button" onClick={() => void fetchPreview(audience)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <RefreshCw size={14} />
                                </button>
                            </div>
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
                                                    {!isInbound && (
                                                        <div className="mt-0.5">
                                                            <DeliveryStatusBadge status={msg.status} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 2-Way Reply Box */}
                                <div className="border-t border-stone-200 pt-4 dark:border-slate-800 space-y-2">
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
                                    <p className="text-[11px] text-slate-400">
                                        💡 <span className="font-semibold">Meta Policy:</span> Direct freeform replies can only be sent within 24 hours of the user's last inbound message.
                                    </p>
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
