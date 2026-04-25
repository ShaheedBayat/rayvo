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

function buildInvoiceHtml(invoiceNumber: string, clientName: string, amount: string, currency: string, dueDate: string, publicUrl: string, companyName: string) {
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeClientName = escapeHtml(clientName);
  const safeAmount = escapeHtml(amount);
  const safeCurrency = escapeHtml(currency);
  const safeDueDate = escapeHtml(dueDate || "On receipt");
  const safePublicUrl = escapeHtml(publicUrl);
  const safeCompanyName = escapeHtml(companyName);

  return `
    <div style="background:#ffffff;margin:0;padding:32px 0;font-family:'Inter',Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;padding:0 16px;">
        <div style="background:#f7fbfc;border:1px solid #d8e7eb;border-radius:24px;padding:36px 32px;">
          <p style="margin:0 0 12px;color:hsl(192,75%,36%);font-size:12px;font-weight:700;letter-spacing:0.2em;">RAYVO</p>
          <h1 style="margin:0 0 12px;color:hsl(200,30%,8%);font-size:32px;line-height:1.15;font-weight:700;">Your invoice is ready</h1>
          <p style="margin:0 0 24px;color:hsl(200,15%,35%);font-size:15px;line-height:1.7;">Hi ${safeClientName}, ${safeCompanyName} has shared invoice <strong>${safeInvoiceNumber}</strong> with you.</p>

          <div style="background:#ffffff;border:1px solid #d8e7eb;border-radius:20px;padding:24px;margin:0 0 18px;">
            <p style="margin:0 0 8px;color:hsl(200,15%,35%);font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Amount due</p>
            <p style="margin:0 0 8px;color:hsl(200,30%,8%);font-size:34px;line-height:1.1;font-weight:700;">${safeCurrency} ${safeAmount}</p>
            <p style="margin:0;color:hsl(200,15%,35%);font-size:14px;">Due date: ${safeDueDate}</p>
          </div>

          <div style="padding:14px 0;border-bottom:1px solid #d8e7eb;">
            <p style="margin:0 0 4px;color:hsl(200,15%,35%);font-size:13px;">Invoice number</p>
            <p style="margin:0;color:hsl(200,30%,8%);font-size:15px;font-weight:600;">${safeInvoiceNumber}</p>
          </div>
          <div style="padding:14px 0 0;">
            <p style="margin:0 0 4px;color:hsl(200,15%,35%);font-size:13px;">Issued by</p>
            <p style="margin:0;color:hsl(200,30%,8%);font-size:15px;font-weight:600;">${safeCompanyName}</p>
          </div>

          <div style="text-align:center;margin:28px 0 18px;">
            <a href="${safePublicUrl}" style="display:inline-block;background:hsl(192,75%,36%);color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Review invoice</a>
          </div>

          <p style="margin:0 0 12px;color:hsl(200,15%,35%);font-size:14px;line-height:1.6;">You can view the invoice online and download a PDF from the secure link above.</p>
          <p style="margin:0;color:hsl(200,15%,35%);font-size:13px;line-height:1.7;">If the button does not work, open this link in your browser:<br /><a href="${safePublicUrl}" style="color:hsl(192,75%,36%);word-break:break-all;">${safePublicUrl}</a></p>

          <hr style="border-color:#d8e7eb;margin:24px 0 16px;" />
          <p style="margin:0;color:hsl(200,15%,35%);font-size:12px;text-align:center;">Professional invoicing made simple.</p>
        </div>
      </div>
    </div>
  `;
}

function buildFeedbackHtml(reportText: string, userEmail: string, page: string) {
  const safeReportText = escapeHtml(reportText);
  const safeUserEmail = escapeHtml(userEmail);
  const safePage = escapeHtml(page || "Unknown page");
  const safeTimestamp = escapeHtml(new Date().toISOString());

  return `
    <div style="background:#ffffff;margin:0;padding:32px 0;font-family:'Inter',Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;padding:0 16px;">
        <div style="background:#f7fbfc;border:1px solid #d8e7eb;border-radius:24px;padding:36px 32px;">
          <p style="margin:0 0 12px;color:hsl(192,75%,36%);font-size:12px;font-weight:700;letter-spacing:0.2em;">RAYVO FEEDBACK</p>
          <h1 style="margin:0 0 12px;color:hsl(200,30%,8%);font-size:32px;line-height:1.15;font-weight:700;">New customer report received</h1>
          <p style="margin:0 0 24px;color:hsl(200,15%,35%);font-size:15px;line-height:1.7;">A user submitted feedback from inside the app.</p>

          <div style="background:#ffffff;border:1px solid #d8e7eb;border-radius:20px;padding:24px;margin:0 0 18px;">
            <p style="margin:0 0 8px;color:hsl(200,15%,35%);font-size:13px;">From</p>
            <p style="margin:0 0 16px;color:hsl(200,30%,8%);font-size:16px;font-weight:600;">${safeUserEmail}</p>
            <p style="margin:0 0 8px;color:hsl(200,15%,35%);font-size:13px;">Page</p>
            <p style="margin:0 0 16px;color:hsl(200,30%,8%);font-size:15px;font-weight:600;">${safePage}</p>
            <p style="margin:0 0 8px;color:hsl(200,15%,35%);font-size:13px;">Submitted at</p>
            <p style="margin:0;color:hsl(200,30%,8%);font-size:15px;font-weight:600;">${safeTimestamp}</p>
          </div>

          <div style="background:#ffffff;border:1px solid #d8e7eb;border-radius:20px;padding:24px;white-space:pre-wrap;color:hsl(200,30%,8%);font-size:14px;line-height:1.7;">${safeReportText}</div>

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
    const { emails, invoiceNumber, clientName, amount, currency, dueDate, publicUrl, companyName, customHtml } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No email addresses provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFeedback = invoiceNumber === "FEEDBACK";
    const name = companyName || SITE_NAME;

    let subject: string;
    let html: string;
    let textContent: string;

    if (isFeedback) {
      subject = `[RayVo Feedback] from ${clientName}`;
      html = buildFeedbackHtml(customHtml || "", clientName, publicUrl || "");
      textContent = `Feedback from ${clientName}: ${customHtml || ""}`;
    } else {
      html = buildInvoiceHtml(invoiceNumber, clientName, amount, currency, dueDate, publicUrl, name);
      subject = `Invoice ${invoiceNumber} from ${name} — ${currency} ${amount}`;
      textContent = `Invoice ${invoiceNumber} from ${name} for ${currency} ${amount}. Due: ${dueDate}.`;
    }

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
          template_name: isFeedback ? "feedback-report" : "invoice-email",
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
          template_name: isFeedback ? "feedback-report" : "invoice-email",
          recipient_email: email,
          status: "suppressed",
        });
        continue;
      }

      await adminSupabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: isFeedback ? "feedback-report" : "invoice-email",
        recipient_email: email,
        status: "pending",
      });

      const { error } = await adminSupabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to: email,
          from: `${isFeedback ? SITE_NAME : name} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: textContent,
          purpose: "transactional",
          label: isFeedback ? "feedback-report" : "invoice-email",
          idempotency_key: isFeedback ? `feedback-${messageId}` : `invoice-${messageId}`,
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
