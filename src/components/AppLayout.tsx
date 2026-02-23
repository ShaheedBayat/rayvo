import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import raynLogo from '@/assets/rayn-logo.png';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Building2,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCompanies } from '@/hooks/useInvoiceStore';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  children?: { to: string; label: string }[];
}

function NavItem({ to, label, icon: Icon, active, collapsed, children }: NavItemProps) {
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
                  className={`block rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                    childActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40'
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
      title={collapsed ? label : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

const salesNav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  {
    to: '/invoices',
    label: 'Invoices',
    icon: FileText,
    children: [
      { to: '/invoices', label: 'All Invoices' },
      { to: '/invoices?status=draft', label: 'Draft' },
      { to: '/invoices?status=sent', label: 'Awaiting Payment' },
      { to: '/invoices?status=paid', label: 'Paid' },
      { to: '/invoices?status=overdue', label: 'Overdue' },
      { to: '/invoices?tab=recurring', label: 'Recurring Invoices' },
    ],
  },
  { to: '/credit-notes', label: 'Credit Notes', icon: Receipt },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products & Services', icon: Package },
  { to: '/online-payments', label: 'Online Payments', icon: CreditCard },
];

const manageNav = [
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { companies } = useCompanies();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeCompany = companies[0];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`sticky top-0 h-screen flex flex-col border-r border-border/50 bg-sidebar-background transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo / Active Company */}
        <div className="flex h-14 items-center gap-2 px-4">
          {activeCompany ? (
            <>
              {activeCompany.logo ? (
                <img src={activeCompany.logo} alt={activeCompany.name} className="h-8 w-8 rounded-lg object-contain shrink-0" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold shrink-0">
                  {activeCompany.name.charAt(0).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <span className="text-sm font-semibold text-foreground tracking-tight truncate">
                  {activeCompany.name}
                </span>
              )}
            </>
          ) : (
            <>
              <img src={raynLogo} alt="RayVo" className="h-9 w-auto shrink-0" />
              {!collapsed && (
                <span className="text-base font-semibold text-foreground tracking-tight">
                  RayVo
                </span>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/70">
                Sales
              </p>
            )}
            <div className="space-y-0.5">
              {salesNav.map((item) => (
                <NavItem
                  key={item.to + item.label}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.to)}
                  collapsed={collapsed}
                  children={'children' in item ? item.children : undefined}
                />
              ))}
            </div>
          </div>
          <div>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/70">
                Manage
              </p>
            )}
            <div className="space-y-0.5">
              {manageNav.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.to)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border/40 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-4">
            {activeCompany && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                    {activeCompany.logo && (
                      <img src={activeCompany.logo} alt="" className="h-5 w-5 rounded object-contain" />
                    )}
                    <span className="max-w-[160px] truncate">{activeCompany.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {companies.map((c) => (
                    <DropdownMenuItem key={c.id}>
                      <span className="truncate">{c.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/companies">
                      <Building2 className="mr-2 h-4 w-4" />
                      Manage Companies
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/companies?action=new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Company
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme" className="h-9 w-9 rounded-lg">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* + New dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-lg">
                  <Plus className="h-4 w-4" />
                  New
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/invoices/new">
                    <FileText className="mr-2 h-4 w-4" />
                    New Invoice
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/invoices?tab=recurring&action=new">
                    <Receipt className="mr-2 h-4 w-4" />
                    New Recurring Invoice
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/customers">
                    <Users className="mr-2 h-4 w-4" />
                    New Customer
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/products">
                    <Package className="mr-2 h-4 w-4" />
                    New Product / Service
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-8 animate-fade-in">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
