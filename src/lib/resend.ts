import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND_NAME = "WorkBridge";
const BRAND_COLOR = "#2563eb"; // Blue 600

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
            &copy; ${new Date().getFullYear()} ${BRAND_NAME} Intelligence Systems. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendWelcomeEmail(to: string, name?: string) {
    try {
        const title = "Welcome to the Future of Work";
        const content = `
      <p>Hey ${name || "there"},</p>
      <p>Thanks for joining <strong>${BRAND_NAME}</strong>. You are now part of an elite ecosystem built for high-impact talent discovery and placement.</p>
      <p>Leverage our AI-driven matching and autonomous verification to streamline your lifecycle.</p>
      <a href="${process.env.NEXT_PUBLIC_URL}/login" class="btn">Access Dashboard</a>
      <p style="margin-top: 30px;">Best regards,<br/>The ${BRAND_NAME} Team</p>
    `;

        const data = await resend.emails.send({
            from: `${BRAND_NAME} <onboarding@resend.dev>`,
            to: [to],
            subject: `Welcome to ${BRAND_NAME} 🚀`,
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
      <a href="${process.env.NEXT_PUBLIC_URL}/dashboard/seeker/applications" class="btn">View Application</a>
    `;

        const data = await resend.emails.send({
            from: `${BRAND_NAME} Notifications <onboarding@resend.dev>`,
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
      <a href="${process.env.NEXT_PUBLIC_URL}/dashboard/admin" class="btn">Investigate Now</a>
    `;

        const data = await resend.emails.send({
            from: `${BRAND_NAME} Security <onboarding@resend.dev>`,
            to: ["admin@workbridge.com"],
            subject: `🚨 Security Alert: ${payload.event}`,
            html: renderEmailLayout(content, title),
        });

        return { success: true, data };
    } catch (error) {
        return { success: false, error };
    }
}
