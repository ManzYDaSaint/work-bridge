"use client";

import { User } from "@/types";
import { BrainCircuit, Briefcase, ClipboardList, GraduationCap, LayoutDashboard, ShieldCheck, Users, Activity, Sparkles, Zap, Crown, BarChart3, Mail } from "lucide-react";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";
import { UserProvider } from "@/context/UserContext";
import { signOutAndRedirect } from "@/lib/auth-utils";
import AdminCommandPalette from "@/components/dashboard/admin/AdminCommandPalette";

const adminNavGroups: NavGroup[] = [
    {
        title: "Command Center",
        items: [
            { label: "Metrics Overview", href: "/dashboard/admin", icon: LayoutDashboard },
            { label: "Communications Hub", href: "/dashboard/admin/communications", icon: Mail },
            { label: "User Management", href: "/dashboard/admin/users", icon: Users },
            { label: "Market Moderation", href: "/dashboard/admin/jobs", icon: Briefcase },
            { label: "Job Ingestion", href: "/dashboard/admin/ingestion", icon: Zap },
        ]
    },
    {
        title: "AI Matching Engine",
        items: [
            { label: "Dispatched Matches Audit", href: "/dashboard/admin/matching/dispatches", icon: ShieldCheck },
            { label: "Match Analytics & Insights", href: "/dashboard/admin/matching/analytics", icon: BarChart3 },
            { label: "Qualification Domains", href: "/dashboard/admin/qualifications", icon: GraduationCap },
        ]
    },
    {
        title: "Premium & Subscriptions",
        items: [
            { label: "Subscriptions Management", href: "/dashboard/admin/premium", icon: Crown },
        ]
    },
    {
        title: "Platform Operations",
        items: [
            { label: "Employer Verification", href: "/dashboard/admin/employers", icon: Users },
            { label: "Employer CRM", href: "/dashboard/admin/crm", icon: ClipboardList },
            { label: "Opportunities", href: "/dashboard/admin/opportunities", icon: Sparkles },
            { label: "AI Health", href: "/dashboard/admin/ai-health", icon: BrainCircuit },
            { label: "Mission Control", href: "/dashboard/admin/mission-control", icon: Activity },
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
                topBarChildren={<AdminCommandPalette />}
            >
                {children}
            </DashboardLayout>
        </UserProvider>
    );
}
