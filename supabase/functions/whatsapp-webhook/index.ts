import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function verifySignature(req: Request, rawBody: string) {
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const hmac = createHmac("sha256", Deno.env.get("WHATSAPP_APP_SECRET")!);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;
  
  return signature === expectedSignature;
}

serve(async (req) => {
  const url = new URL(req.url);
  const method = req.method;

  if (method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (method === "POST") {
    const rawBody = await req.text();
    
    if (!(await verifySignature(req, rawBody))) {
      return new Response("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    
    // Queue event in automation_tasks for processing
    await supabase.from("automation_tasks").insert({
        plugin_id: "whatsapp-manager",
        payload: { event: body, type: "WHATSAPP_WEBHOOK" },
        status: "PENDING"
    });
    
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
});
