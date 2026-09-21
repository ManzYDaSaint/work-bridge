"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, GraduationCap, Briefcase, Wrench, Sparkles } from "lucide-react";

export interface UniversalMatchBadgeProps {
  score: number;
  qualificationPassed?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function MatchScoreBadge({
  score,
  qualificationPassed = true,
  size = "md",
  showLabel = true,
  className = "",
}: UniversalMatchBadgeProps) {
  let colorStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  let icon = <CheckCircle2 className="w-3.5 h-3.5" />;

  if (!qualificationPassed || score < 50) {
    colorStyle = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    icon = <XCircle className="w-3.5 h-3.5" />;
  } else if (score < 80) {
    colorStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    icon = <AlertTriangle className="w-3.5 h-3.5" />;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold gap-1",
    md: "px-2.5 py-1 text-sm font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-base font-bold gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-xs transition-all ${colorStyle} ${sizeClasses} ${className}`}
    >
      {icon}
      <span>{score}%</span>
      {showLabel && <span className="opacity-75 text-[0.85em] font-medium">Match</span>}
    </span>
  );
}

export interface UniversalMatchBreakdownProps {
  telemetry: {
    score: number;
    qualificationPassed: boolean;
    candidateEducationTitle: string | null;
    requiredQualificationTitle: string | null;
    experiencePassed: boolean;
    candidateYearsExperience: number;
    requiredYearsExperience: number;
    skillsPassed: boolean;
    matchedSkills: string[];
    missingSkills: string[];
    reasons: string[];
  };
  compact?: boolean;
}

export function MatchTelemetryBreakdown({ telemetry, compact = false }: UniversalMatchBreakdownProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-sm">
      {/* Qualification Bar */}
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <GraduationCap className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Qualification Title</span>
        </div>
        <div className="text-right">
          <span
            className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
              telemetry.qualificationPassed
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
            }`}
          >
            {telemetry.candidateEducationTitle || "None Specified"}
          </span>
          {!compact && (
            <p className="text-xs text-slate-500 mt-0.5">Required: {telemetry.requiredQualificationTitle}</p>
          )}
        </div>
      </div>

      {/* Experience Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <Briefcase className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>Experience</span>
        </div>
        <div className="text-right font-medium text-slate-700 dark:text-slate-300">
          <span>{telemetry.candidateYearsExperience} yrs</span>
          <span className="text-xs text-slate-400 font-normal ml-1">(Req: {telemetry.requiredYearsExperience} yrs)</span>
        </div>
      </div>

      {/* Skills */}
      {(telemetry.matchedSkills.length > 0 || telemetry.missingSkills.length > 0) && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <Wrench className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <span>Skills Compatibility</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-6">
            {telemetry.matchedSkills.map((sk) => (
              <span key={sk} className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                ✓ {sk}
              </span>
            ))}
            {telemetry.missingSkills.map((sk) => (
              <span key={sk} className="px-2 py-0.5 text-xs rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                ✕ {sk}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
