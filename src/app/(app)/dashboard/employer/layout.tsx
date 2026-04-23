import { requireDashboardProfile } from "@/lib/dashboard-auth";
import EmployerLayoutClient from "./EmployerLayoutClient";

export const dynamic = "force-dynamic";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
    const { profile } = await requireDashboardProfile("EMPLOYER");
    return <EmployerLayoutClient initialUser={profile}>{children}</EmployerLayoutClient>;
}
