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

    const { email, role, inviteId, companyId } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let companyName = SITE_NAME;
    if (companyId) {
      const { data: company } = await userSupabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      if (company?.name) companyName = company.name;
    }

    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "https://rayvo.lovable.app";
    const inviteUrl = new URL("/auth", siteUrl);
    inviteUrl.searchParams.set("mode", "signup");
    inviteUrl.searchParams.set("email", email);
    if (inviteId) inviteUrl.searchParams.set("invite", inviteId);
    if (companyId) inviteUrl.searchParams.set("company", companyId);

    const safeCompanyName = escapeHtml(companyName);
    const safeRole = escapeHtml(role || "staff");
    const inviteUrlString = inviteUrl.toString();
    const safeInviteUrl = escapeHtml(inviteUrlString);

    const html = `
      <div style="background:#ffffff;margin:0;padding:32px 0;font-family:'Inter',Arial,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:0 16px;">
          <div style="background:#f7fbfc;border:1px solid #d8e7eb;border-radius:24px;padding:36px 32px;">
            <p style="margin:0 0 12px;color:hsl(192,75%,36%);font-size:12px;font-weight:700;letter-spacing:0.2em;">RAYVO</p>
            <h1 style="margin:0 0 12px;color:hsl(200,30%,8%);font-size:32px;line-height:1.15;font-weight:700;">You’ve been invited to the team</h1>
            <p style="margin:0 0 24px;color:hsl(200,15%,35%);font-size:15px;line-height:1.7;">Join <strong>${safeCompanyName}</strong> on RayVo as a <strong>${safeRole}</strong> and start collaborating right away.</p>

            <div style="background:#ffffff;border:1px solid #d8e7eb;border-radius:20px;padding:24px;margin:0 0 24px;">
              <p style="margin:0 0 8px;color:hsl(200,15%,35%);font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Your role</p>
              <p style="margin:0 0 8px;color:hsl(200,30%,8%);font-size:28px;font-weight:700;text-transform:capitalize;">${safeRole}</p>
              <p style="margin:0;color:hsl(200,15%,35%);font-size:14px;">Workspace: ${safeCompanyName}</p>
            </div>

            <div style="text-align:center;margin:0 0 18px;">
              <a href="${safeInviteUrl}" style="display:inline-block;background:hsl(192,75%,36%);color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Accept invitation</a>
            </div>

            <p style="margin:0 0 12px;color:hsl(200,15%,35%);font-size:14px;line-height:1.6;">This link will take you straight to sign up and join the workspace.</p>
            <p style="margin:0;color:hsl(200,15%,35%);font-size:13px;line-height:1.7;">If the button does not work, open this link in your browser:<br /><a href="${safeInviteUrl}" style="color:hsl(192,75%,36%);word-break:break-all;">${safeInviteUrl}</a></p>

            <hr style="border-color:#d8e7eb;margin:24px 0 16px;" />
            <p style="margin:0;color:hsl(200,15%,35%);font-size:12px;text-align:center;">Professional invoicing made simple.</p>
          </div>
        </div>
      </div>
    `;

    const messageId = crypto.randomUUID();
    const idempotencyKey = `team-invite-${inviteId || email}-${Date.now()}`;

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

    await adminSupabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "team-invite",
      recipient_email: email,
      status: "pending",
    });

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
