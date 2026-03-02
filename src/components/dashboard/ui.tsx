import { cn } from "@/lib/utils";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

// ─── PageHeader ──────────────────────────────────────────────────
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
        icon?: LucideIcon;
        variant?: "primary" | "secondary";
    };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
    const btnClass = cn(
        "h-9 px-5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm",
        action?.variant === "secondary"
            ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
    );

    return (
        <div className="flex items-start justify-between gap-4 mb-6">
            <div>
                <h2 className="text-xl font-black text-slate-900">{title}</h2>
                {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action && (
                action.href ? (
                    <Link href={action.href} className={btnClass}>
                        {action.icon && <action.icon size={16} strokeWidth={2.5} />}
                        {action.label}
                    </Link>
                ) : (
                    <button onClick={action.onClick} className={btnClass}>
                        {action.icon && <action.icon size={16} strokeWidth={2.5} />}
                        {action.label}
                    </button>
                )
            )}
        </div>
    );
}

// ─── EmptyState ──────────────────────────────────────────────────
interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: { label: string; href?: string; onClick?: () => void };
    iconColor?: string;
}

export function EmptyState({ icon: Icon, title, description, action, iconColor = "text-slate-400" }: EmptyStateProps) {
    const btnClass = "mt-4 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors";
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Icon size={28} className={iconColor} />
            </div>
            <p className="font-bold text-slate-700 text-base">{title}</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">{description}</p>
            {action && (
                action.href ? (
                    <a href={action.href} className={btnClass}>{action.label}</a>
                ) : (
                    <button onClick={action.onClick} className={btnClass}>{action.label}</button>
                )
            )}
        </div>
    );
}

// ─── Card ────────────────────────────────────────────────────────
interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: string;
}

export function Card({ children, className, padding = "p-6" }: CardProps) {
    return (
        <div className={cn("bg-white rounded-2xl border border-slate-200", padding, className)}>
            {children}
        </div>
    );
}

// ─── StatCard ────────────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    trend?: { value: string; positive: boolean };
}

export function StatCard({ label, value, icon: Icon, iconBg, iconColor, trend }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
                <Icon size={20} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">{label}</p>
            </div>
            {trend && (
                <span className={cn("text-xs font-bold rounded-full px-2 py-1", trend.positive ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50")}>
                    {trend.positive ? "↑" : "↓"} {trend.value}
                </span>
            )}
        </div>
    );
}

// ─── SectionCard ─────────────────────────────────────────────────
interface SectionCardProps {
    title: string;
    action?: { label: string; href?: string };
    children: React.ReactNode;
}

export function SectionCard({ title, action, children }: SectionCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {action && (
                    <Link href={action.href ?? "#"} className="text-xs font-bold text-blue-600 hover:underline">
                        {action.label}
                    </Link>
                )}
            </div>
            {children}
        </div>
    );
}

// ─── Badge ───────────────────────────────────────────────────────
interface BadgeProps {
    label: string;
    variant?: "blue" | "green" | "red" | "yellow" | "slate";
}

const BADGE_COLORS = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
};

export function Badge({ label, variant = "slate" }: BadgeProps) {
    return (
        <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border", BADGE_COLORS[variant])}>
            {label}
        </span>
    );
}
