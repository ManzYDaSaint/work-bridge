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
                    <Image src={logoUrl} alt={name} fill className="object-contain p-1.5" />
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
        "h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0",
        action?.disabled
            ? "bg-stone-100 text-slate-400 cursor-not-allowed border border-stone-200 shadow-none"
            : action?.variant === "secondary"
                ? "border border-stone-200 text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                : "bg-[#16324f] text-white hover:opacity-90 shadow-sm dark:bg-slate-100 dark:text-slate-900"
    );

    return (
        <div className="mb-6 border-b border-stone-200/80 pb-5 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                    <div
                        className="w-1.5 shrink-0 rounded-full bg-[#16324f] dark:bg-amber-400"
                        style={{ height: subtitle ? "2.75rem" : "1.75rem", marginTop: "0.125rem" }}
                    />
                    <div className="min-w-0">
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>
                        {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
                    </div>
                </div>
                {action && (
                    action.disabled ? (
                        <div className={btnClass}>
                            {action.icon && <action.icon size={15} strokeWidth={2.5} />}
                            {action.label}
                        </div>
                    ) : action.href ? (
                        <Link href={action.href} className={btnClass}>
                            {action.icon && <action.icon size={15} strokeWidth={2.5} />}
                            {action.label}
                        </Link>
                    ) : (
                        <button onClick={action.onClick} className={btnClass}>
                            {action.icon && <action.icon size={15} strokeWidth={2.5} />}
                            {action.label}
                        </button>
                    )
                )}
            </div>
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

// ... (previous code remains unchanged until Tabs)

// ─── Tabs ────────────────────────────────────────────────────────
interface TabsProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    basePath?: string;
    onChange?: (tabId: string) => void;
    paramName?: string;
}

export function Tabs({ tabs, activeTab, basePath, onChange, paramName = "status" }: TabsProps) {
    return (
        <div className="flex w-fit rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-slate-700/50 dark:bg-slate-800/50">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const sharedClassName = cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap",
                    isActive
                        ? "bg-white dark:bg-slate-700 text-[#16324f] dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                );

                if (onChange) {
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onChange(tab.id)}
                            className={sharedClassName}
                        >
                            {tab.label}
                        </button>
                    );
                }

                return (
                    <Link
                        key={tab.id}
                        href={basePath ? `${basePath}?${paramName}=${tab.id}` : "#"}
                        className={sharedClassName}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}

// ─── Pagination ──────────────────────────────────────────────────
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    itemsPerPage?: number;
    basePath?: string;
    onPageChange?: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    pageSizeOptions?: number[];
    preserveParams?: string;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    basePath,
    onPageChange,
    onLimitChange,
    pageSizeOptions = [10, 20, 50, 100],
    preserveParams,
    className,
}: PaginationProps) {
    if (totalPages <= 1 && (!totalItems || !onLimitChange)) return null;

    const getPageUrl = (page: number) => {
        if (!basePath) return "#";
        const qs = new URLSearchParams(preserveParams || "");
        qs.set("page", String(page));
        return `${basePath}?${qs.toString()}`;
    };

    const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
    const endItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    const pageNumbers = Array.from({ length: Math.max(1, endPage - startPage + 1) }, (_, i) => startPage + i);

    return (
        <div className={cn("flex flex-col items-center justify-between gap-3 border-t border-stone-200/80 pt-5 sm:flex-row dark:border-slate-800", className)}>
            <div className="flex items-center gap-3 flex-wrap">
                {totalItems && startItem && endItem ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> to{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> of{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> items
                    </p>
                ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Page <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> of{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
                    </p>
                )}

                {onLimitChange && itemsPerPage && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 border-l border-stone-200 dark:border-slate-800 pl-3">
                        <span>Per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-stone-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                        >
                            {pageSizeOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                {/* Previous Button */}
                {onPageChange ? (
                    <button
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-600 transition disabled:opacity-40 hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Previous Page"
                    >
                        ‹
                    </button>
                ) : (
                    <Link
                        href={getPageUrl(currentPage - 1)}
                        className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-600 transition hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                            currentPage === 1 && "pointer-events-none opacity-40"
                        )}
                        aria-label="Previous Page"
                    >
                        ‹
                    </Link>
                )}

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1 px-1">
                    {pageNumbers.map((pageNum) => {
                        const isActive = currentPage === pageNum;
                        const numClass = cn(
                            "h-8 w-8 rounded-xl text-xs font-bold transition flex items-center justify-center",
                            isActive
                                ? "bg-[#16324f] text-white dark:bg-amber-400 dark:text-slate-950"
                                : "text-slate-600 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        );

                        if (onPageChange) {
                            return (
                                <button key={pageNum} onClick={() => onPageChange(pageNum)} className={numClass}>
                                    {pageNum}
                                </button>
                            );
                        }
                        return (
                            <Link key={pageNum} href={getPageUrl(pageNum)} className={numClass}>
                                {pageNum}
                            </Link>
                        );
                    })}
                </div>

                {/* Next Button */}
                {onPageChange ? (
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-600 transition disabled:opacity-40 hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Next Page"
                    >
                        ›
                    </button>
                ) : (
                    <Link
                        href={getPageUrl(currentPage + 1)}
                        className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-600 transition hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                            currentPage === totalPages && "pointer-events-none opacity-40"
                        )}
                        aria-label="Next Page"
                    >
                        ›
                    </Link>
                )}
            </div>
        </div>
    );
}

// ─── SearchInput ─────────────────────────────────────────────────
interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search...", className }: SearchInputProps) {
    return (
        <div className={cn("relative min-w-[220px]", className)}>
            <svg
                className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-2xl border border-stone-200/80 bg-white pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#16324f] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400 transition-colors"
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

// ─── SegmentedFilterTabs ──────────────────────────────────────────
interface FilterTabItem {
    id: string;
    label: string;
    count?: number;
}

interface SegmentedFilterTabsProps {
    tabs: FilterTabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export function SegmentedFilterTabs({ tabs, activeTab, onChange, className }: SegmentedFilterTabsProps) {
    return (
        <div className={cn("flex items-center gap-1 overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/80 no-scrollbar", className)}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap",
                            isActive
                                ? "bg-white text-[#16324f] dark:bg-slate-800 dark:text-amber-400 shadow-xs"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                    >
                        <span>{tab.label}</span>
                        {typeof tab.count === "number" && (
                            <span className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10px]",
                                isActive
                                    ? "bg-stone-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                                    : "bg-stone-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}


