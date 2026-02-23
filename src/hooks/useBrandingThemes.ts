import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BrandingTheme {
  id: string;
  name: string;
  isDefault: boolean;
  pageSize: 'A4' | 'US Letter';
  topMargin: number;
  bottomMargin: number;
  addressPadding: number;
  measureUnit: 'cm' | 'inches';
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  accentColor: string;
  logo: string;
  logoAlignment: 'left' | 'center' | 'right';
  companyHeaderDetails: string;
  showLogo: boolean;
  showTaxNumber: boolean;
  showRegisteredAddress: boolean;
  showItemCode: boolean;
  showUnitPriceQuantity: boolean;
  showTaxColumn: boolean;
  showColumnHeadings: boolean;
  hideDiscount: boolean;
  showContactAccountNumber: boolean;
  taxDisplay: 'exclusive' | 'inclusive';
  taxSubtotalDisplay: 'single' | 'multiple';
  currencyConversionDisplay: 'single' | 'line_by_line';
  paymentService: 'stripe' | 'payfast' | 'paypal' | 'none';
  termsInvoices: string;
  termsQuotes: string;
  documentTitles: Record<string, string>;
  watermark: string;
  footerMessage: string;
  footerLogo: string;
  showQrCode: boolean;
  showBankDetails: boolean;
  createdAt: string;
}

const defaultDocumentTitles: Record<string, string> = {
  draft_invoice: 'Draft Invoice',
  approved_invoice: 'Tax Invoice',
  overdue_invoice: 'Overdue Invoice',
  credit_note: 'Credit Note',
  statement: 'Statement',
  quote: 'Quote',
  receipt: 'Receipt',
  remittance_advice: 'Remittance Advice',
};

function mapTheme(row: any): BrandingTheme {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    pageSize: row.page_size,
    topMargin: Number(row.top_margin),
    bottomMargin: Number(row.bottom_margin),
    addressPadding: Number(row.address_padding),
    measureUnit: row.measure_unit,
    fontFamily: row.font_family,
    fontSize: row.font_size,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    logo: row.logo || '',
    logoAlignment: row.logo_alignment,
    companyHeaderDetails: row.company_header_details || '',
    showLogo: row.show_logo,
    showTaxNumber: row.show_tax_number,
    showRegisteredAddress: row.show_registered_address,
    showItemCode: row.show_item_code,
    showUnitPriceQuantity: row.show_unit_price_quantity,
    showTaxColumn: row.show_tax_column,
    showColumnHeadings: row.show_column_headings,
    hideDiscount: row.hide_discount,
    showContactAccountNumber: row.show_contact_account_number,
    taxDisplay: row.tax_display,
    taxSubtotalDisplay: row.tax_subtotal_display,
    currencyConversionDisplay: row.currency_conversion_display,
    paymentService: row.payment_service,
    termsInvoices: row.terms_invoices || '',
    termsQuotes: row.terms_quotes || '',
    documentTitles: (row.document_titles as Record<string, string>) || defaultDocumentTitles,
    watermark: row.watermark || '',
    footerMessage: row.footer_message || '',
    footerLogo: row.footer_logo || '',
    showQrCode: row.show_qr_code,
    showBankDetails: row.show_bank_details,
    createdAt: row.created_at,
  };
}

function themeToRow(t: Partial<BrandingTheme>) {
  const row: any = {};
  if (t.name !== undefined) row.name = t.name;
  if (t.isDefault !== undefined) row.is_default = t.isDefault;
  if (t.pageSize !== undefined) row.page_size = t.pageSize;
  if (t.topMargin !== undefined) row.top_margin = t.topMargin;
  if (t.bottomMargin !== undefined) row.bottom_margin = t.bottomMargin;
  if (t.addressPadding !== undefined) row.address_padding = t.addressPadding;
  if (t.measureUnit !== undefined) row.measure_unit = t.measureUnit;
  if (t.fontFamily !== undefined) row.font_family = t.fontFamily;
  if (t.fontSize !== undefined) row.font_size = t.fontSize;
  if (t.primaryColor !== undefined) row.primary_color = t.primaryColor;
  if (t.accentColor !== undefined) row.accent_color = t.accentColor;
  if (t.logo !== undefined) row.logo = t.logo;
  if (t.logoAlignment !== undefined) row.logo_alignment = t.logoAlignment;
  if (t.companyHeaderDetails !== undefined) row.company_header_details = t.companyHeaderDetails;
  if (t.showLogo !== undefined) row.show_logo = t.showLogo;
  if (t.showTaxNumber !== undefined) row.show_tax_number = t.showTaxNumber;
  if (t.showRegisteredAddress !== undefined) row.show_registered_address = t.showRegisteredAddress;
  if (t.showItemCode !== undefined) row.show_item_code = t.showItemCode;
  if (t.showUnitPriceQuantity !== undefined) row.show_unit_price_quantity = t.showUnitPriceQuantity;
  if (t.showTaxColumn !== undefined) row.show_tax_column = t.showTaxColumn;
  if (t.showColumnHeadings !== undefined) row.show_column_headings = t.showColumnHeadings;
  if (t.hideDiscount !== undefined) row.hide_discount = t.hideDiscount;
  if (t.showContactAccountNumber !== undefined) row.show_contact_account_number = t.showContactAccountNumber;
  if (t.taxDisplay !== undefined) row.tax_display = t.taxDisplay;
  if (t.taxSubtotalDisplay !== undefined) row.tax_subtotal_display = t.taxSubtotalDisplay;
  if (t.currencyConversionDisplay !== undefined) row.currency_conversion_display = t.currencyConversionDisplay;
  if (t.paymentService !== undefined) row.payment_service = t.paymentService;
  if (t.termsInvoices !== undefined) row.terms_invoices = t.termsInvoices;
  if (t.termsQuotes !== undefined) row.terms_quotes = t.termsQuotes;
  if (t.documentTitles !== undefined) row.document_titles = t.documentTitles;
  if (t.watermark !== undefined) row.watermark = t.watermark;
  if (t.footerMessage !== undefined) row.footer_message = t.footerMessage;
  if (t.footerLogo !== undefined) row.footer_logo = t.footerLogo;
  if (t.showQrCode !== undefined) row.show_qr_code = t.showQrCode;
  if (t.showBankDetails !== undefined) row.show_bank_details = t.showBankDetails;
  return row;
}

