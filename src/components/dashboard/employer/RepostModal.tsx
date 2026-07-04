"use client";

import { useState } from "react";
import { Loader2, Calendar, X } from "lucide-react";

export default function RepostModal({
    onConfirm,
    onClose,
    loading,
}: {
    onConfirm: (deadline: string) => void;
    onClose: () => void;
    loading: boolean;
}) {
    const [deadline, setDeadline] = useState(() => {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm rounded-[2rem] border border-stone-200 bg-[#fbf8f1] p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-900"
                >
                    <X size={18} />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800">
                        <Calendar size={18} className="text-[#16324f]" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Repost this role</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Set a new application deadline</p>
                    </div>
                </div>
                <input
                    type="date"
                    value={deadline}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-stone-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <div className="mt-4 flex items-center gap-3">
                    <button
                        onClick={() => onConfirm(deadline)}
                        disabled={loading || !deadline}
                        className="flex-1 rounded-xl bg-[#16324f] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Repost Role"}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
