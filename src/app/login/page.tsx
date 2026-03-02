import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import AuthLayout from "@/components/auth/AuthLayout";

export default async function LoginPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect("/dashboard");
    }

    return (
        <AuthLayout>
            <LoginForm />
        </AuthLayout>
    );
}
