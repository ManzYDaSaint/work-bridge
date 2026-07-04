import { validateAuth } from "@/lib/auth-guard";
import { adminService } from "@/services/adminService";
import { userService } from "@/services/userService";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const search = searchParams.get("search") || "";
        const role = searchParams.get("role") || "ALL";

        const { users, total } = await adminService.getSystemUsers({
            page,
            limit,
            search,
            role
        });

        // Simplify user object for frontend
        const formattedUsers = users.map(u => {
            const seeker = u.job_seeker;
            const employer = u.employer;

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

        return NextResponse.json({
            users: formattedUsers,
            total,
            page,
            limit
        });
    } catch (error) {
        console.error("Admin user fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await validateAuth(['ADMIN'], false);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        await userService.deleteUser(userId);

        await recordAuditLog({
            action: "users_DELETE",
            path: "/api/admin/users",
            method: "DELETE",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { deletedUserId: userId }
        });

        return NextResponse.json({ success: true, metadata: { userId } });
    } catch (error) {
        console.error("Admin user delete error:", error);
        return NextResponse.json({ error: "Delete failed", details: (error as any)?.message }, { status: 500 });
    }
}
