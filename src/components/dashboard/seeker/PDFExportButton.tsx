"use client";

import { Download, Printer } from "lucide-react";
import { generateCVHTML, ExportCVData } from "@/lib/cv-pdf";

interface PDFExportButtonProps {
    profile: ExportCVData;
}

export default function PDFExportButton({ profile }: PDFExportButtonProps) {
    const handleExport = () => {
        const html = generateCVHTML(profile);
        const win = window.open("", "_blank");
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    };

    return (
        <button
            onClick={handleExport}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
            <Download size={14} className="text-amber-500" />
            Export PDF CV
        </button>
    );
}
