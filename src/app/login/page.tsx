import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import AuthLayout from "@/components/auth/AuthLayout";
import { getAuthOptional } from "@/lib/auth-guard";

export default async function LoginPage() {
    const auth = await getAuthOptional();

    if (auth.user) {
        redirect("/dashboard");
    }

    return (
        <AuthLayout>
            <LoginForm />
        </AuthLayout>
    );
}
