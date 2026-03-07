"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

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
    onLogout,
    topBarChildren,
}: DashboardLayoutProps) {
    const pathname = usePathname();
    const allItems = flattenNav(navGroups);

    // Items to show in mobile bottom bar: first 4 primary items + "More" overflow
    const BOTTOM_NAV_MAX = 4;
    const primaryItems = allItems.slice(0, BOTTOM_NAV_MAX);
    const overflowItems = allItems.slice(BOTTOM_NAV_MAX);
    const [showOverflow, setShowOverflow] = useState(false);

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden selection:bg-blue-100 selection:text-blue-900">

            {/* ─── DESKTOP SIDEBAR (hidden on mobile) ───────────── */}
            <aside className="hidden md:flex w-64 flex-shrink-0 bg-white border-r border-slate-200 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
                {/* Brand */}
                <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100 flex-shrink-0">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <Image src="/logo.svg" alt="WorkBridge" width={32} height={32} priority />
                        </div>
                        <span className="text-lg font-black text-slate-900 tracking-tight">
                            Work<span className="text-blue-600">Bridge</span>
                        </span>
                    </Link>
                </div>

                {/* Nav Groups */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                    {navGroups.map((group, gi) => (
                        <div key={gi} className="space-y-1">
                            {group.title && (
                                <h4 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
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
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                                            isActive
                                                ? "bg-blue-50 text-blue-600"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                        )}
                                    >
                                        <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            {gi < navGroups.length - 1 && (
                                <hr className="border-slate-100 !mt-5 mx-3" />
                            )}
                        </div>
                    ))}
                </nav>

                {/* Upgrade CTA */}
                <div className="p-4 flex-shrink-0">
                    <div className="bg-blue-600 rounded-2xl p-5 text-white text-center shadow-lg shadow-blue-600/20">
                        <p className="text-sm font-bold leading-snug mb-3">
                            Experience the<br />improved dashboard
                        </p>
                        <button className="w-full py-2 bg-white text-blue-700 text-xs font-black rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
                            Upgrade plan
                        </button>
                    </div>
                </div>

                {/* User Footer */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-inner">
                        {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{userFullName}</p>
                        <p className="text-xs font-medium text-slate-400 truncate">{userRoleLabel}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 group"
                        title="Sign Out"
                    >
                        <LogOut size={18} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </aside>

            {/* ─── MAIN CONTENT AREA ────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                {/* Top Bar */}
                <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10">
                    {/* Mobile: show brand logo */}
                    <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
                        <div className="w-7 h-7 flex items-center justify-center">
                            <Image src="/logo.svg" alt="WorkBridge" width={28} height={28} priority />
                        </div>
                        <span className="text-base font-black text-slate-900">
                            Work<span className="text-blue-600">Bridge</span>
                        </span>
                    </Link>
                    {/* Desktop: page label */}
                    <h1 className="text-lg font-bold text-slate-800 hidden md:block">Dashboard</h1>

                    <div className="flex items-center gap-3">
                        {topBarChildren}
                    </div>
                </header>

                {/* Scrollable page content — add bottom padding on mobile to clear the bottom nav */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
                    <main className="p-4 sm:p-6 lg:p-8 min-h-full">
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
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-50 safe-area-pb">
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
                                    isActive ? "bg-blue-50" : "group-active:bg-slate-100"
                                )}>
                                    <item.icon
                                        size={isActive ? 22 : 20}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                        className={cn(
                                            "transition-colors",
                                            isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                        )}
                                    />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold leading-none transition-colors",
                                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                )}>
                                    {item.label.split(" ")[0]}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="bottom-nav-indicator"
                                        className="absolute bottom-0 w-5 h-[3px] bg-blue-600 rounded-t-full"
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
                                    showOverflow ? "bg-blue-50" : "group-active:bg-slate-100"
                                )}>
                                    <MoreHorizontal
                                        size={20}
                                        strokeWidth={1.8}
                                        className={cn(
                                            "transition-colors",
                                            showOverflow ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                        )}
                                    />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold leading-none",
                                    showOverflow ? "text-blue-600" : "text-slate-400"
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
                                            className="absolute bottom-full right-0 mb-3 w-52 bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden z-50"
                                        >
                                            {/* User profile mini header */}
                                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-black">
                                                    {userInitials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">{userFullName}</p>
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
                                                                    ? "text-blue-600 bg-blue-50"
                                                                    : "text-slate-600 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                                                            {item.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-slate-100 py-1">
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
