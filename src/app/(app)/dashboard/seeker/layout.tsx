import { requireDashboardProfile } from "@/lib/dashboard-auth";
import SeekerLayoutClient from "./SeekerLayoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SeekerLayout({ children }: { children: React.ReactNode }) {
    const { profile } = await requireDashboardProfile("JOB_SEEKER");
    return <SeekerLayoutClient initialUser={profile}>{children}</SeekerLayoutClient>;
}
