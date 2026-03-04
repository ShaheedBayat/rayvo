import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Invoice, InvoiceItem } from '@/types/invoice';

export interface VatLedgerEntry {
  id: string;
  companyId: string;
  invoiceId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  taxRateName: string;
  taxRate: number;
  taxableAmount: number;
  vatAmount: number;
  entryType: string;
  status: string;
  createdAt: string;
}

function mapEntry(row: any): VatLedgerEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customerName: row.customer_name,
    taxRateName: row.tax_rate_name,
    taxRate: Number(row.tax_rate),
    taxableAmount: Number(row.taxable_amount),
    vatAmount: Number(row.vat_amount),
    entryType: row.entry_type,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function useVatLedger() {
  const { user } = useAuth();

  // Create VAT ledger entries when an invoice is approved/sent
  const createVatEntries = useCallback(async (invoice: Invoice) => {
    if (!user || !invoice.companyId) return;

    // Group items by tax rate
    const rateGroups: Record<string, { taxableAmount: number; vatAmount: number; rateName: string }> = {};
    
    // We need to know pricing mode - fetch company
    const { data: companyData } = await supabase
      .from('companies')
      .select('pricing_mode')
      .eq('id', invoice.companyId)
      .maybeSingle();
    const pricingMode = companyData?.pricing_mode || 'exclusive';

    invoice.items.forEach(item => {
      const rate = item.taxRate ?? invoice.taxRate;
      const rateName = item.taxRateName || (rate === 0 ? 'Zero-rated' : 'Standard');
      const discount = item.discount || 0;
      const lineTotal = item.quantity * item.unitPrice * (1 - discount / 100);
      const key = `${rate}-${rateName}`;
      
      if (!rateGroups[key]) rateGroups[key] = { taxableAmount: 0, vatAmount: 0, rateName };
      
      if (pricingMode === 'inclusive' && rate > 0) {
        const taxable = lineTotal / (1 + rate / 100);
        rateGroups[key].taxableAmount += taxable;
        rateGroups[key].vatAmount += lineTotal - taxable;
      } else {
        rateGroups[key].taxableAmount += lineTotal;
        rateGroups[key].vatAmount += lineTotal * (rate / 100);
      }
    });

    const entries = Object.entries(rateGroups).map(([key, group]) => ({
      company_id: invoice.companyId,
      owner_id: user.id,
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.createdAt.split('T')[0],
      customer_name: invoice.clientName,
      tax_rate_name: group.rateName,
      tax_rate: parseFloat(key.split('-')[0]),
      taxable_amount: group.taxableAmount,
      vat_amount: group.vatAmount,
      entry_type: 'output_vat',
      status: 'active',
    }));

    if (entries.length > 0) {
      await supabase.from('vat_ledger_entries').insert(entries);
    }
  }, [user]);

  // Create reversal entries when an invoice is voided
  const reverseVatEntries = useCallback(async (invoice: Invoice) => {
    if (!user || !invoice.companyId) return;

    // Mark existing entries as reversed
    await supabase.from('vat_ledger_entries')
      .update({ status: 'reversed' })
      .eq('invoice_id', invoice.id)
      .eq('status', 'active');

    // Fetch original entries to create reversals
    const { data: originals } = await supabase.from('vat_ledger_entries')
      .select('*')
      .eq('invoice_id', invoice.id)
      .eq('status', 'reversed');

    if (originals && originals.length > 0) {
      const reversals = originals.map(orig => ({
        company_id: orig.company_id,
        owner_id: user.id,
        invoice_id: orig.invoice_id,
        invoice_number: orig.invoice_number,
        invoice_date: orig.invoice_date,
        customer_name: orig.customer_name,
        tax_rate_name: orig.tax_rate_name,
        tax_rate: orig.tax_rate,
        taxable_amount: -Number(orig.taxable_amount),
        vat_amount: -Number(orig.vat_amount),
        entry_type: 'output_vat',
        status: 'active',
      }));
      await supabase.from('vat_ledger_entries').insert(reversals);
    }
  }, [user]);

  // Fetch entries for reporting
  const fetchEntries = useCallback(async (companyId: string, dateFrom?: string, dateTo?: string) => {
    if (!user) return [];
    let query = supabase.from('vat_ledger_entries')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('invoice_date', dateFrom);
    if (dateTo) query = query.lte('invoice_date', dateTo);

    const { data, error } = await query;
    if (!error && data) return data.map(mapEntry);
    return [];
  }, [user]);

  return { createVatEntries, reverseVatEntries, fetchEntries };
}
