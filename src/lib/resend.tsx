import { Resend } from "resend";
import { HELLO_EMAIL } from "./email-addresses";
import {
  renderEmail,
  WelcomeEmail,
  ApplicationStatusEmail,
  AdminSecurityAlertEmail,
  EmployerVerificationEmail,
  RevealResponseEmail,
  JobExpirationEmail,
  EmployerDigestEmail,
  NewApplicationEmail,
  PaymentConfirmationEmail,
  JobAlertEmail
} from "../emails/templates";
import { getSupabaseAdminClient } from "./supabase-admin";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

const BRAND_NAME = "Aganyu";
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || `${BRAND_NAME} <${HELLO_EMAIL}>`;

async function shouldSendEmail(email: string, type: 'marketing' | 'job_alerts' | 'application_updates' | 'weekly_digest'): Promise<boolean> {
  try {
    const adminClient = getSupabaseAdminClient();
    if (!adminClient) return true;
    
    const { data } = await adminClient
      .from("users")
      .select("email_preferences")
      .eq("email", email)
      .maybeSingle();
      
    if (!data || !data.email_preferences) return true;
    
    const prefs = data.email_preferences as any;
    if (prefs[type] === false) {
      console.log(`[EMAIL_PREF] Skipping ${type} email to ${email} due to user preferences.`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[EMAIL_PREF] Error checking preferences:", error);
    return true;
  }
}

export async function sendWelcomeEmail(to: string, name?: string) {
  try {
    if (!to) {
      console.error("[EMAIL_DEBUG] FAILED: No recipient email provided for welcome email");
      return { success: false, error: "No recipient email" };
    }

    console.log(`[EMAIL_DEBUG] Sending welcome email to ${to}`);
    const html = await renderEmail(<WelcomeEmail name={name} />);
    
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `Welcome to ${BRAND_NAME}`,
      html,
    });

    if (data.error) throw data.error;
    console.log(`[EMAIL_DEBUG] SUCCESS: Welcome email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error(`[EMAIL_DEBUG] EXCEPTION sending welcome email to ${to}:`, error);
    return { success: false, error };
  }
}

export async function sendApplicationStatusEmail(to: string, payload: {
  seekerName: string;
  jobTitle: string;
  companyName: string;
  status: 'ACCEPTED' | 'REJECTED' | 'SHORTLISTED' | 'INTERVIEWING';
  interviewLink?: string;
}) {
  try {
    if (!to) return { success: false, error: "No recipient email" };
    
    const canSend = await shouldSendEmail(to, 'application_updates');
    if (!canSend) return { success: true, skipped: true };

    const html = await renderEmail(<ApplicationStatusEmail {...payload} />);
    
    console.log(`[EMAIL_DEBUG] Sending application status email (${payload.status}) to ${to}`);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `Update on your application at ${payload.companyName}`,
      html,
    });

    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    console.error(`[EMAIL_DEBUG] EXCEPTION sending application status email to ${to}:`, error);
    return { success: false, error };
  }
}

export async function sendAdminSecurityAlert(payload: {
  event: string;
  details: string;
  metadata?: any;
}) {
  try {
    const html = await renderEmail(<AdminSecurityAlertEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: ["sensei@aganyu.com"],
      subject: `🚨 Security Alert: ${payload.event}`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendEmployerVerificationEmail(to: string, payload: {
  companyName: string;
  status: 'APPROVED' | 'REJECTED';
  notes?: string;
}) {
  try {
    const isApproved = payload.status === 'APPROVED';
    const html = await renderEmail(<EmployerVerificationEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: isApproved
        ? `✅ ${payload.companyName} — Corporate Account Verified`
        : `🔴 ${payload.companyName} — Verification Update`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendRevealResponseEmail(to: string, payload: {
  employerName: string;
  seekerName: string;
  status: 'APPROVED' | 'REJECTED';
}) {
  try {
    const isApproved = payload.status === 'APPROVED';
    const html = await renderEmail(<RevealResponseEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: isApproved
        ? `Profile Revealed: ${payload.seekerName}`
        : `Reveal Declined: Candidate remains anonymous`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendJobExpirationAlertEmail(to: string, payload: {
  companyName: string;
  jobTitle: string;
  jobId: string;
  expiryDate: string;
}) {
  try {
    const html = await renderEmail(<JobExpirationEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `⚠️ Action Required: Your job for ${payload.jobTitle} is expiring soon`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendEmployerMatchDigestEmail(to: string, payload: {
  companyName: string;
  matches: {
    jobTitle: string;
    candidateName: string;
    score: number;
    matchJustification: string;
  }[];
}) {
  try {
    if (!to) return { success: false, error: "No recipient email" };
    
    const canSend = await shouldSendEmail(to, 'weekly_digest');
    if (!canSend) return { success: true, skipped: true };

    const html = await renderEmail(<EmployerDigestEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `📈 Weekly Candidate Digest: ${payload.matches.length} matches for ${payload.companyName}`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendNewApplicationEmail(to: string, payload: {
  employerName: string;
  jobTitle: string;
  candidateName: string;
}) {
  try {
    if (!to) return { success: false, error: "No recipient email" };
    
    const html = await renderEmail(<NewApplicationEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `New application for ${payload.jobTitle}`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendPaymentConfirmationEmail(to: string, payload: {
  name?: string;
  amount: number | string;
  currency: string;
  reference: string;
  description: string;
  dashboardPath?: string;
}) {
  try {
    const html = await renderEmail(<PaymentConfirmationEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `${BRAND_NAME} payment confirmation`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendJobAlertEmail(to: string, payload: {
  seekerName: string;
  matchedJobs: Array<{
    id: string;
    title: string;
    location: string;
    type: string;
    employer: { company_name: string };
  }>;
}) {
  try {
    if (!to || !payload.matchedJobs || payload.matchedJobs.length === 0) return { success: false, error: "Invalid payload" };

    const canSend = await shouldSendEmail(to, 'job_alerts');
    if (!canSend) return { success: true, skipped: true };

    const html = await renderEmail(<JobAlertEmail {...payload} />);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `[Aganyu] ${payload.matchedJobs.length} new ${payload.matchedJobs.length === 1 ? 'job' : 'jobs'} match your search alert`,
      html,
    });
    if (data.error) throw data.error;
    return { success: true, data };
  } catch (error) {
    console.error("Error sending job alert email:", error);
    return { success: false, error };
  }
}
