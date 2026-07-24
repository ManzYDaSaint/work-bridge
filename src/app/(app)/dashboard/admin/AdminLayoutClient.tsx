"use client";

import { User } from "@/types";
import { BrainCircuit, Briefcase, ClipboardList, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";
import { signOutAndRedirect } from "@/lib/auth-utils";

const adminNavGroups: NavGroup[] = [
    {
        title: "Command Center",
        items: [
            { label: "Metrics Overview", href: "/dashboard/admin", icon: LayoutDashboard },
            { label: "User Management", href: "/dashboard/admin/users", icon: Users },
            { label: "Market Moderation", href: "/dashboard/admin/jobs", icon: Briefcase },
            { label: "Employer Verification", href: "/dashboard/admin/employers", icon: ShieldCheck },
            { label: "Employer CRM", href: "/dashboard/admin/crm", icon: ClipboardList },
            { label: "AI Health", href: "/dashboard/admin/ai-health", icon: BrainCircuit },
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
        <DashboardLayout
            navGroups={adminNavGroups}
            userFullName={adminName}
            userInitials={initials}
            userRoleLabel="System Administrator"
            onLogout={handleLogout}
        >
            {children}
        </DashboardLayout>
    );
}
