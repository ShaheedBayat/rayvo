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
    const PAYFAST_MERCHANT_ID = Deno.env.get('PAYFAST_MERCHANT_ID');
    const PAYFAST_MERCHANT_KEY = Deno.env.get('PAYFAST_MERCHANT_KEY');
    const PAYFAST_PASSPHRASE = Deno.env.get('PAYFAST_PASSPHRASE');

    if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
      return new Response(JSON.stringify({ error: 'PayFast credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { invoiceId, token } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('share_token', token)
      .maybeSingle();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate total
    const items = (invoice.items as any[]) || [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const discount = item.discount || 0;
      return sum + lineTotal * (1 - discount / 100);
    }, 0);
    const tax = subtotal * ((invoice.tax_rate || 0) / 100);
    const total = subtotal + tax;

    // Determine return/notify URLs
    const siteUrl = Deno.env.get('SITE_URL') || req.headers.get('origin') || 'https://rayvo1.lovable.app';
    const returnUrl = `${siteUrl}/invoice/${invoiceId}?token=${token}&payment=success`;
    const cancelUrl = `${siteUrl}/invoice/${invoiceId}?token=${token}&payment=cancelled`;
    const notifyUrl = `${supabaseUrl}/functions/v1/payfast-notify`;

    // Build PayFast form data
    const pfData: Record<string, string> = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      m_payment_id: invoiceId,
      amount: total.toFixed(2),
      item_name: `Invoice ${invoice.invoice_number}`,
      item_description: `Payment for invoice ${invoice.invoice_number}`,
    };

    if (invoice.client_email) {
      pfData.email_address = invoice.client_email;
    }

    // Generate signature
    const paramString = Object.entries(pfData)
      .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
      .join('&');

    const signatureString = PAYFAST_PASSPHRASE
      ? `${paramString}&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE.trim()).replace(/%20/g, '+')}`
      : paramString;

    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    pfData.signature = signature;

    // Use sandbox for testing, live for production
    const payfastUrl = Deno.env.get('PAYFAST_SANDBOX') === 'true'
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    return new Response(JSON.stringify({ 
      payfast_url: payfastUrl,
      form_data: pfData,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('PayFast checkout error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
