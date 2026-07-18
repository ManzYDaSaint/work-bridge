"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit";
import { validateAuth } from "@/lib/auth-guard";
import { NotificationService } from "@/services/notification.service";

/**
 * Requests a profile reveal from a job seeker.
 */
export async function requestProfileReveal(seekerId: string) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { data, error } = await supabase
            .from("profile_reveals")
            .insert([{
                employer_id: auth.user.id,
                seeker_id: seekerId,
                status: "PENDING"
            }])
            .select()
            .single();

        if (error) {
            if (error.code === "23505") return { error: "Reveal already requested." };
            throw error;
        }

        revalidatePath("/dashboard/employer");

        await recordAuditLog({
            action: "PROFILE_REVEAL_REQUESTED",
            path: "/dashboard/employer",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { seekerId, revealId: data.id }
        });

        return { success: true };

    } catch (err) {
        console.error("[Request Reveal] Error:", err);
        return { error: "Failed to request reveal. Please try again." };
    }
}

/**
 * Deletes a job posting.
 */
export async function deleteJob(jobId: string) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from("jobs")
            .delete()
            .eq("id", jobId)
            .eq("employer_id", auth.user.id);

        if (error) throw error;

        revalidatePath("/dashboard/employer/jobs");
        
        await recordAuditLog({
            action: "JOB_DELETED",
            path: "/dashboard/employer/jobs",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { jobId }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Delete Job] Error:", err);
        return { error: err.message || "Failed to delete job." };
    }
}

/**
 * Reposts an expired job with a new deadline.
 */
export async function repostJob(jobId: string, deadline: string) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from("jobs")
            .update({ 
                status: "ACTIVE", 
                deadline: deadline,
                is_new: true 
            })
            .eq("id", jobId)
            .eq("employer_id", auth.user.id);

        if (error) throw error;

        revalidatePath("/dashboard/employer/jobs");

        await recordAuditLog({
            action: "JOB_REPOSTED",
            path: "/dashboard/employer/jobs",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { jobId, deadline }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Repost Job] Error:", err);
        return { error: err.message || "Failed to repost job." };
    }
}

/**
 * Closes a job by marking it as filled.
 */
export async function closeJob(jobId: string) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from("jobs")
            .update({ status: "FILLED" })
            .eq("id", jobId)
            .eq("employer_id", auth.user.id);

        if (error) {
            throw error;
        }

        revalidatePath("/dashboard/employer/jobs");

        await recordAuditLog({
            action: "JOB_CLOSED",
            path: "/dashboard/employer/jobs",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { jobId }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Close Job] Error:", err);
        return { error: err.message || "Failed to close job." };
    }
}

/**
 * Updates the status of a candidate's application.
 */
export async function updateApplicationStatus(
    applicationId: string, 
    status: "SHORTLISTED" | "REJECTED" | "INTERVIEWING" | "ACCEPTED", 
    interviewLink?: string
) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const updateData: any = { status };
        if (status === "INTERVIEWING" && interviewLink) {
            updateData.interview_link = interviewLink;
        }

        const { error } = await supabase
            .from("applications")
            .update(updateData)
            .eq("id", applicationId);

        if (error) throw error;

        // Notify the seeker about the status update
        const { data: appData } = await supabase
            .from("applications")
            .select(`user_id, jobs ( title, employers ( company_name ) )`)
            .eq("id", applicationId)
            .single();

        if (appData) {
            const job = appData.jobs as any;
            const employer = job?.employers as any;

            await NotificationService.createNotification({
                userId: appData.user_id,
                type: "APPLICATION_UPDATE",
                templateVars: {
                    companyName: employer?.company_name || "an employer",
                    jobTitle: job?.title || "the position",
                    status: status,
                },
                link: `/dashboard/seeker/applications/${applicationId}`,
            });
        }

        revalidatePath("/dashboard/employer/candidates");

        await recordAuditLog({
            action: "APPLICATION_STATUS_UPDATED",
            path: "/dashboard/employer/candidates",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { applicationId, status }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Update Application Status] Error:", err);
        return { error: err.message || "Failed to update application status." };
    }
}

