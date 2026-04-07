import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_NAME = "RayVo";
const SENDER_DOMAIN = "notify.hivepayadmin.com";
const FROM_DOMAIN = "notify.hivepayadmin.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user via their JWT
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, inviteId, companyId } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up company name
    let companyName = SITE_NAME;
    if (companyId) {
      const { data: company } = await userSupabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      if (company?.name) companyName = company.name;
    }

    // Build HTML inline (avoids needing React Email + JSX in this function)
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 20px;">Team Invitation</h1>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 16px;">
          You've been invited to join <strong>${companyName}</strong> as a <strong>${role}</strong>.
        </p>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 16px;">
          Sign up or log in to accept the invitation.
        </p>
        <hr style="border-color: #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; margin-top: 30px;">Sent via ${SITE_NAME}</p>
      </div>
    `;

    const messageId = crypto.randomUUID();
    const idempotencyKey = `team-invite-${inviteId || email}-${Date.now()}`;

    // Use service role to enqueue directly
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Log pending
    await adminSupabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "team-invite",
      recipient_email: email,
      status: "pending",
    });

    // Enqueue via RPC
    const { error: enqueueError } = await adminSupabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: `${companyName} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `You've been invited to join ${companyName} on ${SITE_NAME}`,
        html,
        text: `You've been invited to join ${companyName} as a ${role}. Sign up or log in to accept.`,
        purpose: "transactional",
        label: "team-invite",
        idempotency_key: idempotencyKey,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Enqueue error:", enqueueError);
      return new Response(JSON.stringify({ error: "Failed to send invite email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
