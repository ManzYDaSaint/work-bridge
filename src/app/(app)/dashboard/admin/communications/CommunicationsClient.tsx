"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { PageHeader, Badge, Pagination } from "@/components/dashboard/ui";
import { 
    Send, Sparkles, Mail, Eye, Save, CheckCircle2, MessageSquare, Phone, Crown, 
    RefreshCw, MessageCircle, CheckCheck, XCircle, Clock, Users, Smartphone, 
    AlertCircle, Search, UserCheck, ShieldCheck, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

type Audience = "ALL" | "SEEKERS" | "EMPLOYERS" | "PREMIUM_SEEKERS";
type Channel = "EMAIL" | "WHATSAPP" | "BOTH";

const audienceOptions: Array<{ value: Audience; label: string; description: string }> = [
    { value: "ALL", label: "All users", description: "Every active user on the platform." },
    { value: "SEEKERS", label: "Seekers", description: "All active job seekers." },
    { value: "EMPLOYERS", label: "Employers", description: "All employer accounts." },
    { value: "PREMIUM_SEEKERS", label: "Premium seekers", description: "Active premium subscribers with phone numbers." },
];

const channelOptions: Array<{ value: Channel; label: string; description: string; icon: any }> = [
    { value: "EMAIL", label: "Email Only", description: "Deliver via Resend email service.", icon: Mail },
    { value: "WHATSAPP", label: "WhatsApp Only", description: "Deliver personalized WhatsApp messages.", icon: MessageSquare },
    { value: "BOTH", label: "Email & WhatsApp", description: "Maximize reach across both Email & WhatsApp.", icon: Sparkles },
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
    return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-100/70">
            <Clock size={10} /> Sent
        </span>
    );
}

