const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key] = val.trim();
    return acc;
}, {});

// Corrected the environment variable name to match .env.local
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_SUPABASE_SERVICE_ROLE_KEY);

async function querySources() {
    const { data, error } = await supabase.from('job_ingestion_sources').select('id, name, selector_config');
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

querySources();
