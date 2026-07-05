const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key] = val.trim();
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data, error } = await supabase.rpc('match_candidates', { query_embedding: '[0]', match_threshold: 0, match_count: 1 });
    console.log("RPC Check:", error || data);
}
test();
