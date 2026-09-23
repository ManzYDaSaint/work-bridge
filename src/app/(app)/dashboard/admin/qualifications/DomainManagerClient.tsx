"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Check, Edit2, Loader2, Plus, Tags, Trash2, X } from "lucide-react";

type Domain = {
  id: string;
  name: string;
  description: string | null;
  keywords: string[] | null;
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
    if (!confirm("Delete this domain? Existing mappings that use it may need review.")) return;

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

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Domain Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create, edit, and delete the domain labels used by qualification matching.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Tags size={16} />
          {domains.length} domains
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 md:grid-cols-[1fr_1fr_1.5fr_auto]">
        <input value={newDomain.name} onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })} placeholder="Domain name" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        <input value={newDomain.description} onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })} placeholder="Description" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        <input value={newDomain.keywords} onChange={(e) => setNewDomain({ ...newDomain, keywords: e.target.value })} placeholder="Keywords, comma separated" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        <button onClick={handleCreate} disabled={saving === "new"} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60" title="Create domain">
          {saving === "new" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add
        </button>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading domains</div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[1fr_1fr_1.3fr_96px] bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <span>Name</span><span>Description</span><span>Keywords</span><span className="text-right">Actions</span>
          </div>
          {sortedDomains.map((domain) => (
            <div key={domain.id} className="grid grid-cols-1 gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 md:grid-cols-[1fr_1fr_1.3fr_96px] md:items-center">
              {editingId === domain.id ? (
                <>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                  <input value={editForm.keywords} onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleUpdate(domain.id)} disabled={saving === domain.id} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950" title="Save domain">{saving === domain.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}</button>
                    <button onClick={() => setEditingId(null)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" title="Cancel edit"><X size={18} /></button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">{domain.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{domain.description || "No description"}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{keywordsToString(domain.keywords) || "No keywords"}</div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(domain)} className="rounded-md p-2 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950" title="Edit domain"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(domain.id)} disabled={saving === domain.id} className="rounded-md p-2 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" title="Delete domain">{saving === domain.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {sortedDomains.length === 0 && <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">No qualification domains yet.</div>}
        </div>
      )}
    </section>
  );
}
