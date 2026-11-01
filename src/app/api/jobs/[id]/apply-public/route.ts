import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { evaluateCandidateMatch } from "@/lib/candidate-match";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sendNewApplicationEmail } from "@/lib/resend";
import { NotificationService } from "@/services/notification.service";
import { classifyDomainForRecord } from "@/lib/agents/domain-classifier-agent";

export const dynamic = "force-dynamic";

/**
 * Intelligent lightweight CV text parser helper.
 * Extracts contact info, summary, skills, education, and qualification.
 */
function parseCVText(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    let phone = "";
    let bio = "";
    let qualification = "";
    const skills: string[] = [];

    // Extract Phone Number (Malawi & International formats)
    const phoneRegex = /(?:\+?265|0)[189]\d{8}|\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        phone = phoneMatch[0].trim();
    }

    const commonSkillsDict = [
        "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "C++", "C#",
        "HTML", "CSS", "Tailwind CSS", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Git", "GitHub",
        "Project Management", "Data Analysis", "Graphic Design", "UI/UX Design", "Digital Marketing",
        "SEO", "Accounting", "Financial Modeling", "Public Relations", "Communication", "Customer Service",
        "Leadership", "Sales", "Microsoft Excel", "Microsoft Office", "Word", "PowerPoint",
        "Agile", "Scrum", "DevOps", "Docker", "Kubernetes", "AWS", "Google Cloud", "REST API",
        "Auditing", "Human Resources", "Supply Chain", "Logistics", "Teaching", "Research",
        "Budgeting", "QuickBooks", "Customer Support", "Content Writing", "Copywriting"
    ];

    const lowerText = text.toLowerCase();
    commonSkillsDict.forEach(skill => {
        if (lowerText.includes(skill.toLowerCase()) && !skills.includes(skill)) {
            skills.push(skill);
        }
    });

    if (lowerText.includes("phd") || lowerText.includes("doctorate")) {
        qualification = "Doctorate / PhD";
    } else if (lowerText.includes("master") || lowerText.includes("msc") || lowerText.includes("mba") || lowerText.includes("ma ")) {
        qualification = "Master's Degree";
    } else if (lowerText.includes("bachelor") || lowerText.includes("bsc") || lowerText.includes("ba ") || lowerText.includes("degree")) {
        qualification = "Bachelor's Degree";
    } else if (lowerText.includes("diploma")) {
        qualification = "Diploma";
    } else if (lowerText.includes("certificate") || lowerText.includes("certification")) {
        qualification = "Professional Certificate";
    } else if (lowerText.includes("msce") || lowerText.includes("secondary")) {
        qualification = "Malawi School Certificate of Education (MSCE)";
    }

    const summaryMatch = text.match(/(?:summary|about|profile|objective)[\s:]*([\s\S]*?)(?=\n\n|\n[A-Z\s]{4,}:|$)/i);
    if (summaryMatch && summaryMatch[1]) {
        bio = summaryMatch[1].trim().slice(0, 500);
    } else if (lines.length > 3) {
        const candidateParagraph = lines.slice(1, 6).find(l => l.length > 60 && !l.includes("@"));
        if (candidateParagraph) bio = candidateParagraph.slice(0, 500);
    }

    return { phone, bio, qualification, skills };
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: jobId } = await params;
    const adminSupabase = getSupabaseAdminClient();
    if (!adminSupabase) {
        return NextResponse.json({ error: "System service temporarily unavailable" }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const fullName = formData.get("fullName")?.toString()?.trim();
        const email = formData.get("email")?.toString()?.trim()?.toLowerCase();
        const phone = formData.get("phone")?.toString()?.trim();
        const resumeFile = formData.get("resume") as File | null;
        const screeningAnswersRaw = formData.get("screeningAnswers")?.toString();

        let screeningAnswers: Record<string, any> = {};
        if (screeningAnswersRaw) {
            try {
                screeningAnswers = JSON.parse(screeningAnswersRaw);
            } catch {
                screeningAnswers = {};
            }
        }

        if (!fullName || !email) {
            return NextResponse.json({ error: "Full Name and Email Address are required." }, { status: 400 });
        }

        // Verify Job exists and is ACTIVE
        const { data: job, error: jobErr } = await adminSupabase
            .from("jobs")
            .select("id, title, employer_id, status, deadline, skills, must_have_skills, nice_to_have_skills, minimum_years_experience, qualification, screening_questions, domain_id")
            .eq("id", jobId)
            .single();

        if (jobErr || !job) {
            return NextResponse.json({ error: "Job opening not found." }, { status: 404 });
        }

        if (job.status !== "ACTIVE") {
            return NextResponse.json({ error: "This position is no longer accepting applications." }, { status: 400 });
        }

        if (job.deadline && new Date(job.deadline) < new Date()) {
            return NextResponse.json({ error: "The application deadline for this role has passed." }, { status: 400 });
        }

        // Validate required screening questions
        const requiredQuestions = ((job.screening_questions as any[]) || []).filter((q) => q.required);
        const missingQuestion = requiredQuestions.find(q => !screeningAnswers[q.id]);
        if (missingQuestion) {
            return NextResponse.json({ error: `Please answer required question: ${missingQuestion.question}` }, { status: 400 });
        }

        // Check if candidate already applied with this email
        const { data: existingApp } = await adminSupabase
            .from("applications")
            .select("id")
            .eq("job_id", jobId)
            .ilike("guest_email", email)
            .maybeSingle();

        if (existingApp) {
            return NextResponse.json({ error: "An application with this email has already been received for this position." }, { status: 409 });
        }

        // Handle Resume Upload & Extraction
        let resumeUrl: string | null = null;
        let parsedCV = { phone: "", bio: "", qualification: "", skills: [] as string[] };

        if (resumeFile && resumeFile.size > 0) {
            if (resumeFile.size > 10 * 1024 * 1024) {
                return NextResponse.json({ error: "Resume file size must be under 10MB." }, { status: 400 });
            }

            const cleanFileName = resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const storagePath = `guest/${jobId}/${Date.now()}_${cleanFileName}`;

            const { error: uploadError } = await adminSupabase.storage
                .from("resumes")
                .upload(storagePath, resumeFile, {
                    contentType: resumeFile.type || "application/pdf",
                    upsert: true,
                });

            if (!uploadError) {
                const { data: publicUrlData } = adminSupabase.storage
                    .from("resumes")
                    .getPublicUrl(storagePath);
                resumeUrl = publicUrlData?.publicUrl || null;
            }

            // Attempt to parse text if text-like or extract from name/summary
            try {
                const buffer = await resumeFile.arrayBuffer();
                const textContent = Buffer.from(buffer).toString("utf-8");
                if (textContent && textContent.length > 50) {
                    parsedCV = parseCVText(textContent);
                }
            } catch {
                // If binary PDF parsing directly from string fails, gracefully retain empty structure
            }
        }

        const effectiveQualification = parsedCV.qualification || null;
        const effectiveSkills = parsedCV.skills;
        const effectivePhone = phone || parsedCV.phone || null;

        // Structured screening evaluation
        const screeningResult = evaluateCandidateMatch(
            {
                skills: effectiveSkills,
                experience: [],
                qualification: effectiveQualification,
            },
            job,
            screeningAnswers
        );

        // Find or create registered user if email already exists
        let userId: string | null = null;
        const { data: existingUser } = await adminSupabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existingUser) {
            userId = existingUser.id;
        }

        // Insert Guest Application Record
        const { data: application, error: insertErr } = await adminSupabase
            .from("applications")
            .insert({
                job_id: jobId,
                user_id: userId,
                is_guest_application: true,
                guest_full_name: fullName,
                guest_email: email,
                guest_phone: effectivePhone,
                resume_url: resumeUrl,
                status: "PENDING",
                screening_answers: screeningAnswers,
                screening_score: screeningResult.score,
                screening_summary: screeningResult.summary,
                screening_breakdown: screeningResult.breakdown,
                meets_required_criteria: screeningResult.meetsRequiredCriteria,
                match_score: screeningResult.score / 100,
            })
            .select()
            .single();

        if (insertErr) {
            console.error("[apply-public] Insert error:", insertErr);
            return NextResponse.json({ error: "Failed to record application." }, { status: 500 });
        }

        // Fire domain classification if qualification was extracted
        if (effectiveQualification) {
            classifyDomainForRecord({
                target: "JOB", // Using general domain matching against raw text
                recordId: jobId,
                qualification: effectiveQualification,
                title: job.title,
                currentDomainId: null
            }).catch((err) => console.error("[apply-public] Domain classifier error:", err));
        }

        // Notify Employer
        const { data: employerUser } = await adminSupabase
            .from("users")
            .select("email, employers(company_name)")
            .eq("id", job.employer_id)
            .maybeSingle();

        if (employerUser?.email) {
            try {
                await Promise.all([
                    sendNewApplicationEmail(employerUser.email, {
                        employerName: (employerUser.employers as any)?.company_name || "Employer",
                        jobTitle: job.title,
                        candidateName: `${fullName} (Public Application)`,
                    }),
                    NotificationService.createNotification({
                        userId: job.employer_id,
                        title: "New Public Candidate Application",
                        message: `${fullName} applied for ${job.title} via the direct application page.`,
                        type: "NEW_APPLICATION",
                        link: `/dashboard/employer/candidates`
                    })
                ]);
            } catch (notifyErr) {
                console.error("[apply-public] Employer notification error:", notifyErr);
            }
        }

        revalidatePath("/dashboard/employer/candidates");

        // Generate magic link / claim profile URL
        let claimUrl: string | null = null;
        try {
            const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback?next=/dashboard/seeker/profile`;
            const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
                type: "magiclink",
                email: email,
                options: {
                    redirectTo: redirectUrl,
                }
            });
            if (!linkErr && linkData?.properties?.action_link) {
                claimUrl = linkData.properties.action_link;
            }
        } catch (linkGenErr) {
            console.error("[apply-public] Magic link generation skipped/failed:", linkGenErr);
        }

        return NextResponse.json({
            success: true,
            message: "Your application has been submitted successfully to the employer.",
            applicationId: application.id,
            claimUrl: claimUrl
        });

    } catch (err: any) {
        console.error("[apply-public] Unexpected error:", err);
        return NextResponse.json({ error: err.message || "An unexpected error occurred while submitting." }, { status: 500 });
    }
}
