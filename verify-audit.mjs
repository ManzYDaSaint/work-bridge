import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load env from .env.local
try {
    const envContent = readFileSync('.env.local', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
} catch (e) {
    console.warn("Could not read .env.local via fs, relying on process.env");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("--- Starting Audit Trigger Verification ---");

    // 1. Create a test job
    // Note: We'll use a known table and try to insert. 
    // If RLS blocks us, we might need the service_role key.

    const testJobTitle = "Audit Test " + Date.now();
    console.log(`Step 1: Creating test job "${testJobTitle}"...`);

    // Attempt to find a valid employer first to avoid FK constraint errors
    const { data: employer } = await supabase.from('employers').select('id').limit(1).single();

    if (!employer) {
        console.error("No valid employer found to link the job to.");
        return;
    }

    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
            title: testJobTitle,
            location: "Verification Lab",
            type: "FULL_TIME",
            employer_id: employer.id
        })
        .select()
        .single();

    if (jobError) {
        console.error("Failed to create job:", jobError.message);
        return;
    }
    console.log("Job created with ID:", job.id);

    // 2. Wait for trigger
    console.log("Step 2: Polling audit_logs for automated entry...");
    let found = false;
    for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const { data: logs } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('action', 'jobs_INSERT')
            .order('created_at', { ascending: false })
            .limit(1);

        if (logs && logs.length > 0 && logs[0].metadata?.new?.title === testJobTitle) {
            console.log("SUCCESS: Audit log found!");
            console.log("Audit Action:", logs[0].action);
            console.log("Metadata Snapshot:", JSON.stringify(logs[0].metadata, null, 2));
            found = true;
            break;
        }
        console.log("Retrying poll...");
    }

    if (!found) {
        console.error("FAILURE: No audit log found after 5 seconds.");
    }

    // 3. Cleanup
    console.log("Step 3: Cleaning up...");
    await supabase.from('jobs').delete().eq('id', job.id);
    console.log("Test job deleted.");

    console.log("--- Verification Finished ---");
}

runTest();
