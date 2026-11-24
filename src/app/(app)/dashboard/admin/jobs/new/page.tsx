import { validateAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import AdminNewJobClient from "./AdminNewJobClient";

export const metadata = {
    title: "Create Sourced Job — Aganyu Admin",
};

export default async function AdminNewJobPage() {
    const auth = await validateAuth(["ADMIN"], false);
    if (auth.error || !auth.user) {
        redirect("/login");
    }

    return <AdminNewJobClient />;
}

export const dynamic = "force-dynamic";
