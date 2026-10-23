"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Calendar,
  UserCheck,
  Building2,
  TrendingUp,
  Copy,
  Check,
  RefreshCw,
  Palette,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  Edit3,
  RotateCcw,
  Languages,
  Save,
  X,
  Briefcase,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { PageHeader, StatCard, Tabs, Badge, EmptyState } from "@/components/dashboard/ui";

interface DomainFrequency {
  domainId: string | null;
  domainName: string;
  jobCount: number;
  sampleTitles: string[];
}

interface InDemandJobTitle {
  title: string;
  count: number;
  domainName: string;
}

interface MarketIntelligenceSummary {
  periodDays: number;
  totalActiveJobs: number;
  topDomains: DomainFrequency[];
  topJobTitles: InDemandJobTitle[];
  newJobsInPeriod: number;
  verifiedEmployersCount: number;
  totalApplicationsInPeriod: number;
}

interface Suggestion {
  id: string;
  target_account: "FOUNDER" | "COMPANY";
  target_channel: string;
  content_pillar: string;
  scheduled_day: string;
  scheduled_time: string;
  timezone: string;
  opening_hook: string;
  core_message: string;
  proposed_caption: string;
  creative_brief: string;
  hashtags: string[];
  call_to_action: string;
  status: "SUGGESTED" | "APPROVED" | "DISMISSED" | "POSTED";
  created_at: string;
} 

