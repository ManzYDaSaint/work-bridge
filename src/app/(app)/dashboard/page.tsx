import { redirect } from "next/navigation";
import { validateAuth } from "@/lib/auth-guard";

export default async function DashboardRedirect() {
    const auth = await validateAuth();
    if (auth.error) {
        redirect("/login");
    }

    redirect(`/dashboard/${auth.role === "ADMIN" ? "admin" : auth.role === "EMPLOYER" ? "employer" : "seeker"}`);
}
