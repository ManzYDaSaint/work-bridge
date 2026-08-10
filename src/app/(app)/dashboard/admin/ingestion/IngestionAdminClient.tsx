"use client";

import { useState, useEffect } from "react";
import {
    Activity, CheckCircle2, Clock, Database, RefreshCw,
    Zap, Building2, MapPin, Power, ShieldCheck, ShieldAlert
} from "lucide-react";
import { JobPostingForm } from "@/components/jobs/JobPostingForm";
import {
    JobQuickFormValues,
    serializeCommaSkills,
    serializeScreeningQuestions,
    toIngestionQueueFields,
} from "@/lib/validations/job";

interface IngestionData {
    queueItems: any[];
    sources: any[];
    settings: { ingestion_service_enabled: boolean; ingestion_require_admin_approval: boolean };
    metrics: { pendingCount: number; publishedCount: number; sourcesCount: number };
}

export default function IngestionAdminClient() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [data, setData] = useState<IngestionData>({
        queueItems: [],
        sources: [],
        settings: { ingestion_service_enabled: true, ingestion_require_admin_approval: true },
        metrics: { pendingCount: 0, publishedCount: 0, sourcesCount: 0 },
    });
    const [selectedTab, setSelectedTab] = useState<"queue" | "sources">("queue");
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [editedItem, setEditedItem] = useState<any | null>(null);

    const selectItem = (item: any) => {
        setSelectedItem(item);
        setEditedItem({ ...item });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/ingestion");
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) {
            console.error("Failed to fetch ingestion data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAction = async (action: string, queueItemId?: string, extraData?: any) => {
        setActionLoading(queueItemId || action);
        try {
            const res = await fetch("/api/admin/ingestion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, queueItemId, ...extraData }),
            });
            if (res.ok) {
                if (selectedItem?.id === queueItemId) { setSelectedItem(null); setEditedItem(null); }
                await fetchData();
            }
        } catch (err) {
            console.error("Action error:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSetting = async (key: string, currentValue: boolean) => {
        setActionLoading(key);
        try {
            await fetch("/api/admin/ingestion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "TOGGLE_SETTING", settingKey: key, settingValue: !currentValue }),
            });
            setData(prev => ({
                ...prev,
                settings: { ...prev.settings, [key]: !currentValue },
            }));
        } catch (err) {
            console.error("Toggle error:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const { settings, metrics } = data;
    const engineOn = settings.ingestion_service_enabled;
    const approvalOn = settings.ingestion_require_admin_approval;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-6 h-6 text-emerald-500" />
                        Job Ingestion Engine
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Multi-stage automated scraper, rule extraction, Gemini AI enrichment &amp; verification queue.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* ── Master Control Banner ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ingestion Engine Kill Switch */}
                <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 transition-all ${engineOn
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${engineOn ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-rose-100 dark:bg-rose-900/40"}`}>
                            <Power className={`w-5 h-5 ${engineOn ? "text-emerald-600" : "text-rose-500"}`} />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">Scraping Engine</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {engineOn ? "Crawlers are active and scheduling normally." : "All crawlers are globally paused."}
                            </p>
                        </div>
                    </div>
                    <button
                        id="toggle-scraping-engine"
                        onClick={() => toggleSetting("ingestion_service_enabled", engineOn)}
                        disabled={actionLoading === "ingestion_service_enabled"}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${engineOn ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                            } disabled:opacity-60`}
                        role="switch"
                        aria-checked={engineOn}
                        title={engineOn ? "Disable Scraping Engine" : "Enable Scraping Engine"}
                    >
                        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform ${engineOn ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>

                {/* Admin Approval Gate */}
                <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 transition-all ${approvalOn
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${approvalOn ? "bg-amber-100 dark:bg-amber-900/40" : "bg-blue-100 dark:bg-blue-900/40"}`}>
                            {approvalOn
                                ? <ShieldAlert className="w-5 h-5 text-amber-600" />
                                : <ShieldCheck className="w-5 h-5 text-blue-500" />
                            }
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">Admin Approval Gate</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {approvalOn
                                    ? "All scraped jobs require manual review before going live."
                                    : "High-confidence jobs auto-publish without review."}
                            </p>
                        </div>
                    </div>
                    <button
                        id="toggle-admin-approval"
                        onClick={() => toggleSetting("ingestion_require_admin_approval", approvalOn)}
                        disabled={actionLoading === "ingestion_require_admin_approval"}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${approvalOn ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
                            } disabled:opacity-60`}
                        role="switch"
                        aria-checked={approvalOn}
                        title={approvalOn ? "Disable Admin Approval Requirement" : "Enable Admin Approval Requirement"}
                    >
                        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform ${approvalOn ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Awaiting Review</p>
                        <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{metrics.pendingCount}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Published Jobs</p>
                        <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.publishedCount}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Connectors</p>
                        <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{metrics.sourcesCount}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600">
                        <Database className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                {(["queue", "sources"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`pb-3 px-4 text-sm font-medium border-b-2 transition capitalize ${selectedTab === tab
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                    >
                        {tab === "queue" ? `Verification Queue (${data.queueItems.length})` : `Sources & Connectors (${data.sources.length})`}
                    </button>
                ))}
            </div>

            {/* Queue Tab */}
            {selectedTab === "queue" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`${selectedItem ? "lg:col-span-1" : "lg:col-span-3"} space-y-3`}>
                        {!engineOn && (
                            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center gap-3 text-sm text-rose-700 dark:text-rose-300">
                                <Power className="w-4 h-4 shrink-0" />
                                <span>Scraping Engine is <strong>Disabled</strong>. Re-enable it above to resume crawling.</span>
                            </div>
                        )}
                        {data.queueItems.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center text-gray-500">
                                <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                <p>No items in the verification queue. Crawlers are operating cleanly!</p>
                            </div>
                        ) : (
                            data.queueItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => selectItem(item)}
                                    className={`p-4 bg-white dark:bg-gray-900 border rounded-xl cursor-pointer transition shadow-sm hover:border-emerald-500 ${selectedItem?.id === item.id
                                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                                        : "border-gray-200 dark:border-gray-800"
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{item.title}</h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                            {item.overall_confidence}% Conf
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{item.display_company_name}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.location}</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs">
                                        <span className="text-gray-400">Source: {item.source?.name || "Scraper"}</span>
                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">{item.extraction_method}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>


                    {selectedItem && editedItem && (
                        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                            {/* Panel header */}
                            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Review &amp; Edit Before Publishing</span>
                                    <p className="text-xs text-gray-500 mt-0.5">All fields are editable. Correct any errors then Approve &amp; Publish.</p>
                                </div>
                                <button onClick={() => { setSelectedItem(null); setEditedItem(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition">✕ Close</button>
                            </div>

                            <div className="p-6 max-h-[75vh] overflow-y-auto">
                                <JobPostingForm
                                    key={selectedItem.id}
                                    defaultValues={{
                                        title: editedItem.title,
                                        description: editedItem.description,
                                        location: editedItem.location,
                                        type: editedItem.type,
                                        workMode: editedItem.work_mode || "REMOTE",
                                        skillsInput: serializeCommaSkills(editedItem.skills),
                                        mustHaveSkillsInput: serializeCommaSkills(editedItem.must_have_skills),
                                        niceToHaveSkillsInput: serializeCommaSkills(editedItem.nice_to_have_skills),
                                        minimumYearsExperience: editedItem.minimum_years_experience ?? 0,
                                        qualification: editedItem.qualification || "",
                                        screeningQuestionsInput: serializeScreeningQuestions(editedItem.screening_questions),
                                        salaryRange: editedItem.salary_range || "",
                                        deadline: editedItem.deadline
                                            ? new Date(editedItem.deadline).toISOString().split("T")[0]
                                            : "",
                                        applicationMethod: editedItem.application_method || "external_url",
                                        externalApplyUrl: editedItem.external_apply_url || "",
                                        applyEmail: editedItem.apply_email || "",
                                        applyWhatsapp: editedItem.apply_whatsapp || "",
                                        applyPhone: editedItem.apply_phone || "",
                                        applicationInstructions: editedItem.application_instructions || "",
                                        allowOneTapApply: editedItem.allow_one_tap_apply ?? false,
                                        postingType: editedItem.posting_type || "AGANYU",
                                        displayCompanyName: editedItem.display_company_name || "",
                                        jobSource: editedItem.job_source || editedItem.source?.name || "Ingestion Engine",
                                    }}
                                    onSubmit={async (data: JobQuickFormValues) => {
                                        await handleAction("UPDATE_AND_APPROVE", selectedItem.id, {
                                            updatedFields: toIngestionQueueFields(data),
                                        });
                                    }}
                                    saving={!!actionLoading}
                                    submitLabel="Save & Publish"
                                    companyNamePlaceholder={editedItem.display_company_name || "hiring company"}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sources Tab */}
            {selectedTab === "sources" && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-3">Source Name</th>
                                <th className="px-6 py-3">Connector</th>
                                <th className="px-6 py-3">Reputation</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {data.sources.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No job sources configured. Run migration seeds.
                                    </td>
                                </tr>
                            ) : (
                                data.sources.map((src) => (
                                    <tr key={src.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{src.name}</td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded">{src.connector_type}</span></td>
                                        <td className="px-6 py-4 font-bold text-emerald-600">{src.reputation_score}/100</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${src.health_status === "HEALTHY"
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                : src.health_status === "DEGRADED"
                                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                                }`}>
                                                {src.health_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                id={`force-crawl-${src.id}`}
                                                onClick={() => handleAction("FORCE_CRAWL", undefined, { sourceId: src.id })}
                                                disabled={!engineOn || !!actionLoading}
                                                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium rounded text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                                title={!engineOn ? "Enable Scraping Engine to crawl" : "Force crawl this source"}
                                            >
                                                Force Crawl
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
