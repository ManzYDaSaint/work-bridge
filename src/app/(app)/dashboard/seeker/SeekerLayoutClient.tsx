"use client";

import Link from "next/link";
import { User, JobSeeker } from "@/types";
import {
    LayoutDashboard, Briefcase, BookmarkCheck, UserCircle2
} from "lucide-react";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";
import { UserProvider, useUser } from "@/context/UserContext";
import { useEffect } from "react";
import { signOutAndRedirect } from "@/lib/auth-utils";


export default function SeekerLayoutClient({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User;
}) {
    return (
        <UserProvider initialUser={initialUser}>
            <SeekerLayoutInner>{children}</SeekerLayoutInner>
        </UserProvider>
    );
}

function SeekerLayoutInner({ children }: { children: React.ReactNode }) {
    const { user, refreshUser } = useUser();
    
    // Sync with DB on mount to fix stale SSR data
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    if (!user) return null;

    // Defined inside the component so the same module-instance is used on
    // both the server and client — avoids icon-reference hydration mismatches.
    const seekerNavGroups: NavGroup[] = [
        {
            items: [
                { label: "Home", href: "/dashboard/seeker", icon: LayoutDashboard },
                { label: "Find Jobs", href: "/dashboard/seeker/jobs", icon: Briefcase },
                { label: "Applications", href: "/dashboard/seeker/applications", icon: Briefcase },
                { label: "Saved Jobs", href: "/dashboard/seeker/saved", icon: BookmarkCheck },
            ]
        },
        {
            items: [
                { label: "Profile", href: "/dashboard/seeker/profile", icon: UserCircle2 },
            ]
        }
    ];

    const seekerProfile: JobSeeker | null = user.jobSeeker ?? null;

    const handleLogout = async () => {
        await signOutAndRedirect();
    };

    const fullName = seekerProfile?.full_name || user?.email?.split("@")[0] || "User";
    const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <DashboardLayout
            navGroups={seekerNavGroups}
            userFullName={fullName}
            userInitials={initials}
            userRoleLabel="Job seeker"
            onLogout={handleLogout}
            topBarChildren={
                <>
                    <div className="hidden h-6 w-px bg-stone-200 dark:bg-slate-800 md:block"></div>
                    <Link href="/dashboard/seeker/profile" className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl bg-[#16324f] px-4 text-xs font-semibold text-white transition-colors hover:opacity-90 sm:px-5 sm:text-sm">
                        <span className="hidden sm:inline">Edit profile</span><span className="sm:hidden">Profile</span>
                    </Link>
                </>
            }
        >
            {children}
        </DashboardLayout>
    );
}
