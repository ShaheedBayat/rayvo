import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // PayFast sends ITN (Instant Transaction Notification) as form-urlencoded POST
    const formData = await req.text();
    const params = new URLSearchParams(formData);
    const pfData: Record<string, string> = {};
    params.forEach((value, key) => {
      pfData[key] = value;
    });

    console.log('PayFast ITN received:', JSON.stringify(pfData));

    const paymentStatus = pfData.payment_status;
    const invoiceId = pfData.m_payment_id;
    const amountGross = parseFloat(pfData.amount_gross || '0');
    const pfPaymentId = pfData.pf_payment_id;

    if (!invoiceId) {
      console.error('No invoice ID in PayFast ITN');
      return new Response('OK', { status: 200 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (paymentStatus === 'COMPLETE') {
      // Get the invoice to find owner_id
      const { data: invoice } = await supabase
        .from('invoices')
        .select('owner_id, status')
        .eq('id', invoiceId)
        .maybeSingle();

      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        return new Response('OK', { status: 200 });
      }

      // Record payment
      await supabase.from('payments').insert({
        invoice_id: invoiceId,
        owner_id: invoice.owner_id,
        amount: amountGross,
        method: 'payfast',
        reference: pfPaymentId || '',
        payment_date: new Date().toISOString().split('T')[0],
      });

      // Update invoice status to paid
      await supabase.from('invoices').update({
        status: 'paid',
      }).eq('id', invoiceId);

      console.log(`Invoice ${invoiceId} marked as paid via PayFast`);
    }

    // PayFast expects a 200 response
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('PayFast ITN error:', err);
    return new Response('OK', { status: 200 });
  }
});