/**
 * Bulk rejects applications that don't meet criteria.
 */
export async function bulkRejectApplications(applicationIds: string[]) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from("applications")
            .update({ status: "REJECTED" })
            .in("id", applicationIds);

        if (error) throw error;

        revalidatePath("/dashboard/employer/candidates");

        await recordAuditLog({
            action: "BULK_APPLICATION_REJECTED",
            path: "/dashboard/employer/candidates",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { count: applicationIds.length }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Bulk Reject] Error:", err);
        return { error: err.message || "Failed to bulk reject applications." };
    }
}

/**
 * Marks an application as viewed.
 */
export async function markApplicationAsViewed(applicationId: string) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from("applications")
            .update({ viewed_at: new Date().toISOString() })
            .eq("id", applicationId);

        if (error) throw error;

        // We don't necessarily need to revalidate the whole page for a "viewed" mark
        return { success: true };
    } catch (err: any) {
        console.error("[Mark Viewed] Error:", err);
        return { error: err.message || "Failed to mark application as viewed." };
    }
}

/**
 * Toggles the "saved" status of a candidate in the discovery tool.
 */
export async function toggleSaveTalent(seekerId: string, isCurrentlySaved: boolean) {
    const auth = await validateAuth(["EMPLOYER"], false, true);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        if (isCurrentlySaved) {
            const { error } = await supabase
                .from("employer_saved_candidates")
                .delete()
                .eq("seeker_id", seekerId)
                .eq("employer_id", auth.user.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("employer_saved_candidates")
                .insert([{
                    employer_id: auth.user.id,
                    seeker_id: seekerId
                }]);
            if (error) throw error;
        }

        revalidatePath("/dashboard/employer/discover");

        await recordAuditLog({
            action: "TALENT_SAVE_TOGGLED",
            path: "/dashboard/employer/discover",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { seekerId, saved: !isCurrentlySaved }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Toggle Save Talent] Error:", err);
        return { error: err.message || "Failed to update saved status." };
    }
}

/**
 * Updates the employer's profile details.
 */
export async function updateEmployerProfile(values: any) {
    const auth = await validateAuth(["EMPLOYER"], false, false);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from("employers")
            .update({
                company_name: values.companyName,
                industry: values.industry,
                location: values.location,
                website: values.website,
                description: values.description,
                logo_url: values.logoUrl,
                application_alerts: values.applicationAlerts,
            })
            .eq("id", auth.user.id);

        if (error) throw error;

        revalidatePath("/dashboard/employer/settings");

        await recordAuditLog({
            action: "EMPLOYER_PROFILE_UPDATED",
            path: "/dashboard/employer/settings",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { updatedFields: Object.keys(values) }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Update Profile] Error:", err);
        return { error: err.message || "Failed to update profile." };
    }
}


/**
 * Submits a request to close the employer account.
 */
export async function requestAccountClosure(reasons: string[], additionalNotes: string) {
    const auth = await validateAuth(["EMPLOYER"], false, false);
    if (auth.error || !auth.user) {
        throw new Error("Unauthorized");
    }

    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from("account_closure_requests")
            .insert([{
                employer_id: auth.user.id,
                reasons,
                additional_notes: additionalNotes,
                status: "PENDING"
            }]);

        if (error) throw error;

        revalidatePath("/dashboard/employer/settings");

        await recordAuditLog({
            action: "ACCOUNT_CLOSURE_REQUESTED",
            path: "/dashboard/employer/settings",
            method: "SERVER_ACTION",
            statusCode: 200,
            userId: auth.user.id,
            metadata: { reasonsCount: reasons.length }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[Request Closure] Error:", err);
        return { error: err.message || "Failed to submit closure request." };
    }
}

