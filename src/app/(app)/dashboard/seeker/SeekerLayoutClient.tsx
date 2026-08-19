"use client";

import Link from "next/link";
import { User, JobSeeker } from "@/types";
import {
    LayoutDashboard, Briefcase, BookmarkCheck, UserCircle2, Sparkles, GraduationCap, Crown
} from "lucide-react";
import DashboardLayout, { NavGroup } from "@/components/layout/DashboardLayout";
import { UserProvider, useUser } from "@/context/UserContext";
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
    const { user } = useUser();

    if (!user) return null;

    // Defined inside the component so the same module-instance is used on
    // both the server and client — avoids icon-reference hydration mismatches.
    const seekerNavGroups: NavGroup[] = [
        {
            items: [
                { label: "Home", href: "/dashboard/seeker", icon: LayoutDashboard },
                { label: "Find Jobs", href: "/dashboard/seeker/jobs", icon: Briefcase },
                { label: "Recommended", href: "/dashboard/seeker/recommendations", icon: Sparkles },
                { label: "My Opportunities", href: "/dashboard/seeker/opportunities", icon: GraduationCap },
                { label: "Applications", href: "/dashboard/seeker/applications", icon: Briefcase },
                { label: "Saved Jobs", href: "/dashboard/seeker/saved", icon: BookmarkCheck },
            ]
        },
        {
            items: [
                { label: "Aganyu Premium", href: "/dashboard/seeker/subscription", icon: Crown },
                { label: "Profile", href: "/dashboard/seeker/profile", icon: UserCircle2 },
            ]
        }
    ];

    const seekerProfile: JobSeeker | null = user.jobSeeker ?? null;
    const isPremium = user?.plan === "PREMIUM" || seekerProfile?.isSubscribed === true;

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
            isPremium={isPremium}
            onLogout={handleLogout}
            topBarChildren={
                <>
                    {isPremium ? (
                        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm backdrop-blur">
                            <Crown size={14} className="text-amber-500 shrink-0" />
                            <span className="hidden sm:inline">PREMIUM MEMBER</span>
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="WhatsApp Alerts Active"></span>
                        </div>
                    ) : (
                        <Link href="/dashboard/seeker/subscription" className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95">
                            <Sparkles size={13} />
                            <span>Upgrade MWK 1,000</span>
                        </Link>
                    )}
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
