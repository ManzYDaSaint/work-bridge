const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key] = val.trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data, count, error } = await supabase
        .from("job_seekers")
        .select("id, full_name, users!inner(role)", { count: "exact" })
        .eq("users.role", "JOB_SEEKER")
        .limit(3);
    console.log("Count:", count);
    console.log("Data:", data?.length);
    console.log("Error:", error);
}
test();