export function getDefaultTheme(): BrandingTheme {
  return {
    id: '',
    name: 'Default Theme',
    isDefault: true,
    pageSize: 'A4',
    topMargin: 2.0,
    bottomMargin: 2.0,
    addressPadding: 1.0,
    measureUnit: 'cm',
    fontFamily: 'Inter',
    fontSize: 10,
    primaryColor: '#0f766e',
    accentColor: '#14b8a6',
    logo: '',
    logoAlignment: 'left',
    companyHeaderDetails: '',
    showLogo: true,
    showTaxNumber: true,
    showRegisteredAddress: true,
    showItemCode: false,
    showUnitPriceQuantity: true,
    showTaxColumn: true,
    showColumnHeadings: true,
    hideDiscount: false,
    showContactAccountNumber: false,
    taxDisplay: 'exclusive',
    taxSubtotalDisplay: 'single',
    currencyConversionDisplay: 'single',
    paymentService: 'none',
    termsInvoices: '',
    termsQuotes: '',
    documentTitles: { ...defaultDocumentTitles },
    watermark: '',
    footerMessage: '',
    footerLogo: '',
    showQrCode: false,
    showBankDetails: true,
    createdAt: '',
  };
}

export function useBrandingThemes() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<BrandingTheme[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThemes = useCallback(async () => {
    if (!user) { setThemes([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('branding_themes')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setThemes(data.map(mapTheme));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchThemes(); }, [fetchThemes]);

  const addTheme = useCallback(async (t: Partial<BrandingTheme>) => {
    if (!user) return null;
    const row = themeToRow(t);
    row.owner_id = user.id;
    const { data, error } = await supabase.from('branding_themes').insert(row).select().single();
    if (!error && data) {
      const newTheme = mapTheme(data);
      setThemes(prev => [...prev, newTheme]);
      return newTheme;
    }
    return null;
  }, [user]);

  const updateTheme = useCallback(async (id: string, t: Partial<BrandingTheme>) => {
    const row = themeToRow(t);
    const { error } = await supabase.from('branding_themes').update(row).eq('id', id);
    if (!error) {
      setThemes(prev => prev.map(x => x.id === id ? { ...x, ...t } : x));
      return true;
    }
    return false;
  }, []);

  const deleteTheme = useCallback(async (id: string) => {
    const { error } = await supabase.from('branding_themes').delete().eq('id', id);
    if (!error) setThemes(prev => prev.filter(x => x.id !== id));
    return !error;
  }, []);

  const duplicateTheme = useCallback(async (theme: BrandingTheme) => {
    const copy = { ...theme, name: `${theme.name} (Copy)`, isDefault: false };
    return addTheme(copy);
  }, [addTheme]);

  const setDefault = useCallback(async (id: string) => {
    if (!user) return false;
    // Unset all defaults first
    await supabase.from('branding_themes').update({ is_default: false }).eq('owner_id', user.id);
    const { error } = await supabase.from('branding_themes').update({ is_default: true }).eq('id', id);
    if (!error) {
      setThemes(prev => prev.map(x => ({ ...x, isDefault: x.id === id })));
      return true;
    }
    return false;
  }, [user]);

  return { themes, loading, addTheme, updateTheme, deleteTheme, duplicateTheme, setDefault, refetch: fetchThemes };
}
