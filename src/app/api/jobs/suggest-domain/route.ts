import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth-guard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { classifyQualification } from "@/lib/qualification-classifier";

export async function POST(request: Request) {
    const auth = await validateAuth(["EMPLOYER", "ADMIN"], false);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const { qualification, title } = body;

        if (!qualification && !title) {
            return NextResponse.json({ error: "Qualification or title is required" }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();
        const { data: domains } = await supabase.from('qualification_domains').select('id, name');
        const domainList = domains || [];
        const domainNames = domainList.map(d => d.name);

        const textToClassify = qualification || title;
        const domainName = await classifyQualification(textToClassify, domainNames);
        const matchedDomain = domainList.find(d => d.name.toLowerCase() === domainName.toLowerCase());

        return NextResponse.json({
            domain: matchedDomain ? matchedDomain.name : null,
            domain_id: matchedDomain ? matchedDomain.id : null,
            confidence: matchedDomain ? 0.95 : 0.40,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to suggest domain" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
