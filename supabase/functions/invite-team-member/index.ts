import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { prepareTransactionalRecipient } from "../_shared/prepare-transactional-recipient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_NAME = "RayVo";
const SENDER_DOMAIN = "notify.hivepayadmin.com";
const FROM_DOMAIN = "notify.hivepayadmin.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

    // Validate user via their JWT using getClaims
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userSupabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub, email: claimsData.claims.email };

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

    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://rayvo.lovable.app";
    const inviteUrl = new URL("/auth", siteUrl);
    inviteUrl.searchParams.set("mode", "signup");
    inviteUrl.searchParams.set("email", email);
    if (inviteId) inviteUrl.searchParams.set("invite", inviteId);
    if (companyId) inviteUrl.searchParams.set("company", companyId);

    const safeCompanyName = escapeHtml(companyName);
    const safeRole = escapeHtml(role || "staff");
    const inviteUrlString = inviteUrl.toString();
    const safeInviteUrl = escapeHtml(inviteUrlString);

    // Build HTML inline (avoids needing React Email + JSX in this function)
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 20px;">Team Invitation</h1>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 16px;">
          You've been invited to join <strong>${safeCompanyName}</strong> as a <strong>${safeRole}</strong>.
        </p>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 16px;">
          Create your account to join the company and go straight into the app.
        </p>
        <a href="${safeInviteUrl}" style="display: inline-block; margin: 8px 0 0; padding: 12px 20px; border-radius: 10px; background: #111827; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">Accept invitation</a>
        <p style="font-size: 13px; color: #666; line-height: 1.6; margin: 16px 0 0;">
          Or open this link in your browser:<br />
          <a href="${safeInviteUrl}" style="color: #111827; word-break: break-all;">${safeInviteUrl}</a>
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

    const preparation = await prepareTransactionalRecipient(adminSupabase, email);
    if (preparation.error) {
      await adminSupabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "team-invite",
        recipient_email: email,
        status: "failed",
        error_message: preparation.error,
      });

      return new Response(JSON.stringify({ error: "Failed to prepare invite email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (preparation.suppressed || !preparation.unsubscribeToken) {
      await adminSupabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "team-invite",
        recipient_email: email,
        status: "suppressed",
      });

      return new Response(JSON.stringify({ success: false, reason: "email_suppressed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        text: `You've been invited to join ${companyName} as a ${role}. Accept your invitation here: ${inviteUrlString}`,
        purpose: "transactional",
        label: "team-invite",
        idempotency_key: idempotencyKey,
        unsubscribe_token: preparation.unsubscribeToken,
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
