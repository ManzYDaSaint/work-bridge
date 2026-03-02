"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { User, JobSeeker } from "@/types";
import {
    LayoutDashboard, FileText, Briefcase, BookmarkCheck, Bell,
    MessageSquare, UserCircle2, Settings, HelpCircle, Zap
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";

// Seeker-specific Navigation
const seekerNavGroups: NavGroup[] = [
    {
        items: [
            { label: "Dashboard", href: "/dashboard/seeker", icon: LayoutDashboard },
            { label: "Resume", href: "/dashboard/seeker/resume", icon: FileText },
            { label: "Job Offers", href: "/dashboard/seeker/offers", icon: Zap },
            { label: "Applied Jobs", href: "/dashboard/seeker/applications", icon: Briefcase },
            { label: "Saved Jobs", href: "/dashboard/seeker/saved", icon: BookmarkCheck },
        ]
    },
    {
        items: [
            { label: "Messages", href: "/dashboard/seeker/messages", icon: MessageSquare },
            { label: "Notifications", href: "/dashboard/seeker/notifications", icon: Bell },
        ]
    },
    {
        items: [
            { label: "My Profile", href: "/dashboard/seeker/profile", icon: UserCircle2 },
            { label: "Settings", href: "/dashboard/seeker/settings", icon: Settings },
            { label: "Help & Support", href: "/dashboard/seeker/help", icon: HelpCircle },
        ]
    }
];

export default function SeekerLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [seekerProfile, setSeekerProfile] = useState<JobSeeker | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiFetch("/api/me");
                if (res.ok) {
                    const data: User = await res.json();
                    if (data.role !== "JOB_SEEKER") {
                        router.push("/dashboard");
                    } else {
                        setUser(data);
                        setSeekerProfile(data.jobSeeker ?? null);
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
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl shadow-blue-500/20" />
        </div>
    );

    const fullName = seekerProfile?.fullName || user?.email?.split("@")[0] || "User";
    const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <DashboardLayout
            navGroups={seekerNavGroups}
            userFullName={fullName}
            userInitials={initials}
            userRoleLabel="Verified Candidate"
            onLogout={handleLogout}
            topBarChildren={
                <>
                    <div className="relative hidden md:block">
                        <input
                            type="text"
                            placeholder="Search"
                            className="h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-48 lg:w-64 transition-all"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    </div>
                    <button className="h-9 px-4 sm:px-5 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-600/20 whitespace-nowrap">
                        <span className="text-lg leading-none">+</span> <span className="hidden sm:inline">Upload resume</span><span className="sm:hidden">Upload</span>
                    </button>
                </>
            }
        >
            {children}
        </DashboardLayout>
    );
}

