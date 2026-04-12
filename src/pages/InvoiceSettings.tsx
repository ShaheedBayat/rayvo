import { useState, useEffect } from 'react';
import { useBrandingThemes, type BrandingTheme, getDefaultTheme } from '@/hooks/useBrandingThemes';
import { useGlobalSettings, type LateFeeSettings } from '@/hooks/useGlobalSettings';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import BrandingThemeEditor from '@/components/branding/BrandingThemeEditor';
import TemplateLibrary from '@/components/branding/TemplateLibrary';
import TemplateExportImport from '@/components/branding/TemplateExportImport';
import AILayoutSuggestions from '@/components/branding/AILayoutSuggestions';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Plus, MoreHorizontal, Pencil, Copy, Star, Trash2, ArrowLeft,
  FileText, CreditCard, Bell, Settings2, LayoutGrid, Sparkles, ArrowUpDown, AlertTriangle, Mail,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const tabs = [
  { id: 'themes', label: 'My Themes', icon: FileText },
  { id: 'library', label: 'Template Library', icon: LayoutGrid },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'export', label: 'Import / Export', icon: ArrowUpDown },
  { id: 'emailtemplate', label: 'Email Template', icon: Mail },
  { id: 'latefees', label: 'Late Fees', icon: AlertTriangle },
  { id: 'defaults', label: 'Default Settings', icon: Settings2 },
  { id: 'payments', label: 'Payment Services', icon: CreditCard },
  { id: 'reminders', label: 'Reminders', icon: Bell },
];

function ThemeCard({ theme, onEdit, onDuplicate, onSetDefault, onDelete }: {
  theme: BrandingTheme;
  onEdit: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-xl border bg-card p-5 hover:border-primary/30 transition-all invoice-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {theme.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{theme.name}</h3>
              {theme.isDefault && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{theme.fontFamily} · {theme.fontSize}pt</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
            {!theme.isDefault && (
              <DropdownMenuItem onClick={onSetDefault}><Star className="mr-2 h-4 w-4" /> Set as Default</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Page</span><span className="font-medium text-foreground">{theme.pageSize}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span><span className="font-medium text-foreground capitalize">{theme.taxDisplay}</span>
        </div>
        <div className="flex justify-between">
          <span>Margins</span><span className="font-medium text-foreground">{theme.topMargin}/{theme.bottomMargin}{theme.measureUnit}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment</span><span className="font-medium text-foreground capitalize">{theme.paymentService === 'none' ? '—' : theme.paymentService}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: theme.primaryColor }} title="Primary" />
          <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: theme.accentColor }} title="Accent" />
        </div>
        {theme.logo && (
          <img src={theme.logo} alt="Logo" className="h-5 w-auto rounded ml-auto object-contain" />
        )}
        <span className="text-xs text-muted-foreground ml-auto">Logo: {theme.logoAlignment}</span>
      </div>
    </div>
  );
}

