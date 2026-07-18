import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data, error } = await supabase.from("product_events").select("*").limit(1);
    console.log("product_events:", error ? error.message : data);
    
    const { data: cols, error: colsErr } = await supabase.rpc('get_columns', { table_name: 'product_events' }).catch(() => ({ data: null, error: null }));
    if (!colsErr && cols) console.log(cols);
}
check();
