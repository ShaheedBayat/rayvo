import { useState } from 'react';
import { BrandingTheme, getDefaultTheme } from '@/hooks/useBrandingThemes';
import InvoiceLivePreview from './InvoiceLivePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Eye, ChevronDown, ChevronRight, Upload, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  initial?: BrandingTheme;
  onSave: (theme: BrandingTheme) => void;
  onCancel: () => void;
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors rounded-xl">
        {title}
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t">{children}</div>}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function Toggle({ label, checked, onChange, tip }: { label: string; checked: boolean; onChange: (v: boolean) => void; tip?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="text-sm text-foreground group-hover:text-foreground/80">{label}</span>
      {tip && <Tip text={tip} />}
    </label>
  );
}

const fontOptions = ['Inter', 'DM Sans', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Nunito', 'Source Sans Pro', 'Merriweather', 'Playfair Display'];

export default function BrandingThemeEditor({ initial, onSave, onCancel }: Props) {
  const [theme, setTheme] = useState<BrandingTheme>(initial || getDefaultTheme());

  const update = <K extends keyof BrandingTheme>(key: K, value: BrandingTheme[K]) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const updateTitle = (key: string, value: string) => {
    setTheme(prev => ({ ...prev, documentTitles: { ...prev.documentTitles, [key]: value } }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('logo', reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-card/95 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-muted-foreground/40">|</span>
          <Input
            value={theme.name}
            onChange={e => update('name', e.target.value)}
            className="h-8 w-64 text-sm font-medium border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary"
            placeholder="Theme name..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="outline" size="sm" onClick={() => onSave(theme)} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Save & Preview PDF
          </Button>
          <Button size="sm" onClick={() => onSave(theme)} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_380px] gap-6 p-6 max-w-[1600px] mx-auto">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <Section title="Page & Layout">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Page Size</Label>
                <Select value={theme.pageSize} onValueChange={v => update('pageSize', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="US Letter">US Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Measure in</Label>
                <Select value={theme.measureUnit} onValueChange={v => update('measureUnit', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">Centimeters</SelectItem>
                    <SelectItem value="inches">Inches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Top Margin ({theme.measureUnit})</Label>
                <Input type="number" min={0} step={0.1} value={theme.topMargin} onChange={e => update('topMargin', parseFloat(e.target.value) || 0)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bottom Margin ({theme.measureUnit})</Label>
                <Input type="number" min={0} step={0.1} value={theme.bottomMargin} onChange={e => update('bottomMargin', parseFloat(e.target.value) || 0)} className="h-9" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Address Padding ({theme.measureUnit}) <Tip text="Space between the address block and the table" /></Label>
                <Input type="number" min={0} step={0.1} value={theme.addressPadding} onChange={e => update('addressPadding', parseFloat(e.target.value) || 0)} className="h-9" />
              </div>
            </div>
          </Section>

          <Section title="Typography">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Font Family</Label>
                <Select value={theme.fontFamily} onValueChange={v => update('fontFamily', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fontOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Font Size (pt)</Label>
                <Input type="number" min={8} max={16} value={theme.fontSize} onChange={e => update('fontSize', parseInt(e.target.value) || 10)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
                  <Input value={theme.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="h-9 flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.accentColor} onChange={e => update('accentColor', e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
                  <Input value={theme.accentColor} onChange={e => update('accentColor', e.target.value)} className="h-9 flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Document Titles">
            <p className="text-xs text-muted-foreground mb-2">Customize how each document type is titled on the PDF.</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(theme.documentTitles).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key.replace(/_/g, ' ')}</Label>
                  <Input value={val} onChange={e => updateTitle(key, e.target.value)} className="h-8 text-xs" />
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="space-y-4">
          <Section title="Display Controls">
            <div className="space-y-2.5">
              <Toggle label="Show logo" checked={theme.showLogo} onChange={v => update('showLogo', v)} />
              <Toggle label="Show tax number" checked={theme.showTaxNumber} onChange={v => update('showTaxNumber', v)} tip="Display your VAT/tax registration number" />
              <Toggle label="Show registered address" checked={theme.showRegisteredAddress} onChange={v => update('showRegisteredAddress', v)} />
              <Toggle label="Show item code" checked={theme.showItemCode} onChange={v => update('showItemCode', v)} tip="Display product/service codes on line items" />
              <Toggle label="Show unit price & quantity" checked={theme.showUnitPriceQuantity} onChange={v => update('showUnitPriceQuantity', v)} />
              <Toggle label="Show tax column" checked={theme.showTaxColumn} onChange={v => update('showTaxColumn', v)} />
              <Toggle label="Show column headings" checked={theme.showColumnHeadings} onChange={v => update('showColumnHeadings', v)} />
              <Toggle label="Hide discount" checked={theme.hideDiscount} onChange={v => update('hideDiscount', v)} />
              <Toggle label="Show contact account number" checked={theme.showContactAccountNumber} onChange={v => update('showContactAccountNumber', v)} />
            </div>
          </Section>

          <Section title="Tax Display">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Show taxes as</Label>
                <Select value={theme.taxDisplay} onValueChange={v => update('taxDisplay', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Tax Exclusive</SelectItem>
                    <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Subtotal Display</Label>
                <Select value={theme.taxSubtotalDisplay} onValueChange={v => update('taxSubtotalDisplay', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single tax subtotal</SelectItem>
                    <SelectItem value="multiple">Multiple tax breakdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Currency Conversion</Label>
                <Select value={theme.currencyConversionDisplay} onValueChange={v => update('currencyConversionDisplay', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single total</SelectItem>
                    <SelectItem value="line_by_line">Line by line</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Logo & Company Details">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Logo</Label>
                <div className="flex items-center gap-3">
                  {theme.logo ? (
                    <div className="relative">
                      <img src={theme.logo} alt="Logo" className="h-12 w-auto rounded border object-contain" />
                      <button onClick={() => update('logo', '')} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]">×</button>
                    </div>
                  ) : (
                    <label className="flex h-12 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary/40 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Logo Alignment</Label>
                <div className="flex gap-1">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => update('logoAlignment', a)}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        theme.logoAlignment === a ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Header Details <Tip text="These details appear at the top of your PDF documents" /></Label>
                <Textarea
                  value={theme.companyHeaderDetails}
                  onChange={e => update('companyHeaderDetails', e.target.value)}
                  placeholder="Enter your company details as they should appear on PDFs."
                  rows={3}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Service</Label>
                <Select value={theme.paymentService} onValueChange={v => update('paymentService', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="payfast">PayFast</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Terms & Conditions">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Terms — Invoices & Statements</Label>
                <Textarea value={theme.termsInvoices} onChange={e => update('termsInvoices', e.target.value)} rows={3} className="text-xs" placeholder="Payment terms for invoices..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Terms — Quotes</Label>
                <Textarea value={theme.termsQuotes} onChange={e => update('termsQuotes', e.target.value)} rows={3} className="text-xs" placeholder="Terms for quotes..." />
              </div>
            </div>
          </Section>

          <Section title="Advanced" defaultOpen={false}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Watermark <Tip text="Shows a faint text overlay (e.g. DRAFT, PAID)" /></Label>
                <Select value={theme.watermark || 'none'} onValueChange={v => update('watermark', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                    <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                    <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Footer Message</Label>
                <Input value={theme.footerMessage} onChange={e => update('footerMessage', e.target.value)} className="h-9 text-xs" placeholder="Thank you for your business" />
              </div>
              <Toggle label="Show QR code" checked={theme.showQrCode} onChange={v => update('showQrCode', v)} tip="Display a QR code linking to the online invoice" />
              <Toggle label="Show bank details" checked={theme.showBankDetails} onChange={v => update('showBankDetails', v)} tip="Display banking details at the bottom of the invoice" />
            </div>
          </Section>
        </div>

        {/* RIGHT COLUMN — Live Preview */}
        <div className="hidden xl:block">
          <InvoiceLivePreview theme={theme} />
        </div>
      </div>
    </div>
  );
}
