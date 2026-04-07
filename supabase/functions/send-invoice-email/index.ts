import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, invoiceNumber, clientName, amount, currency, dueDate, publicUrl, companyName } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No email addresses provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Send to each recipient via the transactional email system
    const errors: string[] = [];
    for (const email of emails) {
      const { error } = await serviceSupabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-email",
          recipientEmail: email,
          idempotencyKey: `invoice-${invoiceNumber}-${email}`,
          templateData: {
            invoiceNumber,
            clientName,
            amount,
            currency,
            dueDate,
            publicUrl,
            companyName: companyName || "RayVo",
          },
        },
      });
      if (error) {
        console.error(`Failed to send to ${email}:`, error);
        errors.push(email);
      }
    }

    if (errors.length === emails.length) {
      return new Response(JSON.stringify({ error: "Failed to send all emails" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, failedRecipients: errors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
