const fs = require('fs');
const https = require('https');

// 1. Load env from .env.local manually
let config = {};
try {
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) config[key.trim()] = value.trim();
    });
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = config.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
}

// Simple Helper for Supabase HTTPS Requests
function supabaseRequest(path, method, body = null) {
    const url = new URL(`${supabaseUrl}/rest/v1/${path}`);
    const options = {
        method,
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : null;
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTest() {
    console.log("--- Starting Zero-Dep Audit Verification ---");

    // 1. Create a temporary employer
    const employerName = "Audit Test Corp " + Date.now();
    console.log(`Step 1: Creating employer "${employerName}"...`);

    // Note: We need a valid user_id for the employer table due to FK
    const { data: users } = await supabaseRequest('users?select=id&limit=1', 'GET');
    if (!users || users.length === 0) {
        console.error("No users found in database to link the employer to.");
        return;
    }
    const userId = users[0].id;

    // We'll upsert into employers for this user
    const { data: employer, status: empStatus } = await supabaseRequest('employers', 'POST', {
        id: userId,
        company_name: employerName,
        industry: "Tech",
        location: "Audit Zone",
        status: "APPROVED"
    });

    console.log(`Employer created/updated. Status: ${empStatus}`);

    // 2. Create a test job
    const jobTitle = "Verification Job " + Date.now();
    console.log(`Step 2: Creating job "${jobTitle}"...`);
    const { data: job, status: jobStatus } = await supabaseRequest('jobs', 'POST', {
        title: jobTitle,
        location: "Audit Zone",
        type: "FULL_TIME",
        employer_id: userId
    });

    if (jobStatus >= 300 || !job) {
        console.error("Failed to create job:", jobStatus, job);
        return;
    }
    const jobId = job[0].id;
    console.log(`Job created: ${jobId}`);

    // 3. Poll for Audit Log
    console.log("Step 3: Polling for Audit Log...");
    let success = false;
    for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const { data: logs } = await supabaseRequest('audit_logs?select=*&action=eq.jobs_INSERT&order=created_at.desc&limit=1', 'GET');

        if (logs && logs.length > 0 && logs[0].metadata?.new?.title === jobTitle) {
            console.log("MATCH FOUND: Audit trigger verified successfully!");
            console.log(`Log ID: ${logs[0].id}`);
            console.log(`Action: ${logs[0].action}`);
            console.log(`Metadata: ${JSON.stringify(logs[0].metadata, null, 2)}`);
            success = true;
            break;
        }
        console.log("Still looking...");
    }

    if (!success) console.error("FAILED: Audit log not found.");

    // 4. Cleanup
    console.log("Step 4: Cleanup...");
    await supabaseRequest(`jobs?id=eq.${jobId}`, 'DELETE');
    console.log("Test job removed.");

    console.log("--- Verification Complete ---");
}

runTest().catch(console.error);
