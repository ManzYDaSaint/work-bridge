"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Check, Edit2, GitMerge, Loader2, Plus, Sparkles, Tags, Trash2, X } from "lucide-react";

type Domain = {
  id: string;
  name: string;
  description: string | null;
  keywords: string[] | null;
  mapping_count?: number;
  created_at?: string;
};

type DomainForm = {
  name: string;
  description: string;
  keywords: string;
};

const emptyForm: DomainForm = { name: "", description: "", keywords: "" };

function keywordsToString(keywords?: string[] | null) {
  return (keywords ?? []).join(", ");
}

function domainPayload(form: DomainForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    keywords: form.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
  };
}

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body?.error === "string" ? body.error : fallback;
}

export default function DomainManagerClient() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DomainForm>(emptyForm);
  const [newDomain, setNewDomain] = useState<DomainForm>(emptyForm);
  const [generatingKeywords, setGeneratingKeywords] = useState<string | null>(null);

  // Merge modal state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [sourceDomainId, setSourceDomainId] = useState("");
  const [targetDomainId, setTargetDomainId] = useState("");
  const [merging, setMerging] = useState(false);

  const sortedDomains = useMemo(
    () => [...domains].sort((a, b) => a.name.localeCompare(b.name)),
    [domains]
  );

  const fetchDomains = async () => {
    setLoading(true);
    const res = await apiFetch("/api/admin/qualifications/domains");
    if (res.ok) {
      setDomains(await res.json());
    } else {
      toast.error(await readError(res, "Failed to load domains"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchDomains();
  }, []);

  const handleGenerateKeywords = async (domainName: string, description: string, isEditMode: boolean) => {
    if (!domainName.trim()) {
      toast.error("Type a domain name first to auto-generate keywords");
      return;
    }

    const modeKey = isEditMode ? "edit" : "new";
    setGeneratingKeywords(modeKey);

    const res = await apiFetch("/api/admin/qualifications/domains/generate-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainName, description }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const generatedList: string[] = data.keywords ?? [];
      if (generatedList.length > 0) {
        const keywordStr = generatedList.join(", ");
        if (isEditMode) {
          setEditForm((prev) => ({
            ...prev,
            keywords: prev.keywords ? `${prev.keywords}, ${keywordStr}` : keywordStr,
          }));
        } else {
          setNewDomain((prev) => ({
            ...prev,
            keywords: prev.keywords ? `${prev.keywords}, ${keywordStr}` : keywordStr,
          }));
        }
        toast.success(`Generated ${generatedList.length} keywords`);
      } else {
        toast.error("No keywords returned");
      }
    } else {
      toast.error(await readError(res, "Failed to generate keywords"));
    }

    setGeneratingKeywords(null);
  };

  const handleCreate = async () => {
    const payload = domainPayload(newDomain);
    if (!payload.name) {
      toast.error("Domain name is required");
      return;
    }

    setSaving("new");
    const res = await apiFetch("/api/admin/qualifications/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Domain created");
      setNewDomain(emptyForm);
      await fetchDomains();
    } else {
      toast.error(await readError(res, "Failed to create domain"));
    }
    setSaving(null);
  };

  const startEdit = (domain: Domain) => {
    setEditingId(domain.id);
    setEditForm({
      name: domain.name,
      description: domain.description ?? "",
      keywords: keywordsToString(domain.keywords),
    });
  };

  const handleUpdate = async (id: string) => {
    const payload = domainPayload(editForm);
    if (!payload.name) {
      toast.error("Domain name is required");
      return;
    }

    setSaving(id);
    const res = await apiFetch("/api/admin/qualifications/domains", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });

    if (res.ok) {
      toast.success("Domain updated");
      setEditingId(null);
      await fetchDomains();
    } else {
      toast.error(await readError(res, "Failed to update domain"));
    }
    setSaving(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this domain? Existing mappings that use it will be unassigned.")) return;

    setSaving(id);
    const res = await apiFetch("/api/admin/qualifications/domains", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      toast.success("Domain deleted");
      await fetchDomains();
    } else {
      toast.error(await readError(res, "Failed to delete domain"));
    }
    setSaving(null);
  };

  const handleMergeDomains = async () => {
    if (!sourceDomainId || !targetDomainId) {
      toast.error("Select both source and target domains");
      return;
    }
    if (sourceDomainId === targetDomainId) {
      toast.error("Source and target domains must be different");
      return;
    }

    setMerging(true);
    const res = await apiFetch("/api/admin/qualifications/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "MERGE",
        sourceDomainId,
        targetDomainId,
      }),
    });

    if (res.ok) {
      toast.success("Domains merged successfully");
      setMergeModalOpen(false);
      setSourceDomainId("");
      setTargetDomainId("");
      await fetchDomains();
    } else {
      toast.error(await readError(res, "Merge failed"));
    }
    setMerging(false);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Domain Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create, edit, auto-generate keywords, or merge domain labels.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMergeModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <GitMerge size={14} className="text-purple-600 dark:text-purple-400" /> Merge Domains
          </button>
          <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Tags size={16} />
            {domains.length} domains
          </div>
        </div>
      </div>

      {/* CREATE DOMAIN CARD */}
      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 md:grid-cols-[1fr_1fr_1.5fr_auto]">
        <input
          value={newDomain.name}
          onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })}
          placeholder="Domain name (e.g. Software Engineering)"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <input
          value={newDomain.description}
          onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })}
          placeholder="Description"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <div className="relative flex items-center">
          <input
            value={newDomain.keywords}
            onChange={(e) => setNewDomain({ ...newDomain, keywords: e.target.value })}
            placeholder="Keywords, comma separated"
            className="w-full rounded-md border border-slate-300 bg-white pr-24 pl-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="button"
            onClick={() => handleGenerateKeywords(newDomain.name, newDomain.description, false)}
            disabled={generatingKeywords === "new" || !newDomain.name.trim()}
            className="absolute right-1 inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-200 disabled:opacity-50 dark:bg-purple-950 dark:text-purple-300"
            title="Auto-generate relevant keywords using Gemini AI"
          >
            {generatingKeywords === "new" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Keywords
          </button>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving === "new"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          title="Create domain"
        >
          {saving === "new" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add
        </button>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" /> Loading domains
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[1fr_1fr_1.3fr_90px_96px] bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <span>Name</span>
            <span>Description</span>
            <span>Keywords</span>
            <span>Usage</span>
            <span className="text-right">Actions</span>
          </div>
          {sortedDomains.map((domain) => (
            <div key={domain.id} className="grid grid-cols-1 gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 md:grid-cols-[1fr_1fr_1.3fr_90px_96px] md:items-center">
              {editingId === domain.id ? (
                <>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <div className="relative flex items-center">
                    <input
                      value={editForm.keywords}
                      onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                      className="w-full rounded-md border border-slate-300 pr-24 pl-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => handleGenerateKeywords(editForm.name, editForm.description, true)}
                      disabled={generatingKeywords === "edit" || !editForm.name.trim()}
                      className="absolute right-1 inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-200 disabled:opacity-50 dark:bg-purple-950 dark:text-purple-300"
                    >
                      {generatingKeywords === "edit" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Keywords
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">{domain.mapping_count ?? 0} mapped</div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleUpdate(domain.id)}
                      disabled={saving === domain.id}
                      className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                      title="Save domain"
                    >
                      {saving === domain.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                      title="Cancel edit"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">{domain.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{domain.description || "No description"}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{keywordsToString(domain.keywords) || "No keywords"}</div>
                  <div>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {domain.mapping_count ?? 0} mapped
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(domain)}
                      className="rounded-md p-2 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                      title="Edit domain"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(domain.id)}
                      disabled={saving === domain.id}
                      className="rounded-md p-2 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      title="Delete domain"
                    >
                      {saving === domain.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {sortedDomains.length === 0 && (
            <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
              No qualification domains yet.
            </div>
          )}
        </div>
      )}

      {/* MERGE DOMAINS MODAL */}
      {mergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
              <GitMerge size={20} className="text-purple-600" />
              <span>Merge Qualification Domains</span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Reassign all qualifications mapped to the duplicate (source) domain into a target domain, then delete the duplicate.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Source Domain (Duplicate to delete)</label>
                <select
                  value={sourceDomainId}
                  onChange={(e) => setSourceDomainId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select source domain</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.mapping_count ?? 0} mappings)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Destination Domain (Keep)</label>
                <select
                  value={targetDomainId}
                  onChange={(e) => setTargetDomainId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select destination domain</option>
                  {domains
                    .filter((d) => d.id !== sourceDomainId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.mapping_count ?? 0} mappings)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setMergeModalOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeDomains}
                disabled={merging || !sourceDomainId || !targetDomainId}
                className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {merging ? <Loader2 size={16} className="animate-spin" /> : <GitMerge size={16} />}
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