export default function CommunicationsClient({ initialCounts }: { initialCounts: Record<string, number> }) {
    const [activeTab, setActiveTab] = useState<"BROADCAST" | "INBOX" | "HISTORY">("BROADCAST");
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

    // Campaign History Pagination
    const [campaignPage, setCampaignPage] = useState(1);
    const [campaignLimit, setCampaignLimit] = useState(5);

    const totalCampaignPages = Math.ceil(campaignHistory.length / campaignLimit) || 1;
    const paginatedCampaignHistory = useMemo(() => {
        const start = (campaignPage - 1) * campaignLimit;
        return campaignHistory.slice(start, start + campaignLimit);
    }, [campaignHistory, campaignPage, campaignLimit]);

    // UI Tabs & Modals
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewTab, setPreviewTab] = useState<"EDITOR" | "WHATSAPP_PREVIEW">("EDITOR");

    // Live WhatsApp Inbox State
    const [conversations, setConversations] = useState<Array<any>>([]);
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [inboxSearch, setInboxSearch] = useState("");

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

    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
    const [campaignRecipients, setCampaignRecipients] = useState<Array<any>>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);

    useEffect(() => {
        void fetchPreview(audience);
    }, [audience]);

    // Supabase Realtime Listener
    useEffect(() => {
        const supabase = createBrowserSupabaseClient();
        if (!supabase) return;

        const channelId = `realtime-communications_${Math.random().toString(36).substring(2, 9)}`;
        const realChannel = supabase
            .channel(channelId)
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
            void supabase.removeChannel(realChannel);
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

    const filteredConversations = useMemo(() => {
        if (!inboxSearch.trim()) return conversations;
        const q = inboxSearch.toLowerCase();
        return conversations.filter(
            (c) =>
                (c.first_name || "").toLowerCase().includes(q) ||
                (c.phone || "").includes(q) ||
                (c.last_message || "").toLowerCase().includes(q)
        );
    }, [conversations, inboxSearch]);

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
            // Ignore
        }
        toast.info("Drafts reset to template defaults.");
    };

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Communications & Support Hub"
                subtitle="Targeted email & WhatsApp broadcasts, live 2-way support inbox, and campaign delivery metrics."
            />

            {/* ── Top Telemetry Overview Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Reach</span>
                        <Users size={16} className="text-blue-500" />
                    </div>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{previewCount}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Recipients in {selectedAudienceMeta.label}</p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">WhatsApp Active</span>
                        <Smartphone size={16} className="text-emerald-500" />
                    </div>
                    <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{whatsappCount}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Registered phone contacts</p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">VIP Premium</span>
                        <Crown size={16} className="text-amber-500" />
                    </div>
                    <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{premiumCount}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Priority WhatsApp subscribers</p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Inbox</span>
                        <MessageCircle size={16} className="text-indigo-500" />
                    </div>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{conversations.length}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Active WhatsApp threads</p>
                </div>
            </div>

            {/* ── Main Workspace Tabs ────────────────────────────────────────── */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => setActiveTab("BROADCAST")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                        activeTab === "BROADCAST"
                            ? "bg-[#16324f] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white/80 text-slate-600 hover:bg-stone-100 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                    <Send size={14} /> Broadcast Campaigns
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("INBOX")}
                    className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                        activeTab === "INBOX"
                            ? "bg-[#16324f] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white/80 text-slate-600 hover:bg-stone-100 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                    <MessageCircle size={14} className="text-emerald-500" /> Live WhatsApp Inbox
                    {conversations.length > 0 && (
                        <span className="ml-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">
                            {conversations.length}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("HISTORY")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                        activeTab === "HISTORY"
                            ? "bg-[#16324f] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white/80 text-slate-600 hover:bg-stone-100 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                    <Clock size={14} className="text-amber-500" /> Campaign History
                    {campaignHistory.length > 0 && (
                        <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {campaignHistory.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── TAB 1: BROADCAST CAMPAIGNS (3-STEP GUIDED WORKFLOW) ───────── */}
            {activeTab === "BROADCAST" && (
                <div className="space-y-6">

                    {/* ── STEP 1: AUDIENCE & CHANNEL SELECTION ───────────────── */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16324f] text-xs font-bold text-white">1</span>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Target Audience & Delivery Channel</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge label={`${targetCount} Target Recipients`} variant="green" />
                                <button
                                    type="button"
                                    onClick={() => setPreviewModalOpen(true)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    <Eye size={12} /> View List ({previewRecipients.length})
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-2">
                            {/* Audience Pills */}
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Segment</label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {audienceOptions.map((opt) => {
                                        const isSel = audience === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setAudience(opt.value)}
                                                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                                                    isSel
                                                        ? "border-[#16324f] bg-[#16324f] text-white shadow-sm dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900 font-bold"
                                                        : "border-stone-200 bg-stone-50 text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                                                }`}
                                            >
                                                <span className="text-xs font-bold">{opt.label}</span>
                                                {opt.value === "PREMIUM_SEEKERS" && (
                                                    <span className={`mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-extrabold ${isSel ? "text-amber-300 dark:text-amber-600" : "text-amber-600 dark:text-amber-400"}`}>
                                                        <Crown size={9} /> VIP
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Channel Pills */}
                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Channel</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {channelOptions.map((opt) => {
                                        const IconComp = opt.icon;
                                        const isSel = channel === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setChannel(opt.value)}
                                                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-center transition-all ${
                                                    isSel
                                                        ? "border-[#16324f] bg-[#16324f] text-white shadow-sm dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900 font-bold"
                                                        : "border-stone-200 bg-stone-50 text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                                                }`}
                                            >
                                                <IconComp size={15} className={isSel ? "text-white dark:text-slate-900" : (opt.value === "WHATSAPP" ? "text-emerald-500" : "text-blue-500")} />
                                                <span className="text-xs font-bold">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── STEP 2: CONTENT COMPOSER & LIVE PREVIEW ────────────── */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16324f] text-xs font-bold text-white">2</span>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compose Message Content & Live Preview</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {channel === "BOTH" && (
                                    <div className="flex rounded-xl bg-stone-100 p-1 dark:bg-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setActiveDraftTab("EMAIL")}
                                            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${activeDraftTab === "EMAIL" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
                                        >
                                            Email Draft
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveDraftTab("WHATSAPP")}
                                            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${activeDraftTab === "WHATSAPP" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500"}`}
                                        >
                                            WhatsApp Draft
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={resetDraft}
                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300"
                                >
                                    <Save size={12} /> Reset
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                            {/* Editor Form */}
                            <div className="space-y-4">
                                {(channel === "EMAIL" || (channel === "BOTH" && activeDraftTab === "EMAIL")) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Email Subject Line</label>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => insertEmailTag("{{first_name}}")} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300">+ {"{{first_name}}"}</button>
                                                <button type="button" onClick={() => insertEmailTag("{{profile_url}}")} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300">+ {"{{profile_url}}"}</button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            placeholder="Enter subject line..."
                                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#16324f] focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
                                        />

                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Email Body (Markdown / Plain Text)</label>
                                        <textarea
                                            rows={9}
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                            placeholder="Compose email content..."
                                            className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3.5 font-mono text-xs text-slate-900 focus:border-[#16324f] focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
                                        />
                                    </div>
                                )}

                                {(channel === "WHATSAPP" || (channel === "BOTH" && activeDraftTab === "WHATSAPP")) && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200 flex items-center justify-between">
                                            <span className="font-semibold">📋 WhatsApp Meta Template: <code className="font-mono text-[11px] font-bold">aganyu_broadcast_announcement</code></span>
                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Approved</span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">WhatsApp Heading</label>
                                            <button type="button" onClick={() => insertWhatsappTag("{{first_name}}")} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300">+ {"{{first_name}}"}</button>
                                        </div>
                                        <input
                                            type="text"
                                            value={whatsappHeading}
                                            onChange={(e) => setWhatsappHeading(e.target.value)}
                                            placeholder="Enter announcement heading..."
                                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#16324f] focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
                                        />

                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">WhatsApp Message Body</label>
                                        <textarea
                                            rows={8}
                                            value={whatsappBody}
                                            onChange={(e) => setWhatsappBody(e.target.value)}
                                            placeholder="Compose WhatsApp body message..."
                                            className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3.5 font-mono text-xs text-slate-900 focus:border-[#16324f] focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/80 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Live Device Preview */}
                            <div className="rounded-2xl border border-stone-200 bg-stone-100 p-4 dark:border-slate-800 dark:bg-slate-950/60 flex flex-col justify-between">
                                <div>
                                    <div className="mb-3 flex items-center justify-between border-b border-stone-200 pb-2 dark:border-slate-800">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Device Preview</span>
                                        <Smartphone size={14} className="text-emerald-500" />
                                    </div>

                                    {/* Realistic WhatsApp Chat Bubble Mockup */}
                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-emerald-200/80 bg-[#efeae2] p-3.5 shadow-sm dark:bg-slate-900">
                                            <div className="rounded-xl bg-[#dcf8c6] p-3 text-xs text-slate-900 shadow-xs dark:bg-emerald-900/60 dark:text-emerald-100">
                                                <p className="font-extrabold text-[#075e54] dark:text-emerald-300">
                                                    Aganyu • {whatsappHeading || "Notification"}
                                                </p>
                                                <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-[11px]">
                                                    Hello <span className="font-bold underline text-emerald-800 dark:text-emerald-200">User</span>,
                                                    {"\n\n"}
                                                    {whatsappBody || "Message preview will appear here..."}
                                                </p>
                                                <div className="mt-2 text-right text-[9px] font-medium text-slate-500 dark:text-emerald-300/70">
                                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • WhatsApp
                                                </div>
                                            </div>
                                            <div className="mt-2 text-center">
                                                <span className="inline-block rounded-lg bg-white px-3 py-1 text-[10px] font-bold text-emerald-700 shadow-xs dark:bg-slate-800 dark:text-emerald-300">
                                                    🔗 Open Dashboard Profile
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-stone-200/80 bg-white p-3 text-center text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                                    Previews use recipient sample variables (<code className="font-mono text-emerald-600">first_name</code>, <code className="font-mono text-emerald-600">profile_url</code>) dynamically.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── STEP 3: TEST & BULK DISPATCH PANEL ─────────────────── */}
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3 dark:border-slate-800">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16324f] text-xs font-bold text-white">3</span>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Test & Dispatch Campaign</h3>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Test Sender */}
                            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Smartphone size={13} className="text-blue-500" /> Send Single Test Message
                                </h4>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <input
                                        type="email"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        placeholder="Admin test email..."
                                        className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="WhatsApp phone (+265...)"
                                        className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSend("test")}
                                    disabled={sending}
                                    className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 disabled:opacity-50 transition-colors"
                                >
                                    {sending ? "Sending Test..." : "Send Test Message"}
                                </button>
                            </div>

                            {/* Bulk Dispatch */}
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Send size={13} className="text-emerald-500" /> Dispatch Campaign to Segment
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                        Targeting <strong className="text-slate-900 dark:text-white">{targetCount} recipients</strong> in <strong className="text-slate-900 dark:text-white">{selectedAudienceMeta.label}</strong> via <strong className="text-slate-900 dark:text-white">{channel}</strong>.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleSend("send")}
                                    disabled={sending || targetCount === 0}
                                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Send size={14} />
                                    {sending ? "Dispatching Campaign..." : `Dispatch Campaign to ${targetCount} Recipients`}
                                </button>
                            </div>
                        </div>

                        {/* Result Notification Banner */}
                        {result && (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/40">
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                    <CheckCircle2 size={15} /> Campaign Dispatch Summary
                                </h4>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 sm:grid-cols-4">
                                    <span>Total: <strong>{result.total}</strong></span>
                                    <span>Email Sent: <strong className="text-blue-600">{result.sentEmail}</strong></span>
                                    <span>WhatsApp Sent: <strong className="text-emerald-600">{result.sentWhatsApp}</strong></span>
                                    <span>Failures: <strong className="text-red-500">{result.failedEmail + result.failedWhatsApp}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 2: DEDICATED FULL-HEIGHT LIVE WHATSAPP INBOX ────────────── */}
            {activeTab === "INBOX" && (
                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row h-[620px]">
                    {/* Left: Search & Conversation List */}
                    <div className="w-full md:w-80 border-r border-stone-200 dark:border-slate-800 flex flex-col bg-stone-50/50 dark:bg-slate-900/50">
                        <div className="p-3 border-b border-stone-200 dark:border-slate-800">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={inboxSearch}
                                    onChange={(e) => setInboxSearch(e.target.value)}
                                    placeholder="Search conversations..."
                                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-slate-800/60">
                            {filteredConversations.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No active WhatsApp conversations found.
                                </div>
                            ) : (
                                filteredConversations.map((conv) => {
                                    const isSel = conv.phone === activeConversation?.phone;
                                    return (
                                        <button
                                            key={conv.phone}
                                            type="button"
                                            onClick={() => setSelectedPhone(conv.phone)}
                                            className={`w-full p-3.5 text-left transition-all flex items-start gap-3 ${
                                                isSel
                                                    ? "bg-white shadow-xs dark:bg-slate-800 border-l-4 border-emerald-500"
                                                    : "hover:bg-stone-100/60 dark:hover:bg-slate-800/40"
                                            }`}
                                        >
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                {(conv.first_name || conv.phone || "U").slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                                        {conv.first_name || "WhatsApp User"}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(conv.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {conv.last_message || "No messages"}
                                                </p>
                                                <span className="mt-1 inline-block text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    {conv.phone}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Active Chat Thread Workspace */}
                    <div className="flex-1 flex flex-col h-full bg-[#efeae2]/40 dark:bg-slate-950/40">
                        {activeConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-3.5 border-b border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                                            {(activeConversation.first_name || activeConversation.phone).slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                {activeConversation.first_name || "WhatsApp User"}
                                            </h4>
                                            <p className="text-[10px] text-slate-500">{activeConversation.phone}</p>
                                        </div>
                                    </div>
                                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                                        24h Reply Window Active
                                    </span>
                                </div>

                                {/* Scrollable Message Bubbles */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {(activeConversation.messages || []).map((msg: any) => {
                                        const isInbound = msg.direction === "INBOUND";
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                                            >
                                                <div
                                                    className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-xs ${
                                                        isInbound
                                                            ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white rounded-tl-xs"
                                                            : "bg-[#075e54] text-white dark:bg-emerald-900 rounded-tr-xs"
                                                    }`}
                                                >
                                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.message_text}</p>
                                                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] opacity-75">
                                                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {!isInbound && <DeliveryStatusBadge status={msg.status} />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Reply Input Bar */}
                                <div className="p-3 border-t border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center gap-2 shrink-0">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendLiveReply()}
                                        placeholder="Type your WhatsApp reply..."
                                        className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendLiveReply}
                                        disabled={sendingReply || !replyText.trim()}
                                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                    >
                                        {sendingReply ? "Sending..." : "Reply"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                Select a conversation to view chat history.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 3: CAMPAIGN HISTORY ────────────────────────────────────── */}
            {activeTab === "HISTORY" && (
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Broadcast Campaign Log</h3>

                    {campaignHistory.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                            No past broadcast campaigns found.
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-100 dark:divide-slate-800">
                            {paginatedCampaignHistory.map((item) => (
                                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {item.email_subject || item.whatsapp_heading || "Broadcast Campaign"}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Audience: <strong>{item.audience}</strong> • Channel: <strong>{item.channel}</strong> • {new Date(item.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <Badge label={`Sent: ${item.total_recipients || 0}`} variant="green" />
                                </div>
                            ))}

                            {totalCampaignPages > 1 && (
                                <div className="pt-4">
                                    <Pagination
                                        currentPage={campaignPage}
                                        totalPages={totalCampaignPages}
                                        totalItems={campaignHistory.length}
                                        itemsPerPage={campaignLimit}
                                        onPageChange={(p) => setCampaignPage(p)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Recipient List Modal */}
            {previewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-slate-800">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Recipient Segment List ({selectedAudienceMeta.label})
                            </h4>
                            <button onClick={() => setPreviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {previewRecipients.map((r, i) => (
                                <div key={i} className="flex items-center justify-between rounded-lg bg-stone-50 p-2.5 text-xs dark:bg-slate-800">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{r.first_name}</p>
                                        <p className="text-[11px] text-slate-500">{r.email}</p>
                                    </div>
                                    {r.phone && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{r.phone}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
