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
  X
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"ALL" | "FOUNDER" | "COMPANY">("ALL");
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

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary/10 text-primary rounded-lg">
              <Sparkles className="w-6 h-6" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Growth & Content Intelligence</h1>
          </div>
          <p className="text-base-content/70 text-sm mt-1">
            Weekly editorial calendar, verified hiring trends, and offline design briefs for Founder & Company social accounts.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Language Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-base-200/80 p-1 rounded-lg border border-base-300">
            <Languages className="w-3.5 h-3.5 ml-1 text-base-content/70" />
            <button
              onClick={() => setLanguageMode("ENGLISH")}
              className={`btn btn-xs ${languageMode === "ENGLISH" ? "btn-primary shadow-sm" : "btn-ghost"}`}
            >
              English
            </button>
            <button
              onClick={() => setLanguageMode("BILINGUAL")}
              className={`btn btn-xs ${languageMode === "BILINGUAL" ? "btn-primary shadow-sm" : "btn-ghost"}`}
              title="English with natural Chichewa phrases for local engagement"
            >
              Bilingual (Chichewa)
            </button>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="btn btn-primary shadow-sm"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing Market & Formulating Plan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate New Weekly Plan
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Market Intelligence Grid */}
      {market && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Top Domains */}
          <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Layers className="w-4 h-4" />
                <span>Frequently Posted Domains (30d)</span>
              </div>
              <span className="badge badge-sm badge-ghost">{market.totalActiveJobs} active jobs</span>
            </div>
            <div className="space-y-2 pt-2">
              {market.topDomains.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-base-200 pb-1.5 last:border-none">
                  <span className="font-medium truncate max-w-[180px]">{d.domainName}</span>
                  <span className="badge badge-sm badge-neutral font-mono">{d.jobCount} jobs</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Most Available Jobs */}
          <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-secondary font-semibold text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>In-Demand Job Titles</span>
              </div>
              <span className="badge badge-sm badge-ghost">{market.newJobsInPeriod} recent</span>
            </div>
            <div className="space-y-2 pt-2">
              {market.topJobTitles.slice(0, 5).map((j, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-base-200 pb-1.5 last:border-none">
                  <span className="font-medium truncate max-w-[180px]" title={j.title}>{j.title}</span>
                  <span className="badge badge-sm badge-outline font-mono">{j.count} openings</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Platform Milestones for Credibility */}
          <div className="card bg-base-100 border border-base-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-accent font-semibold text-sm">
              <FileText className="w-4 h-4" />
              <span>Real Platform Statistics</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-base-200/50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-primary">{market.verifiedEmployersCount}</div>
                <div className="text-[11px] text-base-content/70 mt-1">Verified Employers</div>
              </div>
              <div className="bg-base-200/50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-secondary">{market.totalApplicationsInPeriod}</div>
                <div className="text-[11px] text-base-content/70 mt-1">Applications (30d)</div>
              </div>
            </div>
            <p className="text-[11px] text-base-content/60 italic text-center">
              Verified ground truths injected into Gemini prompts to eliminate hallucinated statistics.
            </p>
          </div>
        </div>
      )}

      {/* Latest Run Strategy Summary */}
      {latestRun?.summary && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wider font-semibold text-primary">Strategic Focus of the Week</div>
            <div className="text-sm text-base-content/90 font-medium">{latestRun.summary}</div>
          </div>
        </div>
      )}

      {/* Identity Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-2">
        <div className="tabs tabs-boxed bg-base-200/70 p-1">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`tab tab-sm font-medium ${activeTab === "ALL" ? "tab-active bg-base-100 text-primary shadow-sm" : ""}`}
          >
            All Accounts ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveTab("FOUNDER")}
            className={`tab tab-sm font-medium ${activeTab === "FOUNDER" ? "tab-active bg-base-100 text-primary shadow-sm" : ""}`}
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            Founder Brand ({suggestions.filter((s) => s.target_account === "FOUNDER").length})
          </button>
          <button
            onClick={() => setActiveTab("COMPANY")}
            className={`tab tab-sm font-medium ${activeTab === "COMPANY" ? "tab-active bg-base-100 text-primary shadow-sm" : ""}`}
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Aganyu Company ({suggestions.filter((s) => s.target_account === "COMPANY").length})
          </button>
        </div>

        <div className="text-xs text-base-content/60 flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          Timezone: <span className="font-semibold text-base-content/80">Africa/Blantyre (CAT)</span>
        </div>
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-base-content/70">Loading editorial schedule and market data...</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="card bg-base-100 border border-dashed border-base-300 p-12 text-center space-y-4">
          <Calendar className="w-12 h-12 mx-auto text-base-content/30" />
          <div>
            <h3 className="text-lg font-bold">No Content Suggestions in Calendar</h3>
            <p className="text-sm text-base-content/60 max-w-md mx-auto mt-1">
              Click &quot;Generate New Weekly Plan&quot; to inspect your latest jobs and domain data, and create tailored posts for Founder and Company accounts.
            </p>
          </div>
          <button onClick={handleGeneratePlan} disabled={generating} className="btn btn-primary btn-sm mx-auto">
            <Sparkles className="w-4 h-4" />
            Generate First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSuggestions.map((post) => (
            <div
              key={post.id}
              className={`card bg-base-100 border shadow-sm transition-all ${
                post.status === "POSTED"
                  ? "border-success/40 bg-success/5"
                  : post.status === "DISMISSED"
                  ? "opacity-50 border-base-300"
                  : "border-base-200 hover:border-primary/40"
              }`}
            >
              <div className="card-body p-6 space-y-4">
                {/* Header: Day, Time, Identity & Pillar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-primary font-bold text-xs py-2.5">
                      {post.scheduled_day} {post.scheduled_time}
                    </span>
                    <span
                      className={`badge badge-sm font-semibold ${
                        post.target_account === "FOUNDER"
                          ? "badge-secondary"
                          : "badge-accent"
                      }`}
                    >
                      {post.target_account === "FOUNDER" ? "Founder Personal" : "Aganyu Company"}
                    </span>
                    <span className="badge badge-sm badge-ghost text-xs">{post.target_channel}</span>
                  </div>

                  <span className="text-[11px] font-semibold text-base-content/60 uppercase tracking-wide">
                    {post.content_pillar}
                  </span>
                </div>

                {/* Hook & Message */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Opening Hook</div>
                  <div className="font-semibold text-base text-base-content/95 leading-snug">
                    &ldquo;{post.opening_hook}&rdquo;
                  </div>
                </div>

                {/* Full Caption Box (or In-Place Edit Mode) */}
                <div className="bg-base-200/40 border border-base-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-base-content/60">
                    <span className="font-semibold uppercase tracking-wider">Proposed Caption</span>
                    <div className="flex items-center gap-1">
                      {editingId === post.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(post.id)}
                            disabled={savingEdit}
                            className="btn btn-success btn-xs gap-1 text-white"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {savingEdit ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn btn-ghost btn-xs text-base-content/60"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(post.id);
                              setEditCaption(post.proposed_caption);
                            }}
                            className="btn btn-ghost btn-xs text-base-content/70 gap-1 hover:text-primary"
                            title="Edit caption inline"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => copyToClipboard(post.proposed_caption, post.id, false)}
                            className="btn btn-ghost btn-xs text-primary gap-1"
                          >
                            {copiedId === post.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-success" />
                                <span className="text-success font-medium">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Caption</span>
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
                      className="textarea textarea-bordered w-full text-xs font-sans leading-relaxed focus:outline-primary"
                    />
                  ) : (
                    <p className="text-xs text-base-content/85 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">
                      {post.proposed_caption}
                    </p>
                  )}

                  {post.hashtags?.length > 0 && (
                    <div className="text-[11px] text-primary/80 pt-1">
                      {post.hashtags.join(" ")}
                    </div>
                  )}
                </div>

                {/* Offline Creative Brief (For Canva / Graphic Design) */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      <Palette className="w-4 h-4" />
                      <span>Creative Brief (Design Off-Platform)</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(post.creative_brief, post.id, true)}
                      className="btn btn-ghost btn-xs text-amber-700 dark:text-amber-400 gap-1"
                    >
                      {copiedBriefId === post.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-success" />
                          <span className="text-success font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Brief</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-base-content/80 leading-relaxed italic">
                    {post.creative_brief}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-base-200">
                  <div className="text-xs">
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        post.status === "POSTED"
                          ? "text-success"
                          : post.status === "DISMISSED"
                          ? "text-base-content/40"
                          : "text-warning"
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
                      className="btn btn-ghost btn-xs text-primary gap-1"
                      title="Regenerate this specific post with an optional custom prompt"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>

                    {post.status !== "POSTED" && (
                      <button
                        onClick={() => handleStatusUpdate(post.id, "POSTED")}
                        className="btn btn-success btn-xs gap-1 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark as Posted
                      </button>
                    )}
                    {post.status !== "DISMISSED" && (
                      <button
                        onClick={() => handleStatusUpdate(post.id, "DISMISSED")}
                        className="btn btn-ghost btn-xs text-base-content/60"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Post Regeneration Modal */}
      {regenModalId && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Regenerate This Post
            </h3>
            <p className="py-2 text-xs text-base-content/70">
              Give optional custom instructions (e.g., &quot;Make it shorter&quot;, &quot;Focus on NGO job seekers&quot;, or &quot;Add more personal startup reflection&quot;).
            </p>
            <div className="form-control mt-2">
              <textarea
                value={regenInstruction}
                onChange={(e) => setRegenInstruction(e.target.value)}
                placeholder="Custom instruction for this slot (optional)..."
                rows={3}
                className="textarea textarea-bordered text-xs"
              />
            </div>
            <div className="modal-action flex justify-end gap-2">
              <button
                onClick={() => setRegenModalId(null)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSingleRegenerate(regenModalId)}
                disabled={regeneratingSingle}
                className="btn btn-primary btn-sm gap-1"
              >
                {regeneratingSingle ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Regenerate Slot
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
