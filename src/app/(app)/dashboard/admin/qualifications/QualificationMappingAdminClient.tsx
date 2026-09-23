"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Bot, CheckCircle2, Filter, Loader2, Plus, RefreshCw, Save, Search, Trash2, Layers } from "lucide-react";

type Domain = { id: string; name: string };
type Mapping = {
  id: string;
  raw_qualification: string;
  domain_id: string | null;
  is_confirmed: boolean;
  created_at?: string;
  qualification_domains?: Domain | null;
};
type UnmappedQualification = {
  raw_qualification: string;
  job_count: number;
  sample_jobs: Array<{ id: string; title: string; status: string | null; created_at: string | null }>;
};
type MappingsResponse = {
  mappings: Mapping[];
  unmappedQualifications: UnmappedQualification[];
};
type NewDomainForm = {
  name: string;
  description: string;
  keywords: string;
};

const emptyNewDomainForm: NewDomainForm = { name: "", description: "", keywords: "" };

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body?.error === "string" ? body.error : fallback;
}

function rowKey(rawQualification: string) {
  return rawQualification.toLowerCase();
}

export default function QualificationMappingAdminClient() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [unmappedQualifications, setUnmappedQualifications] = useState<UnmappedQualification[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<Record<string, string>>({});
  const [unmappedSelectedDomains, setUnmappedSelectedDomains] = useState<Record<string, string>>({});
  const [newDomainForms, setNewDomainForms] = useState<Record<string, NewDomainForm>>({});
  const [expandedCreateDomain, setExpandedCreateDomain] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Search and Filter states
  const [unmappedSearch, setUnmappedSearch] = useState("");
  const [mappingSearch, setMappingSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "UNCONFIRMED">("ALL");

  // Selection states for bulk actions
  const [selectedUnmappedKeys, setSelectedUnmappedKeys] = useState<Set<string>>(new Set());
  const [batchTargetDomain, setBatchTargetDomain] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Delete confirmation modal state
  const [deleteConfirmMapping, setDeleteConfirmMapping] = useState<Mapping | null>(null);

  const pendingCount = useMemo(() => mappings.filter((mapping) => !mapping.is_confirmed).length, [mappings]);
  const unmappedCount = unmappedQualifications.length;

  const filteredUnmapped = useMemo(() => {
    if (!unmappedSearch.trim()) return unmappedQualifications;
    const q = unmappedSearch.toLowerCase();
    return unmappedQualifications.filter((item) =>
      item.raw_qualification.toLowerCase().includes(q) ||
      item.sample_jobs.some((j) => j.title.toLowerCase().includes(q))
    );
  }, [unmappedQualifications, unmappedSearch]);

  const filteredMappings = useMemo(() => {
    return mappings.filter((mapping) => {
      const matchesSearch =
        !mappingSearch.trim() ||
        mapping.raw_qualification.toLowerCase().includes(mappingSearch.toLowerCase()) ||
        (mapping.qualification_domains?.name ?? "").toLowerCase().includes(mappingSearch.toLowerCase());
      
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "CONFIRMED" && mapping.is_confirmed) ||
        (statusFilter === "UNCONFIRMED" && !mapping.is_confirmed);

      return matchesSearch && matchesStatus;
    });
  }, [mappings, mappingSearch, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    const [mappingsRes, domainsRes] = await Promise.all([
      apiFetch("/api/admin/qualifications/mappings"),
      apiFetch("/api/admin/qualifications/domains"),
    ]);

    if (mappingsRes.ok) {
      const data = (await mappingsRes.json()) as MappingsResponse | Mapping[];
      const nextMappings = Array.isArray(data) ? data : data.mappings;
      const nextUnmapped = Array.isArray(data) ? [] : data.unmappedQualifications;
      setMappings(nextMappings);
      setUnmappedQualifications(nextUnmapped);
      setSelectedDomains(Object.fromEntries(nextMappings.map((mapping) => [mapping.id, mapping.domain_id ?? ""])));
    } else {
      toast.error(await readError(mappingsRes, "Failed to load mappings"));
    }

    if (domainsRes.ok) {
      setDomains(await domainsRes.json());
    } else {
      toast.error(await readError(domainsRes, "Failed to load domains"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const toggleSelectUnmapped = (key: string) => {
    const next = new Set(selectedUnmappedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedUnmappedKeys(next);
  };

  const toggleSelectAllUnmapped = () => {
    if (selectedUnmappedKeys.size === filteredUnmapped.length) {
      setSelectedUnmappedKeys(new Set());
    } else {
      setSelectedUnmappedKeys(new Set(filteredUnmapped.map((item) => rowKey(item.raw_qualification))));
    }
  };

  const runMappingAction = async (mappingId: string, body: Record<string, unknown>, success: string) => {
    setBusyId(mappingId);
    const res = await apiFetch("/api/admin/qualifications/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mappingId, ...body }),
    });

    if (res.ok) {
      toast.success(success);
      await fetchData();
    } else {
      toast.error(await readError(res, "Mapping update failed"));
    }
    setBusyId(null);
  };

  const handleClassify = async (rawQualification: string, mappingId?: string) => {
    const busyKey = mappingId ?? `unmapped:${rowKey(rawQualification)}`;
    setBusyId(busyKey);
    const res = await apiFetch("/api/admin/qualifications/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappingId, rawQualification }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.success(`Gemini identified ${data.domainName || "a domain"}`);
      await fetchData();
    } else {
      toast.error(await readError(res, "Classification failed"));
    }
    setBusyId(null);
  };

  // Batch Auto-Classify using Gemini for selected unmapped items
  const handleBatchClassify = async () => {
    const itemsToProcess = unmappedQualifications.filter((item) =>
      selectedUnmappedKeys.has(rowKey(item.raw_qualification))
    );
    if (itemsToProcess.length === 0) {
      toast.error("Select at least one unmapped qualification to auto-classify");
      return;
    }

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: itemsToProcess.length });
    let successCount = 0;

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      setBatchProgress({ current: i + 1, total: itemsToProcess.length });
      try {
        const res = await apiFetch("/api/admin/qualifications/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawQualification: item.raw_qualification }),
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Batch classification item error:", err);
      }
    }

    setIsBatchProcessing(false);
    setBatchProgress(null);
    setSelectedUnmappedKeys(new Set());
    toast.success(`Batch classification complete. ${successCount}/${itemsToProcess.length} classified successfully.`);
    await fetchData();
  };

  // Batch map selected unmapped items to a chosen domain
  const handleBatchMapDomain = async () => {
    if (!batchTargetDomain) {
      toast.error("Select a domain first to map selected items");
      return;
    }
    const itemsToProcess = unmappedQualifications.filter((item) =>
      selectedUnmappedKeys.has(rowKey(item.raw_qualification))
    );
    if (itemsToProcess.length === 0) {
      toast.error("Select at least one unmapped qualification");
      return;
    }

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: itemsToProcess.length });
    let successCount = 0;

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      setBatchProgress({ current: i + 1, total: itemsToProcess.length });
      try {
        const res = await apiFetch("/api/admin/qualifications/mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_MAPPING",
            rawQualification: item.raw_qualification,
            domainId: batchTargetDomain,
          }),
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Batch mapping error:", err);
      }
    }

    setIsBatchProcessing(false);
    setBatchProgress(null);
    setSelectedUnmappedKeys(new Set());
    setBatchTargetDomain("");
    toast.success(`Batch mapping complete. ${successCount}/${itemsToProcess.length} mapped successfully.`);
    await fetchData();
  };

  const saveManualDomain = async (mapping: Mapping) => {
    const domainId = selectedDomains[mapping.id];
    if (!domainId) {
      toast.error("Choose a domain first");
      return;
    }

    await runMappingAction(mapping.id, { action: "SET_DOMAIN", domainId, confirm: true }, "Domain assigned");
  };

  const mapUnmappedToDomain = async (item: UnmappedQualification) => {
    const key = rowKey(item.raw_qualification);
    const domainId = unmappedSelectedDomains[key];
    if (!domainId) {
      toast.error("Choose a domain first");
      return;
    }

    setBusyId(`unmapped:${key}`);
    const res = await apiFetch("/api/admin/qualifications/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_MAPPING", rawQualification: item.raw_qualification, domainId }),
    });

    if (res.ok) {
      toast.success("Job qualification mapped");
      await fetchData();
    } else {
      toast.error(await readError(res, "Failed to map qualification"));
    }
    setBusyId(null);
  };

  const createDomainAndMap = async (item: UnmappedQualification) => {
    const key = rowKey(item.raw_qualification);
    const form = newDomainForms[key] ?? emptyNewDomainForm;
    if (!form.name.trim()) {
      toast.error("New domain name is required");
      return;
    }

    setBusyId(`new-domain:${key}`);
    const res = await apiFetch("/api/admin/qualifications/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_DOMAIN_AND_MAP",
        rawQualification: item.raw_qualification,
        name: form.name,
        description: form.description,
        keywords: form.keywords,
      }),
    });

    if (res.ok) {
      toast.success("New domain created and mapped");
      setNewDomainForms({ ...newDomainForms, [key]: emptyNewDomainForm });
      setExpandedCreateDomain({ ...expandedCreateDomain, [key]: false });
      await fetchData();
    } else {
      toast.error(await readError(res, "Failed to create and map domain"));
    }
    setBusyId(null);
  };

  const updateNewDomainForm = (key: string, patch: Partial<NewDomainForm>) => {
    setNewDomainForms({
      ...newDomainForms,
      [key]: { ...(newDomainForms[key] ?? emptyNewDomainForm), ...patch },
    });
  };

  return (
    <section className="space-y-5">
      {/* UNMAPPED JOB QUALIFICATIONS SECTION */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Unmapped Active Job Qualifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Qualifications found on currently active jobs whose domain is not yet classified.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchData()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <div className="rounded-md bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
              {unmappedCount} unmapped
            </div>
          </div>
        </div>

        {/* Search & Bulk Action Bar */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={unmappedSearch}
              onChange={(e) => setUnmappedSearch(e.target.value)}
              placeholder="Filter unmapped qualifications..."
              className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {selectedUnmappedKeys.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-2 dark:border-emerald-900 dark:bg-emerald-950/40">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {selectedUnmappedKeys.size} selected
              </span>
              <button
                onClick={handleBatchClassify}
                disabled={isBatchProcessing}
                className="inline-flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {isBatchProcessing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                Auto-Classify (Gemini)
              </button>

              <div className="flex items-center gap-1">
                <select
                  value={batchTargetDomain}
                  onChange={(e) => setBatchTargetDomain(e.target.value)}
                  className="h-8 rounded border border-slate-300 bg-white text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Select Domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBatchMapDomain}
                  disabled={isBatchProcessing || !batchTargetDomain}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isBatchProcessing ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
                  Map Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {batchProgress && (
          <div className="mt-3 flex items-center gap-3 rounded-md bg-purple-50 p-3 text-xs text-purple-900 dark:bg-purple-950/60 dark:text-purple-200">
            <Loader2 size={16} className="animate-spin text-purple-600" />
            <span>Processing batch item {batchProgress.current} of {batchProgress.total}...</span>
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" /> Loading job qualifications
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-[40px_1.3fr_90px_1fr_190px] bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <input
                type="checkbox"
                checked={filteredUnmapped.length > 0 && selectedUnmappedKeys.size === filteredUnmapped.length}
                onChange={toggleSelectAllUnmapped}
                className="rounded border-slate-300"
              />
              <span>Qualification</span>
              <span>Jobs</span>
              <span>Map To Domain</span>
              <span className="text-right">Actions</span>
            </div>
            {filteredUnmapped.map((item) => {
              const key = rowKey(item.raw_qualification);
              const isBusy = busyId === `unmapped:${key}` || busyId === `new-domain:${key}`;
              const form = newDomainForms[key] ?? emptyNewDomainForm;
              const isSelected = selectedUnmappedKeys.has(key);

              return (
                <div key={key} className={`border-t border-slate-200 px-4 py-4 dark:border-slate-800 ${isSelected ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""}`}>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[40px_1.3fr_90px_1fr_190px] lg:items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectUnmapped(key)}
                      className="rounded border-slate-300"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.raw_qualification}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.sample_jobs.map((job) => job.title).join(", ")}</p>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.job_count}</div>
                    <select
                      value={unmappedSelectedDomains[key] ?? ""}
                      onChange={(e) => setUnmappedSelectedDomains({ ...unmappedSelectedDomains, [key]: e.target.value })}
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Select existing domain</option>
                      {domains.map((domain) => (
                        <option key={domain.id} value={domain.id}>
                          {domain.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => mapUnmappedToDomain(item)}
                        disabled={isBusy}
                        className="rounded-md p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950"
                        title="Map to selected domain"
                      >
                        <Save size={18} />
                      </button>
                      <button
                        onClick={() => handleClassify(item.raw_qualification)}
                        disabled={isBusy || domains.length === 0}
                        className="rounded-md p-2 text-purple-700 hover:bg-purple-50 disabled:opacity-60 dark:text-purple-400 dark:hover:bg-purple-950"
                        title="Force identify with Gemini"
                      >
                        {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                      </button>
                      <button
                        onClick={() => setExpandedCreateDomain({ ...expandedCreateDomain, [key]: !expandedCreateDomain[key] })}
                        disabled={isBusy}
                        className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950"
                        title="Create new domain"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  {expandedCreateDomain[key] && (
                    <div className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30 md:grid-cols-[1fr_1fr_1.3fr_auto]">
                      <input
                        value={form.name}
                        onChange={(e) => updateNewDomainForm(key, { name: e.target.value })}
                        placeholder="New domain name"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      />
                      <input
                        value={form.description}
                        onChange={(e) => updateNewDomainForm(key, { description: e.target.value })}
                        placeholder="Description"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      />
                      <input
                        value={form.keywords}
                        onChange={(e) => updateNewDomainForm(key, { keywords: e.target.value })}
                        placeholder="Keywords, comma separated"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      />
                      <button
                        onClick={() => createDomainAndMap(item)}
                        disabled={isBusy}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {busyId === `new-domain:${key}` ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Create
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredUnmapped.length === 0 && (
              <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
                {unmappedQualifications.length === 0
                  ? "Every active job qualification found has a classified domain."
                  : "No unmapped qualifications match your search query."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUALIFICATION MAPPING REVIEW SECTION */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Qualification Mapping Review</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Review saved domain mappings, reclassify with Gemini, or manage status.</p>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {pendingCount} pending
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={mappingSearch}
              onChange={(e) => setMappingSearch(e.target.value)}
              placeholder="Search mappings by title or domain..."
              className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            <Filter size={14} className="ml-1 text-slate-400" />
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${statusFilter === "ALL" ? "bg-white text-slate-900 shadow dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
            >
              All ({mappings.length})
            </button>
            <button
              onClick={() => setStatusFilter("UNCONFIRMED")}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${statusFilter === "UNCONFIRMED" ? "bg-white text-amber-800 shadow dark:bg-slate-800 dark:text-amber-300" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("CONFIRMED")}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${statusFilter === "CONFIRMED" ? "bg-white text-emerald-800 shadow dark:bg-slate-800 dark:text-emerald-300" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Confirmed ({mappings.length - pendingCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" /> Loading mappings
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_150px] bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <span>Qualification</span>
              <span>Current Domain</span>
              <span>Set Domain</span>
              <span className="text-right">Actions</span>
            </div>
            {filteredMappings.map((mapping) => (
              <div key={mapping.id} className="grid grid-cols-1 gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 lg:grid-cols-[1.5fr_1fr_1fr_150px] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{mapping.raw_qualification}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{mapping.is_confirmed ? "Confirmed" : "Needs review"}</p>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{mapping.qualification_domains?.name || "Unknown / Unclassified"}</div>
                <select
                  value={selectedDomains[mapping.id] ?? ""}
                  onChange={(e) => setSelectedDomains({ ...selectedDomains, [mapping.id]: e.target.value })}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Select domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => saveManualDomain(mapping)}
                    disabled={busyId === mapping.id}
                    className="rounded-md p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950"
                    title="Save selected domain"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => handleClassify(mapping.raw_qualification, mapping.id)}
                    disabled={busyId === mapping.id || domains.length === 0}
                    className="rounded-md p-2 text-purple-700 hover:bg-purple-50 disabled:opacity-60 dark:text-purple-400 dark:hover:bg-purple-950"
                    title="Force identify with Gemini"
                  >
                    {busyId === mapping.id ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                  </button>
                  {!mapping.is_confirmed && (
                    <button
                      onClick={() => runMappingAction(mapping.id, { action: "CONFIRM" }, "Mapping confirmed")}
                      disabled={busyId === mapping.id}
                      className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950"
                      title="Confirm mapping"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirmMapping(mapping)}
                    disabled={busyId === mapping.id}
                    className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
                    title="Delete mapping"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {filteredMappings.length === 0 && (
              <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
                {mappings.length === 0 ? "No qualification mappings yet." : "No qualification mappings match your search/filter criteria."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Delete Qualification Mapping?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete the mapping for <strong className="text-slate-950 dark:text-white">"{deleteConfirmMapping.raw_qualification}"</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmMapping(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const m = deleteConfirmMapping;
                  setDeleteConfirmMapping(null);
                  void runMappingAction(m.id, { action: "DELETE" }, "Mapping deleted");
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
