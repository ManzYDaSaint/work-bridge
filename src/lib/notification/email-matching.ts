import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";
import { renderEmail, JobAlertEmail } from "@/emails/templates";
import { HELLO_EMAIL } from "@/lib/email-addresses";

const BRAND_NAME = "Aganyu";
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || `${BRAND_NAME} <${HELLO_EMAIL}>`;

export interface StandardMatchAlert {
  seekerEmail: string;
  seekerName: string;
  jobTitle: string;
  companyName: string;
  location: string;
  jobId: string;
  matchScore: number;
  matchReason?: string;
}

/**
 * Sends a job match email alert to a standard (non-premium) job seeker via Resend.
 */
export async function sendStandardJobMatchEmail(alert: StandardMatchAlert): Promise<{ success: boolean; error?: string }> {
  try {
    if (!alert.seekerEmail) {
      return { success: false, error: "No recipient email provided" };
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey || apiKey === "re_dummy_key") {
      console.warn("[StandardEmail] RESEND_API_KEY is not configured or dummy.");
      return { success: false, error: "Resend API key not configured" };
    }

    const matchedJobs = [
      {
        id: alert.jobId,
        title: alert.jobTitle,
        display_company_name: alert.companyName,
        location: alert.location,
        type: "Full-Time"
      }
    ];

    const html = await renderEmail(
      JobAlertEmail({
        seekerName: alert.seekerName || "Job Seeker",
        matchedJobs
      })
    );

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: alert.seekerEmail,
      subject: `New Job Match: ${alert.jobTitle} at ${alert.companyName} (${alert.matchScore}% match)`,
      html
    });

    if (error) {
      console.error("[StandardEmail] Resend API error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[StandardEmail] Sent match email to ${alert.seekerEmail} for job ${alert.jobId} (id=${data?.id})`);
    return { success: true };
  } catch (err: any) {
    console.error("[StandardEmail] Exception sending email:", err);
    return { success: false, error: err?.message || "Unknown error" };
  }
}
