import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TALLY-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const payload = await req.json();
    logStep("Payload", payload);

    // TODO: Implement Tally webhook processing
    // 1. Extract the respondent's email from the Tally submission payload
    // 2. Match the email to an attendee record
    // 3. Update the attendee: form_status = 'completed', tally_form_completed_at = now()
    //
    // Tally webhook payload format (to be configured when Tally form is set up):
    // {
    //   "eventId": "...",
    //   "eventType": "FORM_RESPONSE",
    //   "createdAt": "...",
    //   "data": {
    //     "responseId": "...",
    //     "fields": [
    //       { "key": "question_xxx", "label": "Email", "type": "INPUT_EMAIL", "value": "..." },
    //       ...
    //     ]
    //   }
    // }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook received (stub)" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
