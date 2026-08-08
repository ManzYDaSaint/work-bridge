"use client";

import { User } from "@/types";
import { BrainCircuit, Briefcase, ClipboardList, LayoutDashboard, ShieldCheck, Users, Activity, Sparkles, Zap } from "lucide-react";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";
import { UserProvider } from "@/context/UserContext";
import { signOutAndRedirect } from "@/lib/auth-utils";

const adminNavGroups: NavGroup[] = [
    {
        title: "Command Center",
        items: [
            { label: "Metrics Overview", href: "/dashboard/admin", icon: LayoutDashboard },
            { label: "User Management", href: "/dashboard/admin/users", icon: Users },
            { label: "Market Moderation", href: "/dashboard/admin/jobs", icon: Briefcase },
            { label: "Job Ingestion", href: "/dashboard/admin/ingestion", icon: Zap },
            { label: "Employer Verification", href: "/dashboard/admin/employers", icon: ShieldCheck },
            { label: "Employer CRM", href: "/dashboard/admin/crm", icon: ClipboardList },
            { label: "Opportunities", href: "/dashboard/admin/opportunities", icon: Sparkles },
            { label: "AI Health", href: "/dashboard/admin/ai-health", icon: BrainCircuit },
            { label: "Mission Control", href: "/dashboard/admin/notifications", icon: Activity },
        ]
    },
];

export default function AdminLayoutClient({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User;
}) {
    const user = initialUser;

    const handleLogout = async () => {
        await signOutAndRedirect();
    };

    const adminName = user?.email?.split("@")[0] || "Admin";
    const initials = adminName.slice(0, 2).toUpperCase();

    return (
        <UserProvider initialUser={initialUser}>
            <DashboardLayout
                navGroups={adminNavGroups}
                userFullName={adminName}
                userInitials={initials}
                userRoleLabel="System Administrator"
                onLogout={handleLogout}
            >
                {children}
            </DashboardLayout>
        </UserProvider>
    );
}
