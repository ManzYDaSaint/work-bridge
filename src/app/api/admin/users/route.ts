import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        // Fetch users with their corresponding seeker or employer profile if exists
        const { data: users, error } = await supabase
            .from("users")
            .select(`
                id,
                email,
                role,
                created_at,
                job_seekers:job_seekers (full_name, location),
                employers:employers (company_name, location)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Simplify user object for frontend
        const formattedUsers = users.map(u => {
            const seeker = Array.isArray(u.job_seekers) ? u.job_seekers[0] : u.job_seekers;
            const employer = Array.isArray(u.employers) ? u.employers[0] : u.employers;

            return {
                id: u.id,
                email: u.email,
                role: u.role,
                createdAt: u.created_at,
                name: u.role === 'JOB_SEEKER'
                    ? seeker?.full_name
                    : (u.role === 'EMPLOYER' ? employer?.company_name : 'Admin'),
                location: u.role === 'JOB_SEEKER'
                    ? seeker?.location
                    : employer?.location
            };
        });

        return NextResponse.json(formattedUsers);
    } catch (error) {
        console.error("Admin user fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    const supabase = await createSupabaseServerClient();

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Deleting from public.users cascades to job_seekers, employers, jobs, applications, etc.
        // It also causes validateAuth to fail, effectively banning the user even if they are still in auth.users
        const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", userId);

        if (error) throw error;

        return NextResponse.json({ success: true, metadata: { userId } });
    } catch (error) {
        console.error("Admin user delete error:", error);
        return NextResponse.json({ error: "Delete failed", details: (error as any)?.message }, { status: 500 });
    }
}
