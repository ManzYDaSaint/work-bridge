const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) acc[key.trim()] = value.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or NEXT_SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTask() {
  const queueItemId = 'a13dcb23-67b1-4548-959f-27a6bd6a6c27';
  
  const { data, error } = await supabase
    .from('automation_tasks')
    .select('*')
    .filter('payload->>queueItemId', 'eq', queueItemId);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Tasks found:", JSON.stringify(data, null, 2));
  }
}

checkTask();
