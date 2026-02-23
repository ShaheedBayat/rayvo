import { useState, useEffect } from 'react';
import { Palette, FileText, Shield, CreditCard, Landmark, Scale, Sun, Moon, Plus, Trash2, Pencil } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useTheme, colorThemes } from '@/hooks/useTheme';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { useInvoiceTemplates, type InvoiceTemplate } from '@/hooks/useInvoiceTemplates';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { Currency, InvoiceItem } from '@/types/invoice';
import { formatCurrency, calculateTotal } from '@/types/invoice';

function TemplateForm({ onSave, onCancel, initial }: {
  onSave: (t: Omit<InvoiceTemplate, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  initial?: InvoiceTemplate;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency || 'ZAR');
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 15);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [items, setItems] = useState<InvoiceItem[]>(
    initial?.items?.length ? initial.items : [{ id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Template name is required'); return; }
    onSave({ name, description, currency, items, taxRate, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Template Name</Label>
          <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Retainer" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Currency</Label>
          <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ZAR">ZAR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this template" className="h-9" />
      </div>
      <div>
        <Label className="text-xs mb-2 block">Line Items</Label>
        {items.map((item, i) => (
          <div key={item.id} className="flex gap-2 mb-2">
            <Input placeholder="Description" value={item.description} onChange={e => { const u = [...items]; u[i] = { ...item, description: e.target.value }; setItems(u); }} className="h-8 text-xs flex-1" />
            <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const u = [...items]; u[i] = { ...item, quantity: parseInt(e.target.value) || 0 }; setItems(u); }} className="h-8 text-xs w-16" />
            <Input type="number" placeholder="Price" value={item.unitPrice} onChange={e => { const u = [...items]; u[i] = { ...item, unitPrice: parseFloat(e.target.value) || 0 }; setItems(u); }} className="h-8 text-xs w-24" />
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
            )}
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setItems([...items, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0 }])}>
          <Plus className="h-3 w-3 mr-1" /> Add item
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tax Rate (%)</Label>
        <Input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="h-9 w-24" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Default notes for this template" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Update' : 'Save'} Template</Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const { settings, saveSettings } = useGlobalSettings();
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useInvoiceTemplates();
  const [banking, setBanking] = useState('');
  const [terms, setTerms] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);

  useEffect(() => {
    if (settings) {
      setBanking(settings.bankingDetails);
      setTerms(settings.termsConditions);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    const ok = await saveSettings(banking, terms);
    if (ok) toast.success('Settings saved');
    else toast.error('Failed to save');
  };

  const handleSaveTemplate = async (t: Omit<InvoiceTemplate, 'id' | 'createdAt'>) => {
    if (editingTemplate) {
      const ok = await updateTemplate(editingTemplate.id, t);
      if (ok) { toast.success('Template updated'); setEditingTemplate(null); setTemplateDialogOpen(false); }
      else toast.error('Failed to update template');
    } else {
      const result = await addTemplate(t);
      if (result) { toast.success('Template saved'); setTemplateDialogOpen(false); }
      else toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const ok = await deleteTemplate(id);
    if (ok) toast.success('Template deleted');
    else toast.error('Failed to delete');
  };

  const sections = [
    {
      icon: Palette,
      title: 'Theme & Appearance',
      description: 'Choose a vibe that matches your brand personality.',
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
          <div>
            <Label className="text-xs mb-3 block">Choose Your Vibe</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {colorThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  className={`relative flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                    colorTheme === t.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30'
                  }`}
                >
                  <div
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background"
                    style={{
                      backgroundColor: `hsl(${t.accent})`,
                      boxShadow: colorTheme === t.id ? `0 0 0 2px hsl(${t.accent})` : undefined,
                    }}
                  />
                  <div>
                    <span className="text-sm font-medium">{t.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.vibe}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Landmark,
      title: 'Banking Details',
      description: 'These details appear at the bottom of every invoice.',
      content: (
        <div className="space-y-3">
          <Textarea
            value={banking}
            onChange={(e) => setBanking(e.target.value)}
            placeholder="Bank Name: First National Bank&#10;Account Name: My Company&#10;Account Number: 123456789&#10;Branch Code: 250655&#10;Reference: Invoice Number"
            rows={5}
          />
          <Button size="sm" onClick={handleSaveSettings}>Save Banking Details</Button>
        </div>
      ),
    },
    {
      icon: Scale,
      title: 'Terms & Conditions',
      description: 'Default terms shown at the bottom of every invoice.',
      content: (
        <div className="space-y-3">
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="1. Payment is due within 30 days of invoice date.&#10;2. Late payments will incur a 2% monthly interest charge.&#10;3. All prices are inclusive of VAT unless stated otherwise."
            rows={5}
          />
          <Button size="sm" onClick={handleSaveSettings}>Save Terms & Conditions</Button>
        </div>
      ),
    },
    {
      icon: FileText,
      title: 'Invoice Templates',
      description: 'Create reusable templates with pre-filled line items, notes, and settings.',
      content: (
        <div className="space-y-4">
          <Dialog open={templateDialogOpen} onOpenChange={(open) => { setTemplateDialogOpen(open); if (!open) setEditingTemplate(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingTemplate ? 'Edit Template' : 'New Invoice Template'}</DialogTitle></DialogHeader>
              <TemplateForm
                initial={editingTemplate || undefined}
                onSave={handleSaveTemplate}
                onCancel={() => { setTemplateDialogOpen(false); setEditingTemplate(null); }}
              />
            </DialogContent>
          </Dialog>

          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet. Create one to speed up invoice creation.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.items.length} item{t.items.length !== 1 ? 's' : ''} · {formatCurrency(calculateTotal(t.items, t.taxRate), t.currency)}
                      {t.description && ` · ${t.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTemplate(t); setTemplateDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTemplate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      icon: Shield,
      title: 'Users & Permissions',
      description: 'Manage team members, roles, and access controls.',
      content: (
        <p className="text-sm text-muted-foreground">Coming soon — invite users and assign roles like Owner, Admin, Finance, or Viewer.</p>
      ),
    },
    {
      icon: CreditCard,
      title: 'Payment Settings',
      description: 'Connect a payment provider to accept online payments.',
      content: (
        <p className="text-sm text-muted-foreground">Coming soon — connect Stripe, PayFast, or other providers.</p>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, branding, and preferences.
          </p>
        </div>
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </div>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="rounded-lg border bg-card p-6 invoice-shadow">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 mb-3">{s.description}</p>
                {s.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
