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

function buildQuoteHtml(
  quoteNumber: string,
  clientName: string,
  amount: string,
  currency: string,
  validUntil: string,
  publicUrl: string,
  acceptUrl: string,
  rejectUrl: string,
  companyName: string,
) {
  const sQuote = escapeHtml(quoteNumber);
  const sClient = escapeHtml(clientName);
  const sAmount = escapeHtml(amount);
  const sCurrency = escapeHtml(currency);
  const sValid = escapeHtml(validUntil || "—");
  const sPublic = escapeHtml(publicUrl);
  const sAccept = escapeHtml(acceptUrl);
  const sReject = escapeHtml(rejectUrl);
  const sCompany = escapeHtml(companyName);

  return `
    <div style="background:#ffffff;margin:0;padding:32px 0;font-family:'Inter',Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;padding:0 16px;">
        <div style="background:#f7fbfc;border:1px solid #d8e7eb;border-radius:24px;padding:36px 32px;">
          <p style="margin:0 0 12px;color:hsl(192,75%,36%);font-size:12px;font-weight:700;letter-spacing:0.2em;">RAYVO</p>
          <h1 style="margin:0 0 12px;color:hsl(200,30%,8%);font-size:32px;line-height:1.15;font-weight:700;">You've received a quote</h1>
          <p style="margin:0 0 24px;color:hsl(200,15%,35%);font-size:15px;line-height:1.7;">Hi ${sClient}, ${sCompany} has sent you quote <strong>${sQuote}</strong> for review.</p>

          <div style="background:#ffffff;border:1px solid #d8e7eb;border-radius:20px;padding:24px;margin:0 0 18px;">
            <p style="margin:0 0 8px;color:hsl(200,15%,35%);font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Quote total</p>
            <p style="margin:0 0 8px;color:hsl(200,30%,8%);font-size:34px;line-height:1.1;font-weight:700;">${sCurrency} ${sAmount}</p>
            <p style="margin:0;color:hsl(200,15%,35%);font-size:14px;">Valid until: ${sValid}</p>
          </div>

          <div style="text-align:center;margin:28px 0 18px;">
            <a href="${sPublic}" style="display:inline-block;background:hsl(192,75%,36%);color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Review quote</a>
          </div>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 4px;">
            <tr>
              <td style="padding:0 6px 0 0;width:50%;">
                <a href="${sAccept}" style="display:block;background:#16a34a;color:#ffffff;padding:14px 18px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;text-align:center;">✓ Accept Quote</a>
              </td>
              <td style="padding:0 0 0 6px;width:50%;">
                <a href="${sReject}" style="display:block;background:#dc2626;color:#ffffff;padding:14px 18px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;text-align:center;">✗ Reject Quote</a>
              </td>
            </tr>
          </table>
          <p style="margin:14px 0 0;color:hsl(200,15%,35%);font-size:12px;text-align:center;">Once accepted, this quote will automatically be converted into an invoice.</p>

          <hr style="border-color:#d8e7eb;margin:24px 0 16px;" />
          <p style="margin:0;color:hsl(200,15%,35%);font-size:12px;text-align:center;">Professional invoicing made simple.</p>
        </div>
      </div>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { emails, quoteNumber, clientName, amount, currency, validUntil, publicUrl, companyName } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No email addresses provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = companyName || SITE_NAME;
    const acceptUrl = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}action=accept`;
    const rejectUrl = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}action=reject`;

    const html = buildQuoteHtml(quoteNumber, clientName, amount, currency, validUntil, publicUrl, acceptUrl, rejectUrl, name);
    const subject = `Quote ${quoteNumber} from ${name} — ${currency} ${amount}`;
    const textContent = `Quote ${quoteNumber} from ${name} for ${currency} ${amount}. Valid until: ${validUntil}. Review: ${publicUrl}`;

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const errors: string[] = [];
    for (const email of emails) {
      const messageId = crypto.randomUUID();
      const preparation = await prepareTransactionalRecipient(adminSupabase, email);

      if (preparation.error) {
        await adminSupabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: "quote-email",
          recipient_email: email,
          status: "failed",
          error_message: preparation.error,
        });
        errors.push(email);
        continue;
      }

      if (preparation.suppressed || !preparation.unsubscribeToken) {
        await adminSupabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: "quote-email",
          recipient_email: email,
          status: "suppressed",
        });
        continue;
      }

      await adminSupabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "quote-email",
        recipient_email: email,
        status: "pending",
      });

      const { error } = await adminSupabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to: email,
          from: `${name} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: textContent,
          purpose: "transactional",
          label: "quote-email",
          idempotency_key: `quote-${quoteNumber}-${email}-${Date.now()}`,
          unsubscribe_token: preparation.unsubscribeToken,
          queued_at: new Date().toISOString(),
        },
      });

      if (error) {
        console.error(`Failed to enqueue for ${email}:`, error);
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