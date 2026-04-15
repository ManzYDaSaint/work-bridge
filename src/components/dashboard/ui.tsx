import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { LucideIcon } from "lucide-react";

export function CompanyAvatar({ logoUrl, name, size = "md" }: { logoUrl?: string | null; name: string; size?: "sm" | "md" }) {
    const cls = size === "sm" ? "w-10 h-10 text-sm" : "w-14 h-14 text-lg";
    return (
        <div className={cn("rounded-2xl flex items-center justify-center border overflow-hidden shrink-0", cls,
            logoUrl ? "bg-white dark:bg-white border-stone-200 dark:border-slate-700" : "bg-stone-50 dark:bg-slate-900 border-stone-200 dark:border-slate-800")}>
            {logoUrl ? (
                <div className="relative w-full h-full">
                    <Image src={logoUrl} alt={name} fill className="object-contain p-1.5" unoptimized />
                </div>
            ) : (
                <span className="font-semibold text-[#16324f] dark:text-slate-200 leading-none">
                    {(name || "?")[0].toUpperCase()}
                </span>
            )}
        </div>
    );
}

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
        disabled?: boolean;
    };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
    const btnClass = cn(
        "h-10 px-5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all",
        action?.disabled
            ? "bg-stone-100 text-slate-400 cursor-not-allowed border border-stone-200 shadow-none"
            : action?.variant === "secondary"
                ? "border border-stone-300 text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                : "bg-[#16324f] text-white hover:opacity-90"
    );

    return (
        <div className="mb-6 flex items-start justify-between gap-4">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            {action && (
                action.disabled ? (
                    <div className={btnClass}>
                        {action.icon && <action.icon size={16} strokeWidth={2.5} />}
                        {action.label}
                    </div>
                ) : action.href ? (
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
    action?: { label: string; href?: string; onClick?: () => void; disabled?: boolean };
    iconColor?: string;
}

export function EmptyState({ icon: Icon, title, description, action, iconColor = "text-slate-400" }: EmptyStateProps) {
    const btnClass = "mt-4 px-6 py-2.5 bg-[#16324f] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-colors";
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 dark:bg-slate-800">
                <Icon size={28} className={iconColor} />
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{title}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
            {action && (
                action.disabled ? (
                    <div className={cn(btnClass, "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 hover:bg-slate-100 shadow-none")}>
                        {action.label}
                    </div>
                ) : action.href ? (
                    <Link href={action.href} className={btnClass}>{action.label}</Link>
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
        <div className={cn("rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70", padding, className)}>
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
        <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
                <Icon size={20} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-2xl font-semibold leading-none text-slate-900 dark:text-white">{value}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
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
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-stone-200/70 px-6 py-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                {action && (
                    <Link href={action.href ?? "#"} className="text-xs font-semibold text-[#16324f] hover:underline dark:text-slate-200">
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
    label?: string;
    children?: React.ReactNode;
    variant?: "blue" | "green" | "red" | "yellow" | "slate" | "success" | "secondary" | "outline";
    className?: string;
}

const BADGE_COLORS = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-200",
    success: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    secondary: "bg-slate-100 text-slate-600 border-slate-200",
    outline: "bg-transparent text-slate-600 border-slate-200",
};

export function Badge({ label, children, variant = "slate", className }: BadgeProps) {
    return (
        <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border leading-none transition-colors",
            BADGE_COLORS[variant as keyof typeof BADGE_COLORS],
            className
        )}>
            {children || label}
        </span>
    );
}

// ─── Tabs ────────────────────────────────────────────────────────
interface TabsProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
    return (
        <div className="flex w-fit rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-slate-700/50 dark:bg-slate-800/50">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        "px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap",
                        activeTab === tab.id
                            ? "bg-white dark:bg-slate-700 text-[#16324f] dark:text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ─── Pagination ──────────────────────────────────────────────────
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-4 mt-8">
            <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
                Previous
            </button>
            <span className="text-xs font-medium text-slate-500">
                Page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
            </span>
            <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
                Next
            </button>
        </div>
    );
}

