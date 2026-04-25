import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import rayvoLogo from '@/assets/rayvo-logo.png';
import rayvoWordmark from '@/assets/rayvo-wordmark.png';
import {
  LayoutDashboard, FileText, Users, Package, Building2, BarChart3, Settings,
  Plus, LogOut, Sun, Moon, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight,
  CreditCard, Receipt, FileCheck, Menu, X, Wallet, Activity, UsersRound, Search,
} from 'lucide-react';
import CommandPalette from '@/components/CommandPalette';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useInvoices } from '@/hooks/useInvoiceStore';
import { useRecurringProcessor } from '@/hooks/useRecurringProcessor';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  children?: { to: string; label: string }[];
  onNavigate?: () => void;
}

function NavItem({ to, label, icon: Icon, active, collapsed, badge, children, onNavigate }: NavItemProps) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (!children) return false;
    return children.some(c => location.pathname === c.to) || active;
  });

  const hasChildren = children && children.length > 0;

  if (hasChildren && !collapsed) {
    const isGroupActive = active || children.some(c => location.pathname === c.to);
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isGroupActive
              ? 'text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{label}</span>
          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </button>
        {open && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/40 pl-3">
            {children.map(child => {
              const childActive = location.pathname === child.to;
              return (
                <Link
                  key={child.to}
                  to={child.to}
                  onClick={onNavigate}
                  className={`block rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                    childActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40'
                  }`}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary -ml-[2px]'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
      {!collapsed && (
        <span className="flex-1">{label}</span>
      )}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sidebar-primary/20 px-1.5 text-[10px] font-semibold text-sidebar-primary">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function getNavItems(canAccessSettings: boolean, canManageCompanies: boolean, canCreateInvoice: boolean) {
  const salesNav = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/credit-notes', label: 'Credit Notes', icon: Receipt },
    { to: '/quotes', label: 'Quotes', icon: FileCheck },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/customer-statements', label: 'Statements', icon: FileText },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/online-payments', label: 'Online Payments', icon: CreditCard },
  ];

  const manageNav = [
    ...(canManageCompanies ? [{ to: '/companies', label: 'Companies', icon: Building2 }] : []),
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    ...(canAccessSettings ? [{ to: '/team', label: 'Team', icon: UsersRound }] : []),
    ...(canAccessSettings ? [{ to: '/activity', label: 'Activity Log', icon: Activity }] : []),
    ...(canAccessSettings ? [{ to: '/settings', label: 'Settings', icon: Settings }] : []),
  ];

  return { salesNav, manageNav };
}

function SidebarContent({ collapsed, isActive, onNavigate, salesNav, manageNav, badges }: { collapsed: boolean; isActive: (path: string) => boolean; onNavigate?: () => void; salesNav: any[]; manageNav: any[]; badges?: Record<string, number> }) {
  return (
    <nav className="flex-1 overflow-y-auto scrollbar-subtle px-3 py-4 space-y-5">
      <div>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Sales
          </p>
        )}
        <div className="space-y-0.5">
          {salesNav.map((item: any) => (
            <NavItem
              key={item.to + item.label}
              to={item.to}
              label={item.label}
              icon={item.icon}
              active={isActive(item.to)}
              collapsed={collapsed}
              badge={badges?.[item.to]}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
      <div>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Manage
          </p>
        )}
        <div className="space-y-0.5">
          {manageNav.map((item: any) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              active={isActive(item.to)}
              collapsed={collapsed}
              badge={badges?.[item.to]}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

export default function AppLayout({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const permissions = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const { activeCompany, companies, switchCompany, activeCompanyId } = useActiveCompany();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useRecurringProcessor();

  const { salesNav, manageNav } = getNavItems(permissions.canAccessSettings, permissions.canManageCompanies, permissions.canCreateInvoice);

  // Badge counts for sidebar
  const { invoices: allInvoices } = useInvoices();
  const companyInvoices = activeCompanyId ? allInvoices.filter((i: any) => i.companyId === activeCompanyId) : allInvoices;
  const activeInvoices = companyInvoices.filter((i: any) => i.status !== 'voided');
  const overdueCount = activeInvoices.filter((i: any) => (i.status === 'sent' || i.status === 'partially_paid') && new Date(i.dueDate) < new Date()).length;
  const draftCount = activeInvoices.filter((i: any) => i.status === 'draft').length;
  const badges: Record<string, number> = {
    '/invoices': overdueCount + draftCount,
  };

  const cachedName = localStorage.getItem('activeCompanyName');
  const cachedLogo = localStorage.getItem('activeCompanyLogo');

  if (activeCompany) {
    localStorage.setItem('activeCompanyName', activeCompany.name);
    localStorage.setItem('activeCompanyLogo', activeCompany.logo || '');
  }

  // Only use cache when activeCompany hasn't loaded yet; once loaded, use its actual values
  const displayName = activeCompany ? activeCompany.name : cachedName;
  const displayLogo = activeCompany ? (activeCompany.logo || '') : (cachedLogo || '');

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const LogoSection = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div className="flex h-20 items-center gap-2 px-4">
      {isCollapsed ? (
        <img src={rayvoLogo} alt="Rayvo" className="h-10 w-10 object-contain shrink-0" />
      ) : (
        <img src={rayvoWordmark} alt="Rayvo" className="h-14 w-auto object-contain shrink-0" />
      )}
    </div>
  );

  return (
    <>
    <CommandPalette />
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`sticky top-0 h-screen hidden md:flex flex-col border-r border-border/50 bg-sidebar transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <LogoSection isCollapsed={collapsed} />
        <SidebarContent collapsed={collapsed} isActive={isActive} salesNav={salesNav} manageNav={manageNav} badges={badges} />
        <div className="border-t border-border/40 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
                <LogoSection isCollapsed={false} />
                <SidebarContent collapsed={false} isActive={isActive} onNavigate={() => setMobileOpen(false)} salesNav={salesNav} manageNav={manageNav} badges={badges} />
              </SheetContent>
            </Sheet>

            {(activeCompany || companies.length > 0) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                    {displayLogo && (
                      <img src={displayLogo} alt="" className="h-5 w-5 rounded object-contain" />
                    )}
                    <span className="max-w-[160px] truncate">{displayName || 'Select Company'}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {companies.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => switchCompany(c.id)}>
                      <span className={`truncate ${c.id === activeCompany?.id ? 'font-semibold' : ''}`}>{c.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/companies"><Building2 className="mr-2 h-4 w-4" /> Manage Companies</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/companies?action=new"><Plus className="mr-2 h-4 w-4" /> Create New Company</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Search / Command Palette trigger */}
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground border border-border/60 px-3" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search...</span>
              <kbd className="ml-2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme" className="h-9 w-9 rounded-lg">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {permissions.canCreateInvoice && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5 rounded-lg">
                    <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span> <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to="/invoices/new"><FileText className="mr-2 h-4 w-4" /> New Invoice</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {permissions.canCreateCustomer && (
                    <DropdownMenuItem asChild><Link to="/customers"><Users className="mr-2 h-4 w-4" /> New Customer</Link></DropdownMenuItem>
                  )}
                  {permissions.canCreateProduct && (
                    <DropdownMenuItem asChild><Link to="/products"><Package className="mr-2 h-4 w-4" /> New Product / Service</Link></DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5"><p className="text-sm font-medium">{user.email}</p></div>
                  <DropdownMenuSeparator />
                  {permissions.canAccessSettings && (
                    <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 md:px-8 py-6 md:py-10 animate-fade-in">
          <div className={fullWidth ? 'mx-auto w-full' : 'mx-auto max-w-7xl'}>{children}</div>
        </main>
      </div>
    </div>
    </>
  );
}
