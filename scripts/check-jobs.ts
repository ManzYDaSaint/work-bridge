import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    envFile.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) return;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!(key in process.env)) process.env[key] = value;
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJobs() {
    const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status")
        .limit(20);

    if (error) {
        console.error("Error fetching jobs:", error);
        return;
    }

    console.log("Jobs in database:");
    data.forEach((job) => {
        console.log(`- ID: ${job.id}, Title: ${job.title}, Status: [${job.status}]`);
    });

    const statuses = [...new Set(data.map((j) => j.status))];
    console.log("\nUnique statuses found:", statuses);
}

checkJobs();
