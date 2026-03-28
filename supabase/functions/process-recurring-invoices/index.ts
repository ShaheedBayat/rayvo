import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date().toISOString().split('T')[0]
    const todayDate = new Date(today)

    // Get all active recurring invoices where next_run_date <= today
    const { data: recurring, error: fetchError } = await supabase
      .from('recurring_invoices')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_date', today)

    if (fetchError) throw fetchError

    let created = 0
    const skipped: string[] = []

    for (const rec of recurring || []) {
      // Safety: skip if end_date exists and today > end_date
      if (rec.end_date && new Date(rec.end_date) < todayDate) {
        // Auto-deactivate expired recurring invoices
        await supabase.from('recurring_invoices').update({ is_active: false }).eq('id', rec.id)
        skipped.push(`${rec.id}: end_date passed, deactivated`)
        continue
      }

      // Safety: skip if already generated today (prevent duplicates)
      if (rec.last_generated_at) {
        const lastGen = new Date(rec.last_generated_at).toISOString().split('T')[0]
        if (lastGen === today) {
          skipped.push(`${rec.id}: already generated today`)
          continue
        }
      }

      // Safety: validate customer exists
      if (rec.client_name) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('name', rec.client_name)
          .eq('owner_id', rec.owner_id)
          .limit(1)
        // If customer was deleted, skip and log
        if (!customer || customer.length === 0) {
          console.error(`Skipping recurring ${rec.id}: customer "${rec.client_name}" not found`)
          skipped.push(`${rec.id}: customer not found`)
          continue
        }
      }

      // Create a draft invoice with the same line items
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      const { error: insertError } = await supabase.from('invoices').insert({
        owner_id: rec.owner_id,
        company_id: rec.company_id,
        invoice_number: 'TEMP', // DB trigger generates the real number
        client_name: rec.client_name,
        client_email: rec.client_email || '',
        client_address: rec.client_address || '',
        currency: rec.currency,
        items: rec.items,
        tax_rate: rec.tax_rate,
        notes: rec.notes || '',
        status: 'draft',
        due_date: dueDate.toISOString().split('T')[0],
      })

      if (insertError) {
        console.error(`Failed to create invoice for recurring ${rec.id}:`, insertError)
        skipped.push(`${rec.id}: insert failed`)
        continue
      }

      // Calculate next run date based on frequency
      let nextDate = new Date(rec.next_run_date)
      
      // Advance past today to prevent re-generation
      do {
        if (rec.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7)
        } else if (rec.frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1)
          if (rec.day_of_month) {
            const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
            nextDate.setDate(Math.min(rec.day_of_month, maxDay))
          }
        } else if (rec.frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1)
        }
      } while (nextDate <= todayDate)

      await supabase.from('recurring_invoices').update({
        next_run_date: nextDate.toISOString().split('T')[0],
        last_generated_at: new Date().toISOString(),
      }).eq('id', rec.id)

      created++
    }

    return new Response(
      JSON.stringify({ success: true, created, processed: recurring?.length || 0, skipped }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
