import { createNotification } from "./notifications";
import { getSupabaseAdminClient } from "./supabase-admin";

export async function sendInviteToApply(userId: string, jobId: string, companyName: string, jobTitle: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[INVITE_SERVICE] FAILED: Admin client not initialized.");
    return { success: false, error: "Internal server error" };
  }

  try {
    // 1. Create a 'dummy' application with status 'INVITED'
    // This ensures the candidate sees the invite in their dashboard and the employer can track it.
    const { data: application, error: appError } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        job_id: jobId,
        status: "INVITED",
      })
      .select()
      .single();

    if (appError) {
      console.error(`[INVITE_SERVICE] DATABASE_ERROR: ${appError.message}`);
      return { success: false, error: appError.message };
    }

    // 2. Trigger the high-priority notification
    await createNotification({
      userId,
      type: "INVITE_TO_APPLY",
      templateVars: {
        companyName,
        jobTitle,
      },
      link: `/dashboard/jobs/${jobId}`,
    });

    console.log(`[INVITE_SERVICE] SUCCESS: Invite sent to user ${userId} for job ${jobId}`);
    return { success: true, data: application };
  } catch (err) {
    console.error("[INVITE_SERVICE] Unexpected error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}