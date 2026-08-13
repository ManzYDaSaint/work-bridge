
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function listSources() {
  const { data, error } = await supabase
    .from('job_ingestion_sources')
    .select('*');

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Sources found:", JSON.stringify(data, null, 2));
  }
}

listSources();
