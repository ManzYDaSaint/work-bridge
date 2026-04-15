"use client";

import { useRouter } from "next/navigation";
import { User, Employer } from "@/types";
import { LayoutDashboard, Briefcase, Settings, Users, PlusCircle, Lock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";
import { UserProvider, useUser } from "@/context/UserContext";
import { useEffect } from "react";
import { PendingBanner } from "@/components/dashboard/employer/PendingBanner";

const employerNavGroups: NavGroup[] = [
    {
        title: "Workspace",
        items: [
            { label: "Overview", href: "/dashboard/employer", icon: LayoutDashboard },
            { label: "Jobs", href: "/dashboard/employer/jobs", icon: Briefcase },
            { label: "Candidates", href: "/dashboard/employer/candidates", icon: Users },
            { label: "Billing", href: "/dashboard/employer/billing", icon: DollarSign },
        ]
    },
    {
        title: "Company",
        items: [
            { label: "Profile", href: "/dashboard/employer/settings", icon: Settings },
        ]
    }
];

export default function EmployerLayoutClient({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User;
}) {
    return (
        <UserProvider initialUser={initialUser}>
            <EmployerLayoutInner>{children}</EmployerLayoutInner>
        </UserProvider>
    );
}

function EmployerLayoutInner({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();
    const { user, refreshUser } = useUser();
    
    // Sync with DB on mount to fix stale SSR data
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    if (!user) return null;

    const employerProfile: Employer | null = user.employer ?? null;

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            window.location.assign("/login");
        }
    };

    const isApproved = employerProfile?.status === "APPROVED";
    const companyName = employerProfile?.companyName || user?.email?.split("@")[0] || "Company";
    const initials = companyName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <DashboardLayout
            navGroups={employerNavGroups}
            userFullName={companyName}
            userInitials={initials}
            userRoleLabel={isApproved ? "Employer" : "Pending employer"}
            brandLogo={employerProfile?.logoUrl}
            brandName={employerProfile?.companyName}
            userAvatar={employerProfile?.logoUrl}
            showUpgradeCTA={false}
            onLogout={handleLogout}
            topBarChildren={
                <>
                    <div className="hidden h-6 w-px bg-stone-200 dark:bg-slate-800 md:block"></div>
                    <button
                        type="button"
                        onClick={() => (isApproved ? router.push("/dashboard/employer/jobs/new") : null)}
                        className={cn(
                            "flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-xs font-semibold text-white transition-all sm:px-5 sm:text-sm",
                            isApproved
                                ? "bg-[#16324f] hover:opacity-90"
                                : "cursor-not-allowed bg-slate-300 opacity-80"
                        )}
                    >
                        <PlusCircle size={18} />
                        <span>Post role</span>
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
