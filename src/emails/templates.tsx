import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render
} from "@react-email/components";
import * as React from "react";

const BRAND_NAME = "Aganyu";
const BRAND_COLOR = "#16324f";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://aganyu.com";
const SUPPORT_EMAIL = "support@aganyu.com";

// --- STYLES ---
const main = {
  backgroundColor: "#f8fafc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "40px auto",
  padding: "0",
  width: "600px",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  overflow: "hidden",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
};

const header = {
  backgroundColor: BRAND_COLOR,
  padding: "40px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "800",
  margin: "0",
  letterSpacing: "-0.025em",
};

const subtitle = {
  color: "#e2e8f0",
  fontSize: "15px",
  marginTop: "8px",
  marginBottom: "0",
};

const contentSection = {
  padding: "40px",
};

const footer = {
  padding: "24px 40px",
  backgroundColor: "#f8fafc",
  borderTop: "1px solid #e2e8f0",
  textAlign: "center" as const,
};

const footerText = {
  color: "#64748b",
  fontSize: "12px",
  margin: "0",
};

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const btnContainer = {
  marginTop: "24px",
  marginBottom: "24px",
};

const btn = {
  backgroundColor: BRAND_COLOR,
  borderRadius: "12px",
  color: "#fff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  lineHeight: "1",
  padding: "16px 32px",
  textDecoration: "none",
  textAlign: "center" as const,
};

const cardAlert = {
  padding: "24px",
  backgroundColor: "#f1f5f9",
  borderRadius: "16px",
  marginBottom: "24px",
  borderLeft: `4px solid #cbd5e1`,
};

// --- BASE LAYOUT ---
interface LayoutProps {
  previewText: string;
  title: string;
  children: React.ReactNode;
}

