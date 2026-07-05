const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key] = val.trim();
    return acc;
}, {});
const { Client } = require('pg');
const client = new Client({ connectionString: env.DATABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgresql://postgres:').replace('.supabase.co', ':5432/postgres') });
async function test() {
    // If DATABASE_URL is there, this will work. If not, it won't. Let's just try.
    if (!env.DATABASE_URL) return console.log("No DATABASE_URL");
    await client.connect();
    const res = await client.query(`
        SELECT pg_get_functiondef(p.oid)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'match_candidates';
    `);
    console.log(res.rows[0]?.pg_get_functiondef);
    await client.end();
}
test();