export default function GrowthDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [latestRun, setLatestRun] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [market, setMarket] = useState<MarketIntelligenceSummary | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [languageMode, setLanguageMode] = useState<"ENGLISH" | "BILINGUAL">("ENGLISH");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBriefId, setCopiedBriefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // In-place edit state: suggestionId -> editing caption
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Single post regeneration modal state
  const [regenModalId, setRegenModalId] = useState<string | null>(null);
  const [regenInstruction, setRegenInstruction] = useState<string>("");
  const [regeneratingSingle, setRegeneratingSingle] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/growth");
      if (!res.ok) throw new Error("Failed to load growth data");
      const data = await res.json();
      setLatestRun(data.latestRun);
      setSuggestions(data.suggestions || []);
      setMarket(data.marketIntelligence);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      setError(null);
      const res = await fetch("/api/admin/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "POSTED" | "DISMISSED" | "APPROVED") => {
    try {
      const res = await fetch(`/api/admin/growth/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/admin/growth/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposed_caption: editCaption }),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, proposed_caption: editCaption } : s))
      );
      setEditingId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSingleRegenerate = async (id: string) => {
    try {
      setRegeneratingSingle(true);
      const res = await fetch(`/api/admin/growth/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customInstruction: regenInstruction,
          languageMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate post");

      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                opening_hook: data.slot.openingHook,
                core_message: data.slot.coreMessage,
                proposed_caption: data.slot.proposedCaption,
                creative_brief: data.slot.creativeBrief,
                call_to_action: data.slot.callToAction,
                hashtags: data.slot.hashtags,
              }
            : s
        )
      );
      setRegenModalId(null);
      setRegenInstruction("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegeneratingSingle(false);
    }
  };

  const copyToClipboard = (text: string, id: string, isBrief = false) => {
    navigator.clipboard.writeText(text);
    if (isBrief) {
      setCopiedBriefId(id);
      setTimeout(() => setCopiedBriefId(null), 2000);
    } else {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (activeTab === "ALL") return true;
    return s.target_account === activeTab;
  });

  const founderCount = suggestions.filter((s) => s.target_account === "FOUNDER").length;
  const companyCount = suggestions.filter((s) => s.target_account === "COMPANY").length;

  return (
    <div className="space-y-6">
      {/* Page Header (Canonical Design System) */}
      <PageHeader
        title="Growth & Content Intelligence"
        subtitle="Weekly editorial calendar, Malawian labor market trends, and offline Canva/Figma design briefs"
        action={{
          label: generating ? "Generating Strategy..." : "Generate New Plan",
          onClick: handleGeneratePlan,
          icon: Sparkles,
          disabled: generating,
        }}
      />

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-200 bg-rose-50/80 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/20 text-sm">
          <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards (Canonical Admin StatCards) */}
      {market && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Jobs (Platform)"
            value={market.totalActiveJobs}
            icon={Briefcase}
            iconBg="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            iconColor="text-blue-700 dark:text-blue-400"
          />
          <StatCard
            label="New Jobs (Past 30 Days)"
            value={market.newJobsInPeriod}
            icon={TrendingUp}
            iconBg="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            iconColor="text-emerald-700 dark:text-emerald-400"
          />
          <StatCard
            label="Verified Employers"
            value={market.verifiedEmployersCount}
            icon={Building2}
            iconBg="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            iconColor="text-amber-700 dark:text-amber-400"
          />
          <StatCard
            label="Applications Tracked"
            value={market.totalApplicationsInPeriod}
            icon={FileText}
            iconBg="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
            iconColor="text-indigo-700 dark:text-indigo-400"
          />
        </div>
      )}

      {/* Market Intelligence Insights Summary */}
      {market && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top In-Demand Disciplines */}
          <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#16324f] dark:text-blue-400">
                  <Layers size={16} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Top In-Demand Disciplines (30d)
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Database Ground Truth</span>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-slate-800/60 pt-2">
              {market.topDomains.slice(0, 4).map((d, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                    {d.domainName}
                  </span>
                  <Badge variant="blue" className="font-mono text-[10px]">
                    {d.jobCount} roles
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Top Job Openings */}
          <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <TrendingUp size={16} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Most Available Specific Job Titles
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Labor Demand</span>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-slate-800/60 pt-2">
              {market.topJobTitles.slice(0, 4).map((j, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[240px]" title={j.title}>
                    {j.title}
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    {j.count} openings
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Strategic Focus Banner */}
      {latestRun?.summary && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[#16324f] dark:text-blue-300 shrink-0 mt-0.5">
            <Sparkles size={16} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#16324f] dark:text-blue-300">
              Strategic Content Direction of the Week
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              {latestRun.summary}
            </p>
          </div>
        </div>
      )}

      {/* Controls Bar: Canonical Tabs & Language Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
        <Tabs
          tabs={[
            { id: "ALL", label: `All Posts (${suggestions.length})` },
            { id: "FOUNDER", label: `Founder Personal (${founderCount})` },
            { id: "COMPANY", label: `Aganyu Company (${companyCount})` },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
            <Languages size={13} className="ml-1.5 text-slate-400" />
            <button
              onClick={() => setLanguageMode("ENGLISH")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                languageMode === "ENGLISH"
                  ? "bg-white dark:bg-slate-700 text-[#16324f] dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguageMode("BILINGUAL")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                languageMode === "BILINGUAL"
                  ? "bg-white dark:bg-slate-700 text-[#16324f] dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
              title="English with authentic Malawian Chichewa phrases"
            >
              Bilingual (Chichewa)
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Clock size={13} />
            <span>Africa/Blantyre</span>
          </div>
        </div>
      </div>

      {/* Main Content Calendar Stream */}
      {loading ? (
        <div className="py-24 text-center space-y-3 rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
          <RefreshCw size={28} className="animate-spin mx-auto text-[#16324f] dark:text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading your content calendar & labor metrics...</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Editorial Posts Scheduled"
          description="Click 'Generate New Plan' above to run market intelligence on recent job domain activity and build this week's posts."
          action={{
            label: "Generate First Plan",
            onClick: handleGeneratePlan,
            disabled: generating,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSuggestions.map((post) => (
            <div
              key={post.id}
              className={`rounded-2xl border bg-white/90 p-5 dark:bg-slate-900/80 transition-all ${
                post.status === "POSTED"
                  ? "border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/10"
                  : post.status === "DISMISSED"
                  ? "border-stone-200 dark:border-slate-800 opacity-60"
                  : "border-stone-200 dark:border-slate-800 hover:shadow-sm"
              }`}
            >
              {/* Card Header: Slot, Account Tag & Pillar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3.5 border-b border-stone-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#16324f] text-white dark:bg-slate-100 dark:text-slate-900">
                    {post.scheduled_day} {post.scheduled_time}
                  </span>
                  <Badge
                    variant={post.target_account === "FOUNDER" ? "blue" : "green"}
                    className="text-[11px]"
                  >
                    {post.target_account === "FOUNDER" ? "Founder Personal" : "Aganyu Company"}
                  </Badge>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {post.target_channel}
                  </span>
                </div>

                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {post.content_pillar}
                </span>
              </div>

              {/* Hook */}
              <div className="mt-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attention Hook</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  &ldquo;{post.opening_hook}&rdquo;
                </p>
              </div>

              {/* Proposed Caption (With Inline Edit Mode) */}
              <div className="mt-3.5 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    Proposed Social Copy
                  </span>
                  <div className="flex items-center gap-1.5">
                    {editingId === post.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={savingEdit}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 transition-all"
                        >
                          <Save size={12} />
                          <span>{savingEdit ? "Saving..." : "Save"}</span>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(post.id);
                            setEditCaption(post.proposed_caption);
                          }}
                          className="px-2 py-1 rounded-lg text-slate-600 hover:bg-stone-200/60 dark:text-slate-300 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Edit copy directly"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => copyToClipboard(post.proposed_caption, post.id, false)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-slate-700 hover:bg-stone-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
                        >
                          {copiedId === post.id ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === post.id ? (
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={6}
                    className="w-full text-xs font-sans leading-relaxed rounded-lg border border-stone-300 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#16324f] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">
                    {post.proposed_caption}
                  </p>
                )}

                {post.hashtags?.length > 0 && (
                  <div className="text-[11px] font-semibold text-[#16324f] dark:text-blue-400 pt-1">
                    {post.hashtags.join(" ")}
                  </div>
                )}
              </div>

              {/* Creative Brief (For Canva / Figma Design) */}
              <div className="mt-3 rounded-xl border border-amber-200/90 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Palette size={13} />
                    <span>Creative Brief (Canva / Figma)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(post.creative_brief, post.id, true)}
                    className="text-amber-800 dark:text-amber-300 hover:underline text-[11px] font-bold flex items-center gap-1"
                  >
                    {copiedBriefId === post.id ? (
                      <>
                        <Check size={11} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy Brief</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  {post.creative_brief}
                </p>
              </div>

              {/* Card Footer: Status & Actions */}
              <div className="mt-4 pt-3.5 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span
                    className={`font-bold ${
                      post.status === "POSTED"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : post.status === "DISMISSED"
                        ? "text-slate-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRegenModalId(post.id);
                      setRegenInstruction("");
                    }}
                    className="h-8 px-2.5 rounded-xl border border-stone-200 text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Regenerate this specific slot"
                  >
                    <RotateCcw size={12} />
                    <span>Regenerate</span>
                  </button>

                  {post.status !== "POSTED" && (
                    <button
                      onClick={() => handleStatusUpdate(post.id, "POSTED")}
                      className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Check size={13} strokeWidth={2.5} />
                      <span>Mark Posted</span>
                    </button>
                  )}

                  {post.status !== "DISMISSED" && (
                    <button
                      onClick={() => handleStatusUpdate(post.id, "DISMISSED")}
                      className="h-8 px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Post Regeneration Modal */}
      {regenModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <RotateCcw size={16} className="text-[#16324f] dark:text-blue-400" />
                <span>Regenerate This Slot</span>
              </div>
              <button
                onClick={() => setRegenModalId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Give optional custom instructions to tailor this specific post (e.g., &quot;Make it more reflective&quot;, &quot;Focus on NGO Finance roles&quot;, or &quot;Emphasize remote opportunities in Malawi&quot;).
            </p>

            <textarea
              value={regenInstruction}
              onChange={(e) => setRegenInstruction(e.target.value)}
              placeholder="Custom instructions (optional)..."
              rows={3}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#16324f] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRegenModalId(null)}
                className="h-9 px-4 rounded-xl border border-stone-200 text-xs font-semibold text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSingleRegenerate(regenModalId)}
                disabled={regeneratingSingle}
                className="h-9 px-4 rounded-xl bg-[#16324f] text-xs font-bold text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900 flex items-center gap-2"
              >
                {regeneratingSingle ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Regenerate Slot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
