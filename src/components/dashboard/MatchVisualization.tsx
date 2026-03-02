"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MatchVisualizationProps {
    score: number;
    subScores: {
        skills: number;
        keywords: number;
        potential: number;
    };
    className?: string;
}

export const MatchVisualization: React.FC<MatchVisualizationProps> = ({
    score,
    subScores,
    className,
}) => {
    const categories = [
        { label: "Technical Skills", value: subScores.skills, color: "bg-blue-500" },
        { label: "Keyword Alignment", value: subScores.keywords, color: "bg-emerald-500" },
        { label: "Growth Potential", value: subScores.potential, color: "bg-amber-500" },
    ];

    return (
        <div className={cn("p-4 bg-base-200 rounded-xl space-y-4", className)}>
            <div className="flex justify-between items-end">
                <div>
                    <h4 className="text-sm font-semibold opacity-70 uppercase tracking-wider">
                        Semantic Match Profile
                    </h4>
                    <div className="text-3xl font-bold text-primary">{score}%</div>
                </div>
                <div className="badge badge-primary badge-outline font-mono uppercase">
                    Verified
                </div>
            </div>

            <div className="space-y-3">
                {categories.map((cat) => (
                    <div key={cat.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span>{cat.label}</span>
                            <span className="font-mono">{cat.value}%</span>
                        </div>
                        <div className="w-full bg-base-300 h-2 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-1000", cat.color)}
                                style={{ width: `${cat.value}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-[10px] opacity-50 italic text-center">
                Visualization based on AI-expanded skill semantic analysis.
            </p>
        </div>
    );
};