export default function InvoiceSettings() {
  const { themes, addTheme, updateTheme, deleteTheme, duplicateTheme, setDefault } = useBrandingThemes();
  const { settings: globalSettings, saveLateFeeSettings } = useGlobalSettings();
  const { template: emailTemplate, saveTemplate: saveEmailTemplate, resetToDefault, loading: emailLoading } = useEmailTemplates();
  const [activeTab, setActiveTab] = useState('themes');
  const [editingTheme, setEditingTheme] = useState<BrandingTheme | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [lateFeeType, setLateFeeType] = useState<'flat' | 'percentage'>('percentage');
  const [lateFeeValue, setLateFeeValue] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    const defaults = resetToDefault();
    setEmailSubject(emailTemplate?.subject || defaults.subject);
    setEmailBody(emailTemplate?.body || defaults.body);
  }, [emailTemplate, resetToDefault]);

  useEffect(() => {
    if (globalSettings?.lateFee) {
      setLateFeeEnabled(globalSettings.lateFee.enabled);
      setLateFeeType(globalSettings.lateFee.type);
      setLateFeeValue(globalSettings.lateFee.value > 0 ? String(globalSettings.lateFee.value) : '');
    }
  }, [globalSettings]);

  const handleApplyPreset = async (themeData: Partial<BrandingTheme>) => {
    const result = await addTheme(themeData);
    if (result) {
      toast.success(`Template "${themeData.name}" added to your themes`);
      setActiveTab('themes');
    } else {
      toast.error('Failed to create theme from template');
    }
  };

  const handleImport = async (themeData: Partial<BrandingTheme>) => {
    const result = await addTheme(themeData);
    if (result) {
      toast.success(`Imported "${themeData.name}"`);
      setActiveTab('themes');
    } else {
      toast.error('Failed to import theme');
    }
  };

  const handleAISuggestion = async (updates: Partial<BrandingTheme>) => {
    // Apply to the default theme or first theme
    const target = themes.find(t => t.isDefault) || themes[0];
    if (!target) {
      toast.error('Create a theme first before applying AI suggestions');
      return;
    }
    const ok = await updateTheme(target.id, updates);
    if (ok) {
      toast.success(`Applied AI suggestions to "${target.name}"`);
    } else {
      toast.error('Failed to apply suggestions');
    }
  };

  // Full-screen editor mode
  if (editingTheme || isCreating) {
    return (
      <BrandingThemeEditor
        initial={editingTheme || undefined}
        onSave={async (theme) => {
          if (editingTheme) {
            const ok = await updateTheme(editingTheme.id, theme);
            if (ok) toast.success('Theme updated');
            else { toast.error('Failed to update'); return; }
          } else {
            const result = await addTheme(theme);
            if (result) toast.success('Theme created');
            else { toast.error('Failed to create'); return; }
          }
          setEditingTheme(null);
          setIsCreating(false);
        }}
        onCancel={() => { setEditingTheme(null); setIsCreating(false); }}
      />
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-3">
        <a href="/settings" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Settings
        </a>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="text-xl font-semibold">Document Builder</h1>
        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
          Super Template Builder
        </Badge>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border/50 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'themes' && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {themes.length} theme{themes.length !== 1 ? 's' : ''}. Each controls how your documents render in PDF and online views.
            </p>
            <Button size="sm" className="gap-1.5 rounded-lg" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4" /> New Theme
            </Button>
          </div>

          {themes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">No branding themes yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
                Create your first theme or pick one from the Template Library.
              </p>
              <div className="mt-6 flex gap-2">
                <Button className="gap-1.5" onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4" /> Create Theme
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => setActiveTab('library')}>
                  <LayoutGrid className="h-4 w-4" /> Browse Library
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {themes.map(theme => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  onEdit={() => setEditingTheme(theme)}
                  onDuplicate={async () => {
                    const dup = await duplicateTheme(theme);
                    if (dup) toast.success('Theme duplicated');
                    else toast.error('Failed to duplicate');
                  }}
                  onSetDefault={async () => {
                    const ok = await setDefault(theme.id);
                    if (ok) toast.success('Default theme updated');
                    else toast.error('Failed to update default');
                  }}
                  onDelete={async () => {
                    const ok = await deleteTheme(theme.id);
                    if (ok) toast.success('Theme deleted');
                    else toast.error('Failed to delete');
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'library' && (
        <TemplateLibrary onApplyPreset={handleApplyPreset} />
      )}

      {activeTab === 'ai' && (
        <div className="max-w-2xl">
          <AILayoutSuggestions
            currentTheme={themes.find(t => t.isDefault) || themes[0] || null}
            onApplySuggestion={handleAISuggestion}
          />
        </div>
      )}

      {activeTab === 'export' && (
        <div className="max-w-2xl">
          <TemplateExportImport themes={themes} onImport={handleImport} />
        </div>
      )}

      {activeTab === 'latefees' && (
        <div className="max-w-lg rounded-xl border bg-card p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Late Payment Fees
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically prompt to add a late fee when an invoice goes overdue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={lateFeeEnabled} onCheckedChange={setLateFeeEnabled} />
            <span className="text-sm">{lateFeeEnabled ? 'Late fees enabled' : 'Late fees disabled'}</span>
          </div>

          {lateFeeEnabled && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fee Type</Label>
                <Select value={lateFeeType} onValueChange={(v) => setLateFeeType(v as 'flat' | 'percentage')}>
                  <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage per month</SelectItem>
                    <SelectItem value="flat">Flat fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {lateFeeType === 'percentage' ? 'Percentage (%)' : 'Flat fee amount'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lateFeeValue}
                  onChange={e => setLateFeeValue(e.target.value)}
                  placeholder={lateFeeType === 'percentage' ? 'e.g. 2' : 'e.g. 250'}
                  className="h-9 w-56"
                />
                <p className="text-[11px] text-muted-foreground">
                  {lateFeeType === 'percentage'
                    ? 'E.g. 2 means 2% of the invoice total per month overdue.'
                    : 'A fixed amount added as a line item when the invoice is overdue.'}
                </p>
              </div>
            </div>
          )}

          <Button
            size="sm"
            onClick={async () => {
              const val = parseFloat(lateFeeValue) || 0;
              if (lateFeeEnabled && val <= 0) { toast.error('Enter a valid fee value'); return; }
              const ok = await saveLateFeeSettings({ enabled: lateFeeEnabled, type: lateFeeType, value: val });
              if (ok) toast.success('Late fee settings saved');
              else toast.error('Failed to save');
            }}
          >
            Save Late Fee Settings
          </Button>
        </div>
      )}

      {activeTab === 'defaults' && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Settings2 className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">Default Settings</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Configure default branding theme per company, customer, or document type. Coming soon.
          </p>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">Payment Services</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Connect Stripe, PayFast, or PayPal to accept online payments directly from invoices. Coming soon.
          </p>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Bell className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">Invoice Reminders</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Set up automatic reminders for overdue invoices. Coming soon.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
