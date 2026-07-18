const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2];
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: cols, error: err } = await supabase.from('product_events').select('*').limit(1);
    console.log("product_events:", err ? err.message : "Exists!");
    
    if (err) {
        // Let's check if we can insert into product_events
        console.log("Probably doesn't exist");
    } else {
        console.log("Columns:", Object.keys(cols[0] || {}));
    }
}
check();
