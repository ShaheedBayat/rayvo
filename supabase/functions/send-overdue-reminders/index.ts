import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resend = new Resend(RESEND_API_KEY);
    const now = new Date();
    let sentCount = 0;

    // Get all users with reminders enabled
    const { data: reminderSettings } = await supabaseAdmin
      .from("reminder_settings")
      .select("*")
      .eq("enabled", true);

    if (!reminderSettings || reminderSettings.length === 0) {
      return new Response(JSON.stringify({ message: "No reminder settings enabled", sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const settings of reminderSettings) {
      // Get overdue invoices for this user
      const { data: invoices } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("owner_id", settings.owner_id)
        .in("status", ["sent", "partially_paid"])
        .is("deleted_at", null)
        .lt("due_date", now.toISOString().split("T")[0]);

      if (!invoices || invoices.length === 0) continue;

      for (const invoice of invoices) {
        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Check if this day count matches any configured reminder day
        const matchDay = settings.days_after_due.find((d: number) => d === daysOverdue);
        if (matchDay === undefined) continue;

        // Check if already sent for this day
        const { data: existing } = await supabaseAdmin
          .from("reminder_log")
          .select("id")
          .eq("invoice_id", invoice.id)
          .eq("days_overdue", daysOverdue)
          .maybeSingle();

        if (existing) continue;

        // Send reminder email
        if (invoice.client_email) {
          const { data: company } = invoice.company_id
            ? await supabaseAdmin.from("companies").select("name").eq("id", invoice.company_id).maybeSingle()
            : { data: null };

          const companyName = company?.name || "RayVo";

          await resend.emails.send({
            from: `${companyName} <invoices@resend.dev>`,
            to: [invoice.client_email],
            subject: `Reminder: Invoice ${invoice.invoice_number} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="color: #1a1a1a;">Payment Reminder</h2>
                <p>Invoice <strong>${invoice.invoice_number}</strong> was due on ${invoice.due_date} and is now <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</strong>.</p>
                <p>Please arrange payment at your earliest convenience.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">Sent via RayVo</p>
              </div>
            `,
          });

          // Log the reminder
          await supabaseAdmin.from("reminder_log").insert({
            invoice_id: invoice.id,
            owner_id: settings.owner_id,
            days_overdue: daysOverdue,
          });

          sentCount++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
