const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key] = val.trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    // Get employer user
    const { data: employer } = await supabase.from('users').select('*').eq('role', 'EMPLOYER').limit(1).single();
    if (!employer) return console.log("No employer found");
    
    // Create a client with employer's JWT (mock) - actually we can't easily generate a JWT here without auth.admin
    console.log("Employer ID:", employer.id);
}
test();
