import { redirect } from "next/navigation";

export default function PremiumHubPage() {
    redirect("/dashboard/admin/premium");
}

export const dynamic = "force-dynamic";
