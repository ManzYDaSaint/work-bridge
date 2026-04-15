import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

const BRAND_NAME = "WorkBridge";
const BRAND_COLOR = "#16324f";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://workbridge.co";
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || `${BRAND_NAME} <onboarding@resend.dev>`;

/**
 * Premium Email Layout Wrapper
 */
function renderEmailLayout(content: string, title: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 40px 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .header { background: ${BRAND_COLOR}; padding: 40px; text-align: center; color: white; }
          .body { padding: 40px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
          .btn { display: inline-block; background: ${BRAND_COLOR}; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 20px; }
          pre { background: #f1f5f9; padding: 16px; border-radius: 12px; font-size: 13px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${BRAND_NAME}</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${title}</p>
          </div>
          <div class="body">
            ${content}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendWelcomeEmail(to: string, name?: string) {
  try {
    const title = "Welcome to WorkBridge";
    const content = `
      <p>Hey ${name || "there"},</p>
      <p>Thanks for joining <strong>${BRAND_NAME}</strong>. You are now part of a focused hiring platform built for clear, fast job discovery and hiring.</p>
      <p>Keep your profile current and use structured applications to stand out to employers.</p>
      <a href="${APP_URL}/login" class="btn">Access Dashboard</a>
      <p style="margin-top: 30px;">Best regards,<br/>The ${BRAND_NAME} Team</p>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `Welcome to ${BRAND_NAME}`,
      html: renderEmailLayout(content, title),
    });

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendApplicationStatusEmail(to: string, payload: {
  seekerName: string;
  jobTitle: string;
  companyName: string;
  status: 'ACCEPTED' | 'REJECTED' | 'SHORTLISTED';
}) {
  try {
    const title = "Application Update Detected";
    const isPositive = payload.status !== 'REJECTED';

    const content = `
      <p>Hello ${payload.seekerName},</p>
      <p>Your application for <strong>${payload.jobTitle}</strong> at <strong>${payload.companyName}</strong> has been updated.</p>
      <div style="padding: 20px; background: ${isPositive ? '#ecfdf5' : '#fff1f2'}; border-radius: 12px; margin: 20px 0; border-left: 4px solid ${isPositive ? '#10b981' : '#f43f5e'};">
        <p style="margin: 0; font-weight: 700; color: ${isPositive ? '#065f46' : '#9f1239'};">
          New Status: ${payload.status}
        </p>
      </div>
      <p>${isPositive ? "The employer has matched with your profile. Sign in to view any next steps or interview requests." : "The employer has decided to move forward with other candidates at this time. Keep your profile updated for future matches."}</p>
      <a href="${APP_URL}/dashboard/seeker/applications" class="btn">View Application</a>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `Update on your application at ${payload.companyName}`,
      html: renderEmailLayout(content, title),
    });

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendAdminSecurityAlert(payload: {
  event: string;
  details: string;
  metadata?: any;
}) {
  try {
    const title = "Critical Security Alert";
    const content = `
      <p><strong>Security Event Detected:</strong></p>
      <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 12px;">
        <p style="margin: 0; color: #9f1239; font-weight: 700;">${payload.event}</p>
        <p style="margin: 8px 0 0 0; font-size: 14px;">${payload.details}</p>
      </div>
      <p style="margin-top: 20px;"><strong>Metadata:</strong></p>
      <pre>${JSON.stringify(payload.metadata, null, 2)}</pre>
      <a href="${APP_URL}/dashboard/admin" class="btn">Investigate Now</a>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: ["admin@workbridge.com"],
      subject: `🚨 Security Alert: ${payload.event}`,
      html: renderEmailLayout(content, title),
    });

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
    const title = isApproved ? "Corporate Account Verified" : "Corporate Account Update";

    const content = `
      <p>Dear ${payload.companyName} Team,</p>
      <p>Your WorkBridge corporate account has been reviewed by our trust team.</p>
      <div style="padding: 20px; background: ${isApproved ? '#ecfdf5' : '#fff1f2'}; border-radius: 12px; margin: 20px 0; border-left: 4px solid ${isApproved ? '#10b981' : '#f43f5e'};">
        <p style="margin: 0; font-weight: 800; font-size: 18px; color: ${isApproved ? '#065f46' : '#9f1239'};">
          Status: ${payload.status}
        </p>
        ${payload.notes ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">${payload.notes}</p>` : ''}
      </div>
      ${isApproved
        ? `<p>Your account is now <strong>fully activated</strong>. You can now deploy job roles and access the verified talent pool.</p>
           <a href="${APP_URL}/dashboard/employer" class="btn">Access Employer Dashboard</a>`
        : `<p>Unfortunately, your application did not meet our current verification standards. Please contact our support team if you believe this is an error.</p>
           <a href="mailto:support@workbridge.io" class="btn">Contact Support</a>`
      }
      <p style="margin-top: 30px;">Best regards,<br/>The ${BRAND_NAME} Trust & Safety Team</p>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: isApproved
        ? `✅ ${payload.companyName} — Corporate Account Verified`
        : `🔴 ${payload.companyName} — Verification Update`,
      html: renderEmailLayout(content, title),
    });

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
    const title = "Candidate Profile Reveal Update";

    const content = `
      <p>Hello ${payload.employerName} Team,</p>
      <p>The candidate <strong>${payload.seekerName}</strong> has responded to your request to reveal their full profile.</p>
      <div style="padding: 20px; background: ${isApproved ? '#ecfdf5' : '#f8fafc'}; border-radius: 12px; border-left: 4px solid ${isApproved ? '#10b981' : '#cbd5e1'}; margin: 20px 0;">
        <p style="margin: 0; font-weight: 700; color: ${isApproved ? '#065f46' : '#334155'};">
          Response: ${isApproved ? 'Profile Revealed' : 'Request Declined'}
        </p>
      </div>
      ${isApproved
        ? `<p>You now have full access to the candidate's verified identity, contact information, and un-redacted resume. You may reach out to them directly.</p>
           <a href="${APP_URL}/dashboard/employer/candidates" class="btn">Open Candidates</a>`
        : `<p>The candidate has chosen to remain anonymous at this time.</p>
           <a href="${APP_URL}/dashboard/employer/candidates" class="btn">Open Candidates</a>`
      }
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: isApproved
        ? `Profile Revealed: ${payload.seekerName}`
        : `Reveal Declined: Candidate remains anonymous`,
      html: renderEmailLayout(content, title),
    });

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
    const title = "Action Required: Job Listing Expiring Soon";
    const content = `
      <p>Dear ${payload.companyName} Team,</p>
      <p>Your job listing for <strong>${payload.jobTitle}</strong> is scheduled to expire on <strong>${payload.expiryDate}</strong>.</p>
      <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-weight: 700;">Expiry Date: ${payload.expiryDate}</p>
        <p style="margin: 8px 0 0 0; font-size: 14px;">Once expired, the listing will no longer be visible to candidates in the talent pool.</p>
      </div>
      <p>Don't miss out on top talent. You can extend this listing or repost it with a single click to maintain your hiring momentum.</p>
      <a href="${APP_URL}/dashboard/employer/jobs" class="btn">Manage Listings</a>
      <p style="margin-top: 30px;">Best regards,<br/>The ${BRAND_NAME} Support Team</p>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `⚠️ Action Required: Your job for ${payload.jobTitle} is expiring soon`,
      html: renderEmailLayout(content, title),
    });

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
    const title = "Weekly candidate digest";
    const content = `
      <p>Dear ${payload.companyName} Team,</p>
      <p>Here are the strongest structured candidate matches for your active roles this week.</p>
      
      <div style="margin: 30px 0;">
        ${payload.matches.map(m => `
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 16px; background: white;">
            <div style="margin-bottom: 8px;">
              <span style="font-weight: 800; color: ${BRAND_COLOR}; font-size: 14px;">${m.jobTitle.toUpperCase()}</span>
              <span style="background: #eff6ff; color: ${BRAND_COLOR}; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; float: right;">
                ${m.score}% Match
              </span>
            </div>
            <p style="margin: 4px 0; font-weight: 600; font-size: 16px;">${m.candidateName}</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; font-style: italic;">"${m.matchJustification}"</p>
          </div>
        `).join('')}
      </div>

      <p>Log in to your dashboard to review active candidates and move strong applicants into your shortlist.</p>
      <a href="${APP_URL}/dashboard/employer/candidates" class="btn">Review Candidates</a>
      <p style="margin-top: 30px;">Keep building,<br/>The ${BRAND_NAME} Team</p>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `📈 Weekly Candidate Digest: ${payload.matches.length} matches for ${payload.companyName}`,
      html: renderEmailLayout(content, title),
    });

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
    const title = "New application received";
    const content = `
      <p>Hello ${payload.employerName},</p>
      <p>A new candidate has applied for <strong>${payload.jobTitle}</strong>.</p>
      <div style="padding: 20px; background: #eff6ff; border-radius: 12px; margin: 20px 0; border-left: 4px solid ${BRAND_COLOR};">
        <p style="margin: 0; font-weight: 700; color: #0f172a;">
          Candidate: ${payload.candidateName}
        </p>
      </div>
      <p>Open your candidates page to review the structured checklist and decide whether to shortlist or pass.</p>
      <a href="${APP_URL}/dashboard/employer/candidates" class="btn">Review Candidates</a>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `New application for ${payload.jobTitle}`,
      html: renderEmailLayout(content, title),
    });

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
    const title = "Payment confirmed";
    const content = `
      <p>Hello ${payload.name || "there"},</p>
      <p>Your payment has been received successfully.</p>
      <div style="padding: 20px; background: #ecfdf5; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981;">
        <p style="margin: 0; font-weight: 700; color: #065f46;">Amount: ${payload.currency} ${payload.amount}</p>
        <p style="margin: 8px 0 0 0; color: #065f46;">Reference: ${payload.reference}</p>
        <p style="margin: 8px 0 0 0; color: #065f46;">${payload.description}</p>
      </div>
      <a href="${APP_URL}${payload.dashboardPath || "/dashboard"}" class="btn">Open dashboard</a>
    `;

    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `${BRAND_NAME} payment confirmation`,
      html: renderEmailLayout(content, title),
    });

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}
