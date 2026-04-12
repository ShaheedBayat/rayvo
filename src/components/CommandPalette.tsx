import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, FileText, Users, Package, Building2, BarChart3,
  Settings, Plus, Receipt, FileCheck, CreditCard, Wallet, Activity,
  UsersRound, Search,
} from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useCustomers } from '@/hooks/useCustomers';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/', keywords: 'dashboard home' },
  { label: 'Invoices', icon: FileText, path: '/invoices', keywords: 'bills' },
  { label: 'Create Invoice', icon: Plus, path: '/invoices/new', keywords: 'new invoice' },
  { label: 'Credit Notes', icon: Receipt, path: '/credit-notes', keywords: 'refund' },
  { label: 'Quotes', icon: FileCheck, path: '/quotes', keywords: 'estimate proposal' },
  { label: 'Create Quote', icon: Plus, path: '/quotes/new', keywords: 'new quote' },
  { label: 'Customers', icon: Users, path: '/customers', keywords: 'clients contacts' },
  { label: 'Statements', icon: FileText, path: '/customer-statements', keywords: 'account' },
  { label: 'Products', icon: Package, path: '/products', keywords: 'services catalog items' },
  { label: 'Expenses', icon: Wallet, path: '/expenses', keywords: 'costs spending' },
  { label: 'Online Payments', icon: CreditCard, path: '/online-payments', keywords: 'payfast stripe' },
  { label: 'Companies', icon: Building2, path: '/companies', keywords: 'business organization' },
  { label: 'Reports', icon: BarChart3, path: '/reports', keywords: 'analytics revenue' },
  { label: 'VAT Report', icon: Receipt, path: '/vat-report', keywords: 'tax' },
  { label: 'Team', icon: UsersRound, path: '/team', keywords: 'members staff' },
  { label: 'Activity Log', icon: Activity, path: '/activity', keywords: 'audit history' },
  { label: 'Settings', icon: Settings, path: '/settings', keywords: 'preferences config' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { invoices } = useInvoices();
  const { customers } = useCustomers();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);
  const recentCustomers = useMemo(() => customers.slice(0, 5), [customers]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navItems.map(item => (
            <CommandItem
              key={item.path}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => go(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {recentInvoices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Invoices">
              {recentInvoices.map(inv => (
                <CommandItem
                  key={inv.id}
                  value={`${inv.invoiceNumber} ${inv.clientName}`}
                  onSelect={() => go(`/invoices/${inv.id}`)}
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs mr-2">{inv.invoiceNumber}</span>
                  <span className="text-muted-foreground">{inv.clientName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {recentCustomers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Customers">
              {recentCustomers.map(c => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.email}`}
                  onSelect={() => go('/customers')}
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
