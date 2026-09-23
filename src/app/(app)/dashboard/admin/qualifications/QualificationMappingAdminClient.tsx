"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Bot, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";

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

  const pendingCount = useMemo(() => mappings.filter((mapping) => !mapping.is_confirmed).length, [mappings]);
  const unmappedCount = unmappedQualifications.length;

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
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Unmapped Job Qualifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Qualifications found on jobs but not yet saved in the domain mapping table.</p>
          </div>
          <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-200">{unmappedCount} unmapped</div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading job qualifications</div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-[1.3fr_90px_1fr_190px] bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <span>Qualification</span><span>Jobs</span><span>Map To Domain</span><span className="text-right">Actions</span>
            </div>
            {unmappedQualifications.map((item) => {
              const key = rowKey(item.raw_qualification);
              const isBusy = busyId === `unmapped:${key}` || busyId === `new-domain:${key}`;
              const form = newDomainForms[key] ?? emptyNewDomainForm;

              return (
                <div key={key} className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_90px_1fr_190px] lg:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.raw_qualification}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.sample_jobs.map((job) => job.title).join(", ")}</p>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.job_count}</div>
                    <select value={unmappedSelectedDomains[key] ?? ""} onChange={(e) => setUnmappedSelectedDomains({ ...unmappedSelectedDomains, [key]: e.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                      <option value="">Select existing domain</option>
                      {domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
                    </select>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => mapUnmappedToDomain(item)} disabled={isBusy} className="rounded-md p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950" title="Map to selected domain"><Save size={18} /></button>
                      <button onClick={() => handleClassify(item.raw_qualification)} disabled={isBusy || domains.length === 0} className="rounded-md p-2 text-purple-700 hover:bg-purple-50 disabled:opacity-60 dark:text-purple-400 dark:hover:bg-purple-950" title="Force identify with Gemini">{isBusy ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}</button>
                      <button onClick={() => setExpandedCreateDomain({ ...expandedCreateDomain, [key]: !expandedCreateDomain[key] })} disabled={isBusy} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950" title="Create new domain"><Plus size={18} /></button>
                    </div>
                  </div>

                  {expandedCreateDomain[key] && (
                    <div className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30 md:grid-cols-[1fr_1fr_1.3fr_auto]">
                      <input value={form.name} onChange={(e) => updateNewDomainForm(key, { name: e.target.value })} placeholder="New domain name" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                      <input value={form.description} onChange={(e) => updateNewDomainForm(key, { description: e.target.value })} placeholder="Description" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                      <input value={form.keywords} onChange={(e) => updateNewDomainForm(key, { keywords: e.target.value })} placeholder="Keywords, comma separated" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                      <button onClick={() => createDomainAndMap(item)} disabled={isBusy} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                        {busyId === `new-domain:${key}` ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Create
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {unmappedQualifications.length === 0 && <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">Every job qualification found in the latest scan has a mapping record.</div>}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Qualification Mapping Review</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Assign domains manually or force-identify a qualification with Gemini 3.1 Flash Lite.</p>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">{pendingCount} pending</div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading mappings</div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_150px] bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <span>Qualification</span><span>Current Domain</span><span>Set Domain</span><span className="text-right">Actions</span>
            </div>
            {mappings.map((mapping) => (
              <div key={mapping.id} className="grid grid-cols-1 gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 lg:grid-cols-[1.5fr_1fr_1fr_150px] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{mapping.raw_qualification}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{mapping.is_confirmed ? "Confirmed" : "Needs review"}</p>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{mapping.qualification_domains?.name || "Unknown"}</div>
                <select value={selectedDomains[mapping.id] ?? ""} onChange={(e) => setSelectedDomains({ ...selectedDomains, [mapping.id]: e.target.value })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                  <option value="">Select domain</option>
                  {domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => saveManualDomain(mapping)} disabled={busyId === mapping.id} className="rounded-md p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950" title="Save selected domain"><Save size={18} /></button>
                  <button onClick={() => handleClassify(mapping.raw_qualification, mapping.id)} disabled={busyId === mapping.id || domains.length === 0} className="rounded-md p-2 text-purple-700 hover:bg-purple-50 disabled:opacity-60 dark:text-purple-400 dark:hover:bg-purple-950" title="Force identify with Gemini">{busyId === mapping.id ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}</button>
                  {!mapping.is_confirmed && (
                    <button onClick={() => runMappingAction(mapping.id, { action: "CONFIRM" }, "Mapping confirmed")} disabled={busyId === mapping.id} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-950" title="Confirm mapping"><CheckCircle2 size={18} /></button>
                  )}
                  <button onClick={() => runMappingAction(mapping.id, { action: "DELETE" }, "Mapping deleted")} disabled={busyId === mapping.id} className="rounded-md p-2 text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950" title="Delete mapping"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
            {mappings.length === 0 && <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">No qualification mappings yet.</div>}
          </div>
        )}
      </div>
    </section>
  );
}
