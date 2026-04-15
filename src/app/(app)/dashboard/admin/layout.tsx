import { requireDashboardProfile } from "@/lib/dashboard-auth";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const { profile } = await requireDashboardProfile("ADMIN");
    return <AdminLayoutClient initialUser={profile}>{children}</AdminLayoutClient>;
}