const PremiumLayout = ({ previewText, title, children }: LayoutProps) => (
  <Html>
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{BRAND_NAME}</Heading>
          <Text style={subtitle}>{title}</Text>
        </Section>
        <Section style={contentSection}>
          {children}
        </Section>
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// --- INDIVIDUAL TEMPLATES ---

export const WelcomeEmail = ({ name }: { name?: string }) => (
  <PremiumLayout previewText="Welcome to Aganyu!" title="Welcome to Aganyu">
    <Text style={text}>Hey {name || "there"},</Text>
    <Text style={text}>
      Thanks for joining <strong>{BRAND_NAME}</strong>. You are now part of a focused hiring platform built for clear, fast job discovery and hiring.
    </Text>
    <Text style={text}>
      Keep your profile current and use structured applications to stand out to employers.
    </Text>
    <Section style={btnContainer}>
      <Link href={`${APP_URL}/login`} style={btn}>
        Access Dashboard
      </Link>
    </Section>
    <Text style={text}>
      Best regards,<br />
      The {BRAND_NAME} Team
    </Text>
  </PremiumLayout>
);

export const ApplicationStatusEmail = ({ seekerName, jobTitle, companyName, status, interviewLink }: {
  seekerName: string;
  jobTitle: string;
  companyName: string;
  status: 'ACCEPTED' | 'REJECTED' | 'SHORTLISTED' | 'INTERVIEWING';
  interviewLink?: string;
}) => {
  const isPositive = status !== 'REJECTED';
  const accentColor = isPositive ? '#10b981' : '#f43f5e';
  const bgColor = isPositive ? '#ecfdf5' : '#fff1f2';
  const textColor = isPositive ? '#065f46' : '#9f1239';

  return (
    <PremiumLayout previewText={`Update on your application at ${companyName}`} title="Application Update">
      <Text style={text}>Hello {seekerName},</Text>
      <Text style={text}>
        Your application for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been updated.
      </Text>
      
      <Section style={{ ...cardAlert, backgroundColor: bgColor, borderLeftColor: accentColor }}>
        <Text style={{ margin: 0, fontWeight: "700", color: textColor, fontSize: "18px" }}>
          New Status: {status}
        </Text>
      </Section>

      <Text style={text}>
        {isPositive 
          ? "The employer has matched with your profile. Sign in to view any next steps or interview requests." 
          : "The employer has decided to move forward with other candidates at this time. Keep your profile updated for future matches."}
      </Text>

      {status === 'INTERVIEWING' && interviewLink && (
        <Section style={{ marginTop: "24px", padding: "24px", backgroundColor: "#eff6ff", borderRadius: "16px", textAlign: "center" }}>
          <Text style={{ margin: "0 0 16px 0", color: "#1e3a8a", fontWeight: "600" }}>You have been invited to schedule an interview!</Text>
          <Link href={interviewLink} style={{ ...btn, backgroundColor: "#2563eb", width: "100%", boxSizing: "border-box" }}>
            Schedule Interview
          </Link>
        </Section>
      )}

      {!interviewLink && (
        <Section style={btnContainer}>
          <Link href={`${APP_URL}/dashboard/seeker/applications`} style={btn}>
            View Application
          </Link>
        </Section>
      )}
    </PremiumLayout>
  );
};

export const AdminSecurityAlertEmail = ({ event, details, metadata }: { event: string; details: string; metadata?: any }) => (
  <PremiumLayout previewText={`Security Alert: ${event}`} title="Critical Security Alert">
    <Text style={{ ...text, fontWeight: "bold" }}>Security Event Detected:</Text>
    <Section style={{ ...cardAlert, backgroundColor: "#fef2f2", borderLeftColor: "#ef4444" }}>
      <Text style={{ margin: 0, color: "#9f1239", fontWeight: "700", fontSize: "18px" }}>{event}</Text>
      <Text style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#475569" }}>{details}</Text>
    </Section>
    <Text style={{ ...text, fontWeight: "bold" }}>Metadata:</Text>
    <Section style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", overflowX: "auto" }}>
      <Text style={{ fontFamily: "monospace", fontSize: "12px", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(metadata, null, 2)}
      </Text>
    </Section>
    <Section style={btnContainer}>
      <Link href={`${APP_URL}/dashboard/admin`} style={{ ...btn, backgroundColor: "#ef4444" }}>
        Investigate Now
      </Link>
    </Section>
  </PremiumLayout>
);

export const EmployerVerificationEmail = ({ companyName, status, notes }: { companyName: string; status: 'APPROVED' | 'REJECTED'; notes?: string }) => {
  const isApproved = status === 'APPROVED';
  return (
    <PremiumLayout 
      previewText={isApproved ? "Your corporate account is verified" : "Corporate Account Update"} 
      title={isApproved ? "Corporate Account Verified" : "Corporate Account Update"}
    >
      <Text style={text}>Dear {companyName} Team,</Text>
      <Text style={text}>Your Aganyu corporate account has been reviewed by our trust team.</Text>
      
      <Section style={{ ...cardAlert, backgroundColor: isApproved ? '#ecfdf5' : '#fff1f2', borderLeftColor: isApproved ? '#10b981' : '#f43f5e' }}>
        <Text style={{ margin: 0, fontWeight: "800", fontSize: "18px", color: isApproved ? '#065f46' : '#9f1239' }}>
          Status: {status}
        </Text>
        {notes && <Text style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#64748b" }}>{notes}</Text>}
      </Section>

      {isApproved ? (
        <>
          <Text style={text}>Your account is now <strong>fully activated</strong>. You can now deploy job roles and access the verified talent pool.</Text>
          <Section style={btnContainer}>
            <Link href={`${APP_URL}/dashboard/employer`} style={btn}>Access Dashboard</Link>
          </Section>
        </>
      ) : (
        <>
          <Text style={text}>Unfortunately, your application did not meet our current verification standards. Please contact our support team if you believe this is an error.</Text>
          <Section style={btnContainer}>
            <Link href={`mailto:${SUPPORT_EMAIL}`} style={btn}>Contact Support</Link>
          </Section>
        </>
      )}
      <Text style={text}>Best regards,<br/>The {BRAND_NAME} Trust & Safety Team</Text>
    </PremiumLayout>
  );
};

export const RevealResponseEmail = ({ employerName, seekerName, status }: { employerName: string; seekerName: string; status: 'APPROVED' | 'REJECTED' }) => {
  const isApproved = status === 'APPROVED';
  return (
    <PremiumLayout previewText={`Candidate ${isApproved ? 'Revealed Profile' : 'Declined Request'}`} title="Profile Reveal Update">
      <Text style={text}>Hello {employerName} Team,</Text>
      <Text style={text}>The candidate <strong>{seekerName}</strong> has responded to your request to reveal their full profile.</Text>
      
      <Section style={{ ...cardAlert, backgroundColor: isApproved ? '#ecfdf5' : '#f8fafc', borderLeftColor: isApproved ? '#10b981' : '#cbd5e1' }}>
        <Text style={{ margin: 0, fontWeight: "700", color: isApproved ? '#065f46' : '#334155' }}>
          Response: {isApproved ? 'Profile Revealed' : 'Request Declined'}
        </Text>
      </Section>

      <Text style={text}>
        {isApproved 
          ? "You now have full access to the candidate's verified identity, contact information, and un-redacted resume. You may reach out to them directly."
          : "The candidate has chosen to remain anonymous at this time."}
      </Text>
      <Section style={btnContainer}>
        <Link href={`${APP_URL}/dashboard/employer/candidates`} style={btn}>Open Candidates</Link>
      </Section>
    </PremiumLayout>
  );
};

export const JobExpirationEmail = ({ companyName, jobTitle, expiryDate }: { companyName: string; jobTitle: string; expiryDate: string }) => (
  <PremiumLayout previewText={`Your job listing for ${jobTitle} is expiring soon`} title="Action Required: Job Expiring">
    <Text style={text}>Dear {companyName} Team,</Text>
    <Text style={text}>Your job listing for <strong>{jobTitle}</strong> is scheduled to expire on <strong>{expiryDate}</strong>.</Text>
    
    <Section style={{ ...cardAlert, backgroundColor: "#fffbeb", borderLeftColor: "#f59e0b" }}>
      <Text style={{ margin: 0, color: "#92400e", fontWeight: "700" }}>Expiry Date: {expiryDate}</Text>
      <Text style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#b45309" }}>Once expired, the listing will no longer be visible to candidates in the talent pool.</Text>
    </Section>

    <Text style={text}>Don't miss out on top talent. You can extend this listing or repost it with a single click to maintain your hiring momentum.</Text>
    <Section style={btnContainer}>
      <Link href={`${APP_URL}/dashboard/employer/jobs`} style={btn}>Manage Listings</Link>
    </Section>
    <Text style={text}>Best regards,<br/>The {BRAND_NAME} Support Team</Text>
  </PremiumLayout>
);

export const EmployerDigestEmail = ({ companyName, matches }: { companyName: string; matches: any[] }) => (
  <PremiumLayout previewText={`Weekly candidate digest: ${matches.length} matches`} title="Weekly Candidate Digest">
    <Text style={text}>Dear {companyName} Team,</Text>
    <Text style={text}>Here are the strongest structured candidate matches for your active roles this week.</Text>
    
    <Section style={{ margin: "32px 0" }}>
      {matches.map((m, i) => (
        <Section key={i} style={{ padding: "24px", border: "1px solid #e2e8f0", borderRadius: "16px", marginBottom: "16px", backgroundColor: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <Text style={{ margin: "0 0 8px 0" }}>
            <span style={{ fontWeight: "800", color: BRAND_COLOR, fontSize: "14px" }}>{m.jobTitle.toUpperCase()}</span>
            <span style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "4px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "12px", float: "right" }}>
              {m.score}% Match
            </span>
          </Text>
          <Text style={{ margin: "4px 0", fontWeight: "700", fontSize: "18px", color: "#0f172a" }}>{m.candidateName}</Text>
          <Text style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#64748b", fontStyle: "italic", lineHeight: "1.5" }}>"{m.matchJustification}"</Text>
        </Section>
      ))}
    </Section>

    <Text style={text}>Log in to your dashboard to review active candidates and move strong applicants into your shortlist.</Text>
    <Section style={btnContainer}>
      <Link href={`${APP_URL}/dashboard/employer/candidates`} style={btn}>Review Candidates</Link>
    </Section>
  </PremiumLayout>
);

export const NewApplicationEmail = ({ employerName, jobTitle, candidateName }: { employerName: string; jobTitle: string; candidateName: string }) => (
  <PremiumLayout previewText={`New application received for ${jobTitle}`} title="New Application">
    <Text style={text}>Hello {employerName},</Text>
    <Text style={text}>A new candidate has applied for <strong>{jobTitle}</strong>.</Text>
    
    <Section style={{ ...cardAlert, borderLeftColor: BRAND_COLOR }}>
      <Text style={{ margin: 0, fontWeight: "700", color: "#0f172a", fontSize: "16px" }}>
        Candidate: {candidateName}
      </Text>
    </Section>

    <Text style={text}>Open your candidates page to review the structured checklist and decide whether to shortlist or pass.</Text>
    <Section style={btnContainer}>
      <Link href={`${APP_URL}/dashboard/employer/candidates`} style={btn}>Review Candidates</Link>
    </Section>
  </PremiumLayout>
);

export const PaymentConfirmationEmail = ({ name, amount, currency, reference, description, dashboardPath }: { name?: string; amount: string | number; currency: string; reference: string; description: string; dashboardPath?: string }) => (
  <PremiumLayout previewText="Your payment has been received successfully" title="Payment Confirmed">
    <Text style={text}>Hello {name || "there"},</Text>
    <Text style={text}>Your payment has been received successfully.</Text>
    
    <Section style={{ ...cardAlert, backgroundColor: "#ecfdf5", borderLeftColor: "#10b981" }}>
      <Text style={{ margin: 0, fontWeight: "700", color: "#065f46", fontSize: "16px" }}>Amount: {currency} {amount}</Text>
      <Text style={{ margin: "8px 0 0 0", color: "#065f46" }}>Reference: {reference}</Text>
      <Text style={{ margin: "8px 0 0 0", color: "#065f46" }}>{description}</Text>
    </Section>

    <Section style={btnContainer}>
      <Link href={`${APP_URL}${dashboardPath || "/dashboard"}`} style={{ ...btn, backgroundColor: "#10b981" }}>Open Dashboard</Link>
    </Section>
  </PremiumLayout>
);

export const JobAlertEmail = ({ seekerName, matchedJobs }: { seekerName: string; matchedJobs: any[] }) => (
  <PremiumLayout previewText={`${matchedJobs.length} new jobs match your alert`} title="New Job Matches">
    <Text style={text}>Hello {seekerName},</Text>
    <Text style={text}>We found <strong>{matchedJobs.length} new {matchedJobs.length === 1 ? 'job' : 'jobs'}</strong> that match your saved search alert.</Text>
    
    <Section style={{ margin: "24px 0" }}>
      {matchedJobs.map((job, i) => (
        <Section key={i} style={{ padding: "20px", marginBottom: "16px", border: "1px solid #e2e8f0", borderRadius: "16px", backgroundColor: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <Text style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: "18px", fontWeight: "700" }}>{job.title}</Text>
          <Text style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "14px" }}>
            {job.display_company_name || job.employer?.company_name || 'Unknown Company'} • {job.location || 'Remote'} • {job.type}
          </Text>
          <Link href={`${APP_URL}/jobs/${job.id}`} style={{ color: BRAND_COLOR, textDecoration: "none", fontWeight: "700", fontSize: "15px" }}>View Job &rarr;</Link>
        </Section>
      ))}
    </Section>
    
    <Section style={btnContainer}>
      <Link href={`${APP_URL}/jobs`} style={btn}>Search All Jobs</Link>
    </Section>
    
    <Text style={{ ...footerText, marginTop: "32px", fontStyle: "italic" }}>
      You are receiving this because you set up a Job Alert on Aganyu. You can manage your alerts from your dashboard.
    </Text>
  </PremiumLayout>
);

export const renderEmail = (Component: React.ReactElement) => {
    return render(Component);
};
