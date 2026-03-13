"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { User, Employer } from "@/types";
import { LayoutDashboard, Briefcase, BarChart3, Settings, Users, PlusCircle, Lock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

import { PendingBanner } from "@/components/dashboard/employer/PendingBanner";

const employerNavGroups: NavGroup[] = [
    {
        title: "Workspace",
        items: [
            { label: "Overview", href: "/dashboard/employer", icon: LayoutDashboard },
            { label: "Active Jobs", href: "/dashboard/employer/jobs", icon: Briefcase },
            { label: "Candidates", href: "/dashboard/employer/candidates", icon: Users },
            { label: "Messages", href: "/dashboard/employer/messages", icon: MessageSquare },
            { label: "Analytics", href: "/dashboard/employer/analytics", icon: BarChart3 },
        ]
    },
    {
        title: "Configuration",
        items: [
            { label: "Settings", href: "/dashboard/employer/settings", icon: Settings },
        ]
    }
];

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [employerProfile, setEmployerProfile] = useState<Employer | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiFetch("/api/me");
                if (res.ok) {
                    const data: User = await res.json();
                    if (data.role !== "EMPLOYER") {
                        router.push("/dashboard");
                    } else {
                        setUser(data);
                        setEmployerProfile(data.employer ?? null);
                    }
                } else {
                    router.push("/login");
                }
            } catch {
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin shadow-xl shadow-amber-500/20" />
        </div>
    );

    const isApproved = employerProfile?.status === 'APPROVED';
    const companyName = employerProfile?.companyName || user?.email?.split("@")[0] || "Company";
    const initials = companyName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <DashboardLayout
            navGroups={employerNavGroups}
            userFullName={companyName}
            userInitials={initials}
            userRoleLabel={isApproved ? "Verified Employer" : "Pending Verification"}
            onLogout={handleLogout}
            topBarChildren={
                <>
                    <NotificationDropdown />
                    <div className="h-6 w-px bg-slate-200/50 dark:bg-slate-800/50 hidden md:block"></div>
                    <button
                        onClick={() => isApproved ? router.push("/dashboard/employer/jobs/new") : null}
                        className={cn(
                            "h-9 px-4 sm:px-5 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm whitespace-nowrap",
                            isApproved
                                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                                : "bg-slate-300 cursor-not-allowed opacity-80"
                        )}
                    >
                        <PlusCircle size={18} />
                        <span className="hidden sm:inline">Deploy Role</span><span className="sm:hidden">Deploy Role</span>
                        {!isApproved && <Lock size={14} className="ml-1 opacity-60" />}
                    </button>
                </>
            }
        >
            {!isApproved && <PendingBanner />}
            {children}
        </DashboardLayout>
    );
}
