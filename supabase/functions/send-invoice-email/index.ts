import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(RESEND_API_KEY);
    const { emails, invoiceNumber, clientName, amount, currency, dueDate, publicUrl, companyName, senderEmail } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No email addresses provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">${companyName || 'Invoice'}</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 24px;">
          <p style="color: #666; font-size: 14px; margin: 0 0 8px;">Invoice <strong style="color: #1a1a1a;">${invoiceNumber}</strong></p>
          <p style="color: #1a1a1a; font-size: 32px; font-weight: 700; margin: 0 0 8px;">${currency} ${amount}</p>
          <p style="color: #666; font-size: 14px; margin: 0;">Due: ${dueDate}</p>
        </div>
        <p style="color: #444; font-size: 15px; line-height: 1.6;">
          Hi ${clientName},<br/><br/>
          Please find your invoice from <strong>${companyName}</strong> attached below. You can view the full invoice and download a PDF by clicking the button.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${publicUrl}" style="display: inline-block; background: #0f766e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            View Invoice
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 40px;">
          Sent via RayVo
        </p>
      </div>
    `;

    const fromEmail = senderEmail || "invoices@resend.dev";
    
    const { error } = await resend.emails.send({
      from: `${companyName || 'RayVo'} <${fromEmail}>`,
      to: emails,
      subject: `Invoice ${invoiceNumber} from ${companyName || 'RayVo'} — ${currency} ${amount}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
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
