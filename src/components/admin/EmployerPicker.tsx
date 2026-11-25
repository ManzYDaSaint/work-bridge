"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Building2, Plus, Check, Loader2, Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type EmployerOption = {
    id: string;
    company_name: string;
    industry?: string | null;
    location?: string | null;
    website?: string | null;
    recruitment_email?: string | null;
    recruitment_url?: string | null;
    account_type?: string | null;
    status?: string | null;
};

interface EmployerPickerProps {
    value?: string; // employer_id
    companyName?: string;
    onChange: (employer: EmployerOption | null) => void;
    inputClass?: string;
}

export function EmployerPicker({ value, companyName, onChange, inputClass }: EmployerPickerProps) {
    const [query, setQuery] = useState(companyName || "");
    const [selectedEmployer, setSelectedEmployer] = useState<EmployerOption | null>(null);
    const [results, setResults] = useState<EmployerOption[]>([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    // Create lead form state
    const [createForm, setCreateForm] = useState({
        companyName: "",
        website: "",
        industry: "",
        location: "",
        recruitmentEmail: "",
        recruitmentUrl: "",
    });

    const wrapperRef = useRef<HTMLDivElement>(null);

    // Keep query synced with external companyName if provided
    useEffect(() => {
        if (companyName && !selectedEmployer) {
            setQuery(companyName);
        }
    }, [companyName, selectedEmployer]);

    // Set mounted=true after client-side hydration so createPortal can access document.body
    useEffect(() => { setMounted(true); }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search query with debounce
    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/admin/employers/search?q=${encodeURIComponent(query.trim())}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.employers || []);
                }
            } catch (err) {
                console.error("Failed to search employers:", err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (emp: EmployerOption) => {
        setSelectedEmployer(emp);
        setQuery(emp.company_name);
        setOpen(false);
        onChange(emp);
    };

    const handleClear = () => {
        setSelectedEmployer(null);
        setQuery("");
        onChange(null);
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling to the outer job form
        const trimmedName = createForm.companyName.trim() || query.trim();
        if (!trimmedName) {
            toast.error("Company name is required");
            return;
        }
        const trimmedEmail = createForm.recruitmentEmail.trim();
        if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            toast.error("Please enter a valid recruitment email address");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/admin/employers/lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName: trimmedName,
                    website: createForm.website,
                    industry: createForm.industry,
                    location: createForm.location,
                    recruitmentEmail: createForm.recruitmentEmail,
                    recruitmentUrl: createForm.recruitmentUrl,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create employer lead");

            toast.success(data.message || `Lead created for ${trimmedName}`);
            const newEmp = data.employer;
            setSelectedEmployer(newEmp);
            setQuery(newEmp.company_name);
            setShowCreateModal(false);
            setOpen(false);
            onChange(newEmp);
        } catch (err: any) {
            toast.error(err.message || "Failed to create employer lead");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative space-y-1">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {searching ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} />}
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedEmployer(null);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search or select hiring company..."
                    className={cn(
                        inputClass || "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                        selectedEmployer && "font-medium text-blue-600 dark:text-blue-400"
                    )}
                />

                {selectedEmployer && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        Change
                    </button>
                )}
            </div>

            {/* Selected Employer Badge */}
            {selectedEmployer && (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className={cn(
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        selectedEmployer.account_type === "LEAD"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    )}>
                        {selectedEmployer.account_type === "LEAD" ? "CRM Lead" : "Registered Employer"}
                    </span>
                    {selectedEmployer.recruitment_email && (
                        <span className="flex items-center gap-1">
                            <Mail size={12} /> {selectedEmployer.recruitment_email}
                        </span>
                    )}
                </div>
            )}

            {/* Autocomplete Dropdown */}
            {open && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 py-1">
                    {searching ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500 dark:text-slate-400">
                            <Loader2 size={14} className="animate-spin text-blue-500" />
                            Searching employers...
                        </div>
                    ) : query.trim().length < 2 ? (
                        <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                            Type at least 2 characters to search existing employers...
                        </div>
                    ) : results.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {results.map((emp, idx) => (
                                <button
                                    key={emp.id}
                                    type="button"
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    onClick={() => handleSelect(emp)}
                                    className={cn(
                                        "w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition text-xs",
                                        activeIndex === idx
                                            ? "bg-blue-50/80 dark:bg-blue-950/40"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                    )}
                                >
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={13} className="shrink-0 text-slate-400" />
                                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {emp.company_name}
                                            </span>
                                            <span className={cn(
                                                "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                emp.account_type === "LEAD"
                                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                            )}>
                                                {emp.account_type === "LEAD" ? "LEAD" : "REGISTERED"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-5">
                                            {[emp.industry, emp.location, emp.recruitment_email].filter(Boolean).join(" • ") || "No additional details"}
                                        </p>
                                    </div>
                                    {selectedEmployer?.id === emp.id && (
                                        <Check size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center space-y-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                No existing employer found matching &ldquo;<span className="font-semibold text-slate-700 dark:text-slate-200">{query.trim()}</span>&rdquo;.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setCreateForm((prev) => ({ ...prev, companyName: query.trim() }));
                                    setShowCreateModal(true);
                                    setOpen(false);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                            >
                                <Plus size={14} /> + New Employer Lead
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Create Lead Modal – rendered via portal to avoid nesting inside the outer <form> */}
            {showCreateModal && mounted && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 size={16} className="text-blue-600" /> Create Sourced Employer Lead
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-xs"
                            >
                                Cancel
                            </button>
                        </div>

                        <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
                            <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Company Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={createForm.companyName}
                                    onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                                    placeholder="e.g. Standard Bank Malawi"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="font-medium text-slate-700 dark:text-slate-300">Industry</label>
                                    <input
                                        type="text"
                                        value={createForm.industry}
                                        onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                                        placeholder="e.g. Banking"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-medium text-slate-700 dark:text-slate-300">Location</label>
                                    <input
                                        type="text"
                                        value={createForm.location}
                                        onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                                        placeholder="e.g. Blantyre, Malawi"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Official Website</label>
                                <input
                                    type="url"
                                    value={createForm.website}
                                    onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                                    placeholder="https://company.com"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Recruitment / HR Email</label>
                                <input
                                    type="email"
                                    value={createForm.recruitmentEmail}
                                    onChange={(e) => setCreateForm({ ...createForm, recruitmentEmail: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                                    placeholder="careers@company.com"
                                />
                                <p className="text-[10px] text-slate-400">Used for sending claim invitations and candidate matches.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="font-medium text-slate-700 dark:text-slate-300">Careers Page / ATS URL</label>
                                <input
                                    type="url"
                                    value={createForm.recruitmentUrl}
                                    onChange={(e) => setCreateForm({ ...createForm, recruitmentUrl: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                                    placeholder="https://company.com/careers"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5"
                                >
                                    {creating && <Loader2 size={12} className="animate-spin" />}
                                    Create Lead &amp; Select
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
