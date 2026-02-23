import { useState } from 'react';
import { Package, Plus, Upload, Download, Trash2, Edit, MoreHorizontal, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/AppLayout';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

const TAX_RATES = ['0%', '5%', '10%', '15%', '20%'];

function NewItemDialog({ open, onOpenChange, onSave, editing }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<any>;
  editing?: Product;
}) {
  const { activeCompanyId } = useActiveCompany();
  const [code, setCode] = useState(editing?.code || '');
  const [name, setName] = useState(editing?.name || '');
  const [isTracked, setIsTracked] = useState(editing?.isTracked || false);
  const [purchaseEnabled, setPurchaseEnabled] = useState(editing?.purchaseEnabled ?? true);
  const [purchasePrice, setPurchasePrice] = useState(editing?.purchasePrice?.toString() || '');
  const [purchaseDescription, setPurchaseDescription] = useState(editing?.purchaseDescription || '');
  const [purchaseTaxRate, setPurchaseTaxRate] = useState(editing?.purchaseTaxRate?.toString() || '15');
  const [sellEnabled, setSellEnabled] = useState(editing?.sellEnabled ?? true);
  const [sellPrice, setSellPrice] = useState(editing?.sellPrice?.toString() || '');
  const [sellDescription, setSellDescription] = useState(editing?.sellDescription || '');
  const [sellTaxRate, setSellTaxRate] = useState(editing?.sellTaxRate?.toString() || '15');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { toast.error('Code is required'); return; }
    const result = await onSave({
      companyId: activeCompanyId || '',
      code: code.trim(),
      name: name.trim(),
      type: isTracked ? 'product' : 'service',
      isTracked,
      purchaseEnabled,
      purchasePrice: parseFloat(purchasePrice) || 0,
      purchaseDescription,
      purchaseTaxRate: parseFloat(purchaseTaxRate) || 15,
      sellEnabled,
      sellPrice: parseFloat(sellPrice) || 0,
      sellDescription,
      sellTaxRate: parseFloat(sellTaxRate) || 15,
      status: 'active',
    });
    if (result) {
      toast.success(editing ? 'Item updated' : 'Item created');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Item' : 'New Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Code & Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Code <span className="text-muted-foreground">(required)</span></Label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. SKU-001" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Item name" />
            </div>
          </div>

          <Separator />

          {/* Track inventory */}
          <div className="flex items-start gap-3">
            <Checkbox checked={isTracked} onCheckedChange={(v) => setIsTracked(!!v)} id="track" className="mt-0.5" />
            <div>
              <Label htmlFor="track" className="text-sm font-semibold cursor-pointer">Track inventory item</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track the quantity and value of stock on hand. Suitable for organisations with less than 4,000 products or services.
              </p>
            </div>
          </div>

          <Separator />

          {/* Purchase section */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox checked={purchaseEnabled} onCheckedChange={(v) => setPurchaseEnabled(!!v)} id="purchase" className="mt-0.5" />
              <div>
                <Label htmlFor="purchase" className="text-sm font-semibold cursor-pointer">Purchase</Label>
                <p className="text-sm text-muted-foreground mt-0.5">Add item to bills, purchase orders, and other purchase transactions</p>
              </div>
            </div>
            {purchaseEnabled && (
              <div className="ml-7 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Cost price</Label>
                    <Input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tax rate</Label>
                    <Select value={`${purchaseTaxRate}%`} onValueChange={v => setPurchaseTaxRate(v.replace('%', ''))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TAX_RATES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea value={purchaseDescription} onChange={e => setPurchaseDescription(e.target.value)} rows={2} placeholder="Purchase description..." />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Sell section */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox checked={sellEnabled} onCheckedChange={(v) => setSellEnabled(!!v)} id="sell" className="mt-0.5" />
              <div>
                <Label htmlFor="sell" className="text-sm font-semibold cursor-pointer">Sell</Label>
                <p className="text-sm text-muted-foreground mt-0.5">Add item to invoices, quotes, and other sales transactions</p>
              </div>
            </div>
            {sellEnabled && (
              <div className="ml-7 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Sale price</Label>
                    <Input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tax rate</Label>
                    <Select value={`${sellTaxRate}%`} onValueChange={v => setSellTaxRate(v.replace('%', ''))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TAX_RATES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea value={sellDescription} onChange={e => setSellDescription(e.target.value)} rows={2} placeholder="Sales description..." />
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Products() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    if (editing) {
      const ok = await updateProduct(editing.id, product);
      return ok ? product : null;
    }
    return await addProduct(product);
  };

  const openNew = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setDialogOpen(true); };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products & Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a catalogue of items to add to your invoices quickly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg hidden sm:flex">
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg hidden sm:flex">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button className="gap-1.5 rounded-lg" onClick={openNew}>
            <Plus className="h-4 w-4" /> New Item
          </Button>
        </div>
      </div>

      <NewItemDialog
        open={dialogOpen}
        onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(undefined); }}
        onSave={handleSave}
        editing={editing}
      />

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">Loading...</div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 mb-4">
            <Package className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-medium">No products or services yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
            Add your products and services here so you can quickly add them to invoices. Include item codes, prices, and tax rates.
          </p>
          <Button className="mt-6 gap-1.5 rounded-lg" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add your first item
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 relative max-w-xs">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-9 pl-3"
            />
          </div>
          <div className="rounded-xl border border-border/50 bg-card invoice-shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-24 hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-24 hidden md:table-cell">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-24">Sale Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-20 hidden md:table-cell">Tax</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">Status</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer" onClick={() => openEdit(p)}>
                    <td className="px-4 py-3.5 mono text-xs font-medium">{p.code}</td>
                    <td className="px-4 py-3.5 font-medium">{p.name || '—'}</td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <Badge variant="secondary" className="capitalize text-[11px]">{p.type}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right mono text-muted-foreground hidden md:table-cell">
                      {p.purchaseEnabled ? p.purchasePrice.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right mono font-medium">
                      {p.sellEnabled ? p.sellPrice.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground hidden md:table-cell">
                      {p.sellTaxRate}%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={p.status === 'active' ? 'default' : 'outline'} className="text-[11px]">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => { await updateProduct(p.id, { status: p.status === 'active' ? 'archived' : 'active' }); toast.success(p.status === 'active' ? 'Archived' : 'Activated'); }}>
                            <Archive className="mr-2 h-4 w-4" /> {p.status === 'active' ? 'Archive' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => { await deleteProduct(p.id); toast.success('Deleted'); }} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppLayout>
  );
}
