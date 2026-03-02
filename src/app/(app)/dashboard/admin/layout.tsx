"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { User } from "@/types";
import { LayoutDashboard, Users, ShieldCheck, History, Bell, Briefcase } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";

const adminNavGroups: NavGroup[] = [
    {
        title: "Command Center",
        items: [
            { label: "Metrics Overview", href: "/dashboard/admin", icon: LayoutDashboard },
            { label: "User Management", href: "/dashboard/admin/users", icon: Users },
            { label: "Market Moderation", href: "/dashboard/admin/jobs", icon: Briefcase },
            { label: "Employer Verification", href: "/dashboard/admin/employers", icon: ShieldCheck },
            { label: "Audit Registry", href: "/dashboard/admin/audit", icon: History },
        ]
    },
    {
        title: "System",
        items: [
            { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
        ]
    }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiFetch("/api/me");
                if (res.ok) {
                    const data: User = await res.json();
                    if (data.role !== "ADMIN") {
                        router.push("/dashboard");
                    } else {
                        setUser(data);
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
            <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin shadow-xl shadow-blue-700/20" />
        </div>
    );

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
