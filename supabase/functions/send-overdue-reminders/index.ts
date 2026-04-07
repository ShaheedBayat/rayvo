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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    let sentCount = 0;

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

        const matchDay = settings.days_after_due.find((d: number) => d === daysOverdue);
        if (matchDay === undefined) continue;

        const { data: existing } = await supabaseAdmin
          .from("reminder_log")
          .select("id")
          .eq("invoice_id", invoice.id)
          .eq("days_overdue", daysOverdue)
          .maybeSingle();

        if (existing) continue;

        if (invoice.client_email) {
          const { data: company } = invoice.company_id
            ? await supabaseAdmin.from("companies").select("name").eq("id", invoice.company_id).maybeSingle()
            : { data: null };

          const companyName = company?.name || "RayVo";

          // Use transactional email system for reminders
          await supabaseAdmin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "invoice-email",
              recipientEmail: invoice.client_email,
              idempotencyKey: `reminder-${invoice.id}-${daysOverdue}`,
              templateData: {
                invoiceNumber: invoice.invoice_number,
                clientName: invoice.client_name,
                amount: "Overdue",
                currency: invoice.currency,
                dueDate: invoice.due_date,
                companyName,
              },
            },
          });

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
