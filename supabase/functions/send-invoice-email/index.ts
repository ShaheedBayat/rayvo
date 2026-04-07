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

function buildInvoiceHtml(invoiceNumber: string, clientName: string, amount: string, currency: string, dueDate: string, publicUrl: string, companyName: string) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center; margin: 0 0 30px;">${companyName}</h1>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 24px; text-align: center;">
        <p style="color: #666; font-size: 14px; margin: 0 0 8px;">Invoice <strong style="color: #1a1a1a;">${invoiceNumber}</strong></p>
        <p style="color: #1a1a1a; font-size: 32px; font-weight: 700; margin: 0 0 8px;">${currency} ${amount}</p>
        <p style="color: #666; font-size: 14px; margin: 0;">Due: ${dueDate}</p>
      </div>
      <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 16px;">
        Hi ${clientName},
      </p>
      <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 16px;">
        Please find your invoice from <strong>${companyName}</strong>. You can view the full invoice and download a PDF by clicking the button below.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${publicUrl}" style="display: inline-block; background: hsl(192, 75%, 36%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          View Invoice
        </a>
      </div>
      <hr style="border-color: #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #999; text-align: center;">Sent via ${SITE_NAME}</p>
    </div>
  `;
}

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

    const name = companyName || SITE_NAME;
    const html = buildInvoiceHtml(invoiceNumber, clientName, amount, currency, dueDate, publicUrl, name);
    const subject = `Invoice ${invoiceNumber} from ${name} — ${currency} ${amount}`;

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const errors: string[] = [];
    for (const email of emails) {
      const messageId = crypto.randomUUID();

      await adminSupabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "invoice-email",
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
          text: `Invoice ${invoiceNumber} from ${name} for ${currency} ${amount}. Due: ${dueDate}.`,
          purpose: "transactional",
          label: "invoice-email",
          idempotency_key: `invoice-${invoiceNumber}-${email}`,
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
