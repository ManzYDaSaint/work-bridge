"use client";

import { useState, useEffect, useCallback } from "react";
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
    totalCount: number;
    sources: any[];
    settings: { ingestion_service_enabled: boolean; ingestion_require_admin_approval: boolean };
    metrics: { pendingCount: number; needsMoreDataCount: number; publishedCount: number; sourcesCount: number };
}

export default function IngestionAdminClient() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [data, setData] = useState<IngestionData>({
        queueItems: [],
        totalCount: 0,
        sources: [],
        settings: { ingestion_service_enabled: true, ingestion_require_admin_approval: true },
        metrics: { pendingCount: 0, needsMoreDataCount: 0, publishedCount: 0, sourcesCount: 0 },
    });
    const [selectedTab, setSelectedTab] = useState<"queue" | "sources">("queue");
    const [selectedQueueItems, setSelectedQueueItems] = useState<string[]>([]);
    const [sourceFilter, setSourceFilter] = useState("");
    const [confidenceFilter, setConfidenceFilter] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 50;
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [editedItem, setEditedItem] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSource, setNewSource] = useState({ name: "", connector_type: "basic-scraper", crawl_frequency_minutes: 360 });

    const selectItem = (item: any) => {
        setSelectedItem(item);
        setEditedItem({ ...item });
    };

    const handleAddSource = async () => {
        await handleAction("CREATE_SOURCE", undefined, newSource);
        setIsAddModalOpen(false);
        setNewSource({ name: "", connector_type: "basic-scraper", crawl_frequency_minutes: 360 });
    };

    const deleteSource = async (sourceId: string) => {
        if (confirm("Are you sure you want to delete this source?")) {
            await handleAction("DELETE_SOURCE", undefined, { sourceId });
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let url = "/api/admin/ingestion/data";
            const params = new URLSearchParams();
            if (sourceFilter) params.append("sourceId", sourceFilter);
            if (confidenceFilter > 0) params.append("minConfidence", confidenceFilter.toString());
            params.append("page", page.toString());
            params.append("limit", limit.toString());

            if (params.toString()) url += `?${params.toString()}`;
            const res = await fetch(url);
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) {
            console.error("Failed to fetch ingestion data", err);
        } finally {
            setLoading(false);
        }
    }, [sourceFilter, confidenceFilter, page, limit]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalPages = Math.ceil(data.totalCount / limit);

    const handleAction = async (action: string, queueItemId?: string, extraData?: any) => {
        setActionLoading(queueItemId || action);
        let url = "/api/admin/ingestion";
        let body = { action, queueItemId, ...extraData };

        if (["APPROVE", "REJECT", "UPDATE_AND_APPROVE", "DELETE_QUEUE_ITEM"].includes(action)) {
            url = `/api/admin/ingestion/queue/${queueItemId}`;
        } else if (["CREATE_SOURCE", "DELETE_SOURCE", "TOGGLE_SOURCE_STATUS"].includes(action)) {
            url = "/api/admin/ingestion/sources";
        } else if (action === "FORCE_CRAWL") {
            url = "/api/admin/ingestion/crawl";
        }

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
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

    const handleBulkAction = async (action: "BULK_APPROVE" | "BULK_DELETE") => {
        if (!confirm(`Are you sure you want to perform ${action} on ${selectedQueueItems.length} jobs?`)) return;

        setActionLoading(action);
        try {
            const res = await fetch("/api/admin/ingestion/queue/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, queueItemIds: selectedQueueItems }),
            });
            if (res.ok) {
                setSelectedQueueItems([]);
                await fetchData();
            }
        } catch (err) {
            console.error("Bulk action error:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSetting = async (key: string, currentValue: boolean) => {
        setActionLoading(key);
        try {
            await fetch("/api/admin/ingestion/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settingKey: key, settingValue: !currentValue }),
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
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction("FORCE_CRAWL")}
                        disabled={!engineOn || loading || !!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                        title="Trigger crawler for all enabled sources"
                    >
                        <Zap className="w-4 h-4" />
                        Force Crawl All
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Needs Repair</p>
                        <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{metrics.needsMoreDataCount}</p>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600">
                        <ShieldAlert className="w-6 h-6" />
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
                        {/* Filters */}
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center">
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="text-sm border rounded-lg p-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                            >
                                <option value="">All Sources</option>
                                {data.sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <label>Min Confidence: {confidenceFilter}%</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={confidenceFilter}
                                    onChange={(e) => setConfidenceFilter(parseInt(e.target.value))}
                                    className="w-32"
                                />
                            </div>
                        </div>

                        {data.queueItems.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center text-gray-500">
                                <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                <p>No items match the criteria.</p>
                            </div>
                        ) : (
                            <>
                                {selectedQueueItems.length > 0 && (
                                    <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between z-10 shadow-sm">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedQueueItems.length} selected</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleBulkAction("BULK_APPROVE")}
                                                disabled={!!actionLoading}
                                                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                                            >Bulk Approve</button>
                                            <button 
                                                onClick={() => handleBulkAction("BULK_DELETE")}
                                                disabled={!!actionLoading}
                                                className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50"
                                            >Bulk Delete</button>
                                        </div>
                                    </div>
                                )}
                                {data.queueItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-4 bg-white dark:bg-gray-900 border rounded-xl cursor-pointer transition shadow-sm hover:border-emerald-500 ${selectedItem?.id === item.id
                                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                                            : "border-gray-200 dark:border-gray-800"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                checked={selectedQueueItems.includes(item.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedQueueItems([...selectedQueueItems, item.id]);
                                                    else setSelectedQueueItems(selectedQueueItems.filter(id => id !== item.id));
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1" onClick={() => selectItem(item)}>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{item.title}</h3>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item.status === "NEEDS_MORE_DATA"
                                                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                                        : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                                        }`}>
                                                        {item.status === "NEEDS_MORE_DATA" ? "Needs Repair" : `${item.overall_confidence}% Conf`}
                                                    </span>
                                                </div>
                                                {item.status === "NEEDS_MORE_DATA" && item.rejection_reason && (
                                                    <p className="mt-2 text-xs text-rose-600 dark:text-rose-300 line-clamp-2">
                                                        {item.rejection_reason}
                                                    </p>
                                                )}
                                                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{item.display_company_name}</span>
                                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage(page - 1)}
                                            className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
                                        >Previous</button>
                                        <span className="text-sm">Page {page} of {totalPages}</span>
                                        <button
                                            disabled={page === totalPages}
                                            onClick={() => setPage(page + 1)}
                                            className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
                                        >Next</button>
                                    </div>
                                )}
                            </>
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
                                <button
                                    onClick={async () => {
                                        if (confirm("Are you sure you want to delete this job item? This action cannot be undone.")) {
                                            await handleAction("DELETE_QUEUE_ITEM", selectedItem.id);
                                        }
                                    }}
                                    className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 text-xs px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                >
                                    🗑️ Delete
                                </button>
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
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-end">
                        <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Add New Source</button>
                    </div>
                    {isAddModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-md">
                                <h2 className="text-lg font-bold mb-4">Add New Source</h2>
                                <input className="w-full p-2 border rounded mb-3" placeholder="Source Name" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} />
                                <input className="w-full p-2 border rounded mb-3" placeholder="Connector Type" value={newSource.connector_type} onChange={(e) => setNewSource({ ...newSource, connector_type: e.target.value })} />
                                <input type="number" className="w-full p-2 border rounded mb-4" placeholder="Crawl Frequency (min)" value={newSource.crawl_frequency_minutes} onChange={(e) => setNewSource({ ...newSource, crawl_frequency_minutes: parseInt(e.target.value) })} />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                                    <button onClick={handleAddSource} className="px-4 py-2 bg-emerald-600 text-white rounded">Add</button>
                                </div>
                            </div>
                        </div>
                    )}
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
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleAction("TOGGLE_SOURCE_STATUS", undefined, { sourceId: src.id, isEnabled: !src.is_enabled })}
                                                disabled={!!actionLoading}
                                                className={`text-xs px-3 py-1.5 font-medium rounded transition ${src.is_enabled
                                                    ? "bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                                                    : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                                    }`}
                                            >
                                                {src.is_enabled ? "Disable" : "Enable"}
                                            </button>
                                            <button
                                                id={`force-crawl-${src.id}`}
                                                onClick={() => handleAction("FORCE_CRAWL", undefined, { sourceId: src.id })}
                                                disabled={!engineOn || !src.is_enabled || !!actionLoading}
                                                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium rounded text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                                title={!engineOn ? "Enable Scraping Engine to crawl" : !src.is_enabled ? "Enable this source before crawling" : "Force crawl this source"}
                                            >
                                                Force Crawl
                                            </button>
                                            <button
                                                onClick={() => deleteSource(src.id)}
                                                className="text-xs px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 font-medium rounded transition"
                                            >
                                                Delete
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
