import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("--- Starting Audit Trigger Verification ---");

    // 1. Create a test job
    console.log("Step 1: Creating a test job...");
    const testJob = {
        title: "Test Audit Job " + Date.now(),
        location: "Remote",
        type: "FULL_TIME",
        employer_id: 'd83c483d-3d2b-4e4b-9e4b-4b2e4b2e4b2e' // Assuming this exists or using a valid fallback
    };

    // Note: For this to work with real triggers, we need a valid employer_id. 
    // In a real env, we'd fetch or create one.

    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert(testJob)
        .select()
        .single();

    if (jobError) {
        console.error("Failed to create job:", jobError.message);
        return;
    }
    console.log("Job created:", job.id);

    // 2. Wait for trigger to fire and check audit_logs
    console.log("Step 2: Checking audit_logs for INSERT...");
    await new Promise(r => setTimeout(r, 2000));

    const { data: logs, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'jobs_INSERT')
        .order('created_at', { ascending: false })
        .limit(1);

    if (logError || !logs.length) {
        console.error("Audit log not found for INSERT:", logError?.message || "Empty results");
    } else {
        console.log("Audit log found for INSERT!");
        console.log("Metadata:", JSON.stringify(logs[0].metadata, null, 2));
    }

    // 3. Clean up
    console.log("Cleanup: Deleting test job...");
    await supabase.from('jobs').delete().eq('id', job.id);

    console.log("--- Verification Complete ---");
}

runTest();
