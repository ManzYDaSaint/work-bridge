"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/dashboard/NotificationCenter";

export type NavItem = {
    label: string;
    href: string;
    icon: React.ElementType;
};

export type NavGroup = {
    title?: string;
    items: NavItem[];
};

interface DashboardLayoutProps {
    children: React.ReactNode;
    navGroups: NavGroup[];
    userFullName: string;
    userInitials: string;
    userRoleLabel: string;
    onLogout: () => void;
    topBarChildren?: React.ReactNode;
    brandLogo?: string;
    brandName?: string;
    userAvatar?: string;
    showUpgradeCTA?: boolean;
    upgradeLink?: string;
}

/** Flatten all nav items from all groups into a single list */
function flattenNav(groups: NavGroup[]): NavItem[] {
    return groups.flatMap((g) => g.items);
}

export default function DashboardLayout({
    children,
    navGroups,
    userFullName,
    userInitials,
    userRoleLabel,
    userAvatar,
    brandLogo,
    brandName,
    onLogout,
    topBarChildren,
    showUpgradeCTA,
    upgradeLink = "/upgrade",
}: DashboardLayoutProps) {
    const pathname = usePathname();
    const allItems = flattenNav(navGroups);

    // Items to show in mobile bottom bar: first 4 primary items + "More" overflow
    const BOTTOM_NAV_MAX = 4;
    const primaryItems = allItems.slice(0, BOTTOM_NAV_MAX);
    const overflowItems = allItems.slice(BOTTOM_NAV_MAX);
    const [showOverflow, setShowOverflow] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-transparent selection:bg-stone-200 selection:text-slate-900">

            {/* ─── DESKTOP SIDEBAR (hidden on mobile) ───────────── */}
            <aside className="z-20 hidden w-64 flex-shrink-0 flex-col border-r border-stone-200 bg-[#fbf8f1]/80 backdrop-blur md:flex dark:border-slate-800 dark:bg-slate-950/80">
                {/* Brand */}
                <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-stone-200/70 px-6 dark:border-slate-800">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center">
                            {brandLogo ? (
                                <img src={brandLogo} alt={brandName || "Brand Logo"} className="w-full h-full object-contain rounded-md" />
                            ) : (
                                <>
                                    <div className="logo-black">
                                        <Image src="/logo-black.svg" alt="WorkBridge" width={32} height={32} priority />
                                    </div>
                                    <div className="logo-white">
                                        <Image src="/logo.svg" alt="WorkBridge" width={32} height={32} priority />
                                    </div>
                                </>
                            )}
                        </div>
                        <span className="text-lg font-semibold text-slate-900 tracking-tight dark:text-white">
                            {brandName ? brandName : (
                                <>Work<span className="text-[#a65a2e]">Bridge</span></>
                            )}
                        </span>
                    </Link>
                </div>

                {/* Nav Groups */}
                <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
                    {navGroups.map((group, gi) => (
                        <div key={gi} className="space-y-1">
                            {group.title && (
                                <h4 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                    {group.title}
                                </h4>
                            )}
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                                            isActive
                                                ? "bg-white text-[#16324f] shadow-sm dark:bg-slate-900 dark:text-white"
                                                : "text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:hover:bg-slate-900"
                                        )}
                                    >
                                        <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            {gi < navGroups.length - 1 && (
                                <hr className="mx-3 !mt-5 border-stone-200/70 dark:border-slate-800" />
                            )}
                        </div>
                    ))}
                </nav>

                {/* Upgrade CTA */}
                {showUpgradeCTA && (
                    <div className="p-4 flex-shrink-0">
                        <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                            <p className="mb-3 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                                Upgrade for more listings and faster hiring tools
                            </p>
                            <Link href={upgradeLink} className="block w-full rounded-xl bg-[#16324f] py-2 text-center text-xs font-semibold text-white transition-colors hover:opacity-90">
                                Upgrade plan
                            </Link>
                        </div>
                    </div>
                )}

                {/* User Footer */}
                <div className="flex flex-shrink-0 items-center gap-3 border-t border-stone-200/70 px-4 py-3 dark:border-slate-800">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#16324f] p-1 text-sm font-semibold text-white shadow-inner">
                        {userAvatar ? <img src={userAvatar} alt={userFullName} className="w-full h-full object-cover" /> : userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{userFullName}</p>
                        <p className="truncate text-xs font-medium text-slate-400">{userRoleLabel}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="group rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Sign Out"
                    >
                        <LogOut size={18} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </aside>

            {/* ─── MAIN CONTENT AREA ────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                {/* Top Bar */}
                <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-stone-200/70 bg-[#fbf8f1]/85 px-4 backdrop-blur-xl sm:px-8 dark:border-slate-800 dark:bg-slate-950/85">
                    {/* Mobile: show brand logo */}
                    <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
                        <div className="w-7 h-7 flex items-center justify-center">
                            {brandLogo ? (
                                <img src={brandLogo} alt={brandName || "Brand Logo"} className="w-full h-full object-contain rounded-md" />
                            ) : (
                                <>
                                    <div className="logo-black">
                                        <Image src="/logo-black.svg" alt="WorkBridge" width={28} height={28} priority />
                                    </div>
                                    <div className="logo-white">
                                        <Image src="/logo.svg" alt="WorkBridge" width={28} height={28} priority />
                                    </div>
                                </>
                            )}
                        </div>
                        <span className="text-base font-semibold text-slate-900 dark:text-white">
                            {brandName ? brandName : (
                                <>Work<span className="text-[#a65a2e]">Bridge</span></>
                            )}
                        </span>
                    </Link>
                    {/* Desktop: page label */}
                    <h1 className="hidden text-lg font-semibold text-slate-800 dark:text-slate-100 md:block">Dashboard</h1>

                    <div className="flex items-center gap-3">
                        <NotificationCenter />
                        {topBarChildren}
                    </div>
                </header>

                {/* Scrollable page content — add bottom padding on mobile to clear the bottom nav */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
                    <main className="min-h-full p-4 sm:p-6 lg:p-8">
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>

            {/* ─── MOBILE BOTTOM NAV BAR ────────────────────────────── */}
            <nav className="safe-area-pb fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-[#fbf8f1]/95 backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-950/95">
                <div className="flex items-center justify-around h-[60px] px-2">
                    {primaryItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-1 flex-1 py-1 group"
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-10 h-7 rounded-full transition-all",
                                    isActive ? "bg-white dark:bg-slate-900" : "group-active:bg-stone-100"
                                )}>
                                    <item.icon
                                        size={isActive ? 22 : 20}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                        className={cn(
                                            "transition-colors",
                                            isActive ? "text-[#16324f] dark:text-white" : "text-slate-400 group-hover:text-slate-600"
                                        )}
                                    />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold leading-none transition-colors",
                                    isActive ? "text-[#16324f] dark:text-white" : "text-slate-400 group-hover:text-slate-600"
                                )}>
                                    {item.label.split(" ")[0]}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="bottom-nav-indicator"
                                        className="absolute bottom-0 h-[3px] w-5 rounded-t-full bg-[#a65a2e]"
                                    />
                                )}
                            </Link>
                        );
                    })}

                    {/* "More" overflow button - only shown if there are extra items */}
                    {overflowItems.length > 0 && (
                        <div className="relative flex-1">
                            <button
                                onClick={() => setShowOverflow((v) => !v)}
                                className="flex flex-col items-center justify-center gap-1 w-full py-1 group"
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-10 h-7 rounded-full transition-all",
                                    showOverflow ? "bg-white dark:bg-slate-900" : "group-active:bg-stone-100"
                                )}>
                                    <MoreHorizontal
                                        size={20}
                                        strokeWidth={1.8}
                                        className={cn(
                                            "transition-colors",
                                            showOverflow ? "text-[#16324f] dark:text-white" : "text-slate-400 group-hover:text-slate-600"
                                        )}
                                    />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold leading-none",
                                    showOverflow ? "text-[#16324f] dark:text-white" : "text-slate-400"
                                )}>
                                    More
                                </span>
                            </button>

                            {/* Overflow popover */}
                            <AnimatePresence>
                                {showOverflow && (
                                    <>
                                        {/* Backdrop */}
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowOverflow(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute bottom-full right-0 z-50 mb-3 w-52 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950"
                                        >
                                            {/* User profile mini header */}
                                            <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                                                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#16324f] text-xs font-semibold text-white">
                                                    {userAvatar ? <img src={userAvatar} alt={userFullName} className="w-full h-full object-cover" /> : userInitials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{userFullName}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{userRoleLabel}</p>
                                                </div>
                                            </div>

                                            {/* Overflow nav items */}
                                            <div className="py-1">
                                                {overflowItems.map((item) => {
                                                    const isActive = pathname === item.href;
                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={() => setShowOverflow(false)}
                                                            className={cn(
                                                                "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors",
                                                                isActive
                                                                    ? "bg-stone-50 text-[#16324f] dark:bg-slate-900 dark:text-white"
                                                                    : "text-slate-600 hover:bg-stone-50 dark:hover:bg-slate-900"
                                                            )}
                                                        >
                                                            <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                                                            {item.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-stone-200 py-1 dark:border-slate-800">
                                                <button
                                                    onClick={() => { setShowOverflow(false); onLogout(); }}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors w-full"
                                                >
                                                    <LogOut size={17} strokeWidth={2} />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </nav>
        </div>
    );
}
