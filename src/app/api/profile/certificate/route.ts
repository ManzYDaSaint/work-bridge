import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
const MAX_CERTS = 5;

// ── Qualification detection ────────────────────────────────────────────────────
const QUALIFICATION_PATTERNS: { regex: RegExp }[] = [
    { regex: /\b(doctor\s*of|ph\.?\s*d\.?|doctorate)\b/i },
    { regex: /\b(master\s*of|m\.?\s*sc\.?|m\.?\s*a\.?|m\.?\s*eng\.?|honours)\b/i },
    { regex: /\b(bachelor\s*of|b\.?\s*sc\.?|b\.?\s*a\.?|b\.?\s*com\.?|b\.?\s*eng\.?|b\.?\s*tech\.?|undergraduate)\b/i },
    { regex: /\b(higher\s*diploma|national\s*diploma|diploma\s*(in|of))\b/i },
    { regex: /\b(certificate\s*(in|of)|advanced\s*certificate|national\s*certificate)\b/i },
];

function extractQualification(text: string): string | null {
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    for (const { regex } of QUALIFICATION_PATTERNS) {
        for (const line of lines) {
            if (regex.test(line) && line.length < 120) {
                return line.replace(/^[^a-zA-Z]+/, "").replace(/[^a-zA-Z0-9\s(),]+$/, "").trim();
            }
        }
    }
    return null;
}

const NAME_TRIGGERS = [
    /this\s+is\s+to\s+certify\s+that/i,
    /awarded\s+to/i,
    /presented\s+to/i,
    /conferred\s+upon/i,
    /hereby\s+certif/i,
    /granted\s+to/i,
];

function extractCertName(text: string): string | null {
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        for (const trigger of NAME_TRIGGERS) {
            if (trigger.test(lines[i])) {
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    const candidate = lines[j].replace(/[^a-zA-Z\s''-]/g, "").trim();
                    if (/^([A-Z][a-zA-Z'-]+\s+){1,4}[A-Z][a-zA-Z'-]+$/.test(candidate)) {
                        return candidate;
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Fuzzy name match: checks that all significant tokens of the seeker's registered
 * full name appear somewhere in the certificate name (case-insensitive).
 * This handles middle-name omissions, initials, ordering differences.
 */
function verifyName(seekerFullName: string, certName: string): boolean {
    if (!certName) return false;
    const normalize = (s: string) =>
        s.toLowerCase()
            .replace(/[^a-z\s]/g, "")
            .split(/\s+/)
            .filter(t => t.length > 1); // ignore single-char initials

    const seekerTokens = normalize(seekerFullName);
    const certTokens = normalize(certName);

    // Every seeker name token must appear in the cert name tokens
    return seekerTokens.every(t => certTokens.includes(t));
}

// ── GET — list all certificates for this seeker ────────────────────────────────
export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const certs = (data || []).map(c => ({
        id: c.id,
        seekerId: c.seeker_id,
        url: c.url,
        fileName: c.file_name,
        parsedQualification: c.parsed_qualification,
        parsedCertName: c.parsed_cert_name,
        isNameVerified: c.is_name_verified,
        createdAt: c.created_at,
    }));

    return NextResponse.json(certs);
}

// ── POST — upload a new certificate ───────────────────────────────────────────
export async function POST(request: Request) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // 1. Check current count
        const { count } = await supabase
            .from("certificates")
            .select("id", { count: "exact", head: true })
            .eq("seeker_id", user.id);

        if ((count ?? 0) >= MAX_CERTS) {
            return NextResponse.json(
                { error: `You can upload a maximum of ${MAX_CERTS} certificates.` },
                { status: 400 }
            );
        }

        // 2. Get file from form data
        const formData = await request.formData();
        const file = formData.get("certificate") as File | null;
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        // 3. Upload to storage
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/cert_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(filePath, fileBuffer, { upsert: false, contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("resumes").getPublicUrl(filePath);
        const certUrl = publicUrlData.publicUrl;

        // 4. Parse the PDF
        let parsedQualification: string | null = null;
        let parsedCertName: string | null = null;
        let isNameVerified = false;

        try {
            // pdf-parse is CommonJS — use require
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse = require("pdf-parse");
            const parsed = await pdfParse(fileBuffer);
            parsedQualification = extractQualification(parsed.text);
            parsedCertName = extractCertName(parsed.text);
        } catch {
            // Non-fatal — scanned/image PDFs have no text layer
        }

        // 5. Name verification — get seeker's registered full name
        if (parsedCertName) {
            const { data: seekerData } = await supabase
                .from("job_seekers")
                .select("full_name")
                .eq("id", user.id)
                .single();

            if (seekerData?.full_name) {
                isNameVerified = verifyName(seekerData.full_name, parsedCertName);
            }
        }

        // 6. Insert into certificates table
        const { data: certRecord, error: insertError } = await supabase
            .from("certificates")
            .insert({
                seeker_id: user.id,
                url: certUrl,
                file_name: file.name,
                parsed_qualification: parsedQualification,
                parsed_cert_name: parsedCertName,
                is_name_verified: isNameVerified,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            certificate: {
                id: certRecord.id,
                seekerId: certRecord.seeker_id,
                url: certRecord.url,
                fileName: certRecord.file_name,
                parsedQualification: certRecord.parsed_qualification,
                parsedCertName: certRecord.parsed_cert_name,
                isNameVerified: certRecord.is_name_verified,
                createdAt: certRecord.created_at,
            },
        });
    } catch (error: any) {
        console.error("Certificate upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}
