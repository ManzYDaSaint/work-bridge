import React from "react";
import { CheckCircle2 } from "lucide-react";

interface VerifiedBadgeProps {
    isVerified?: boolean;
    className?: string;
    tooltip?: string;
}

export default function VerifiedBadge({ 
    isVerified = false, 
    className = "", 
    tooltip = "Verified Employer" 
}: VerifiedBadgeProps) {
    if (!isVerified) return null;

    return (
        <div 
            className={`group relative inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-500/30 ${className}`}
            title={tooltip}
        >
            <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span>{tooltip}</span>
        </div>
    );
}
