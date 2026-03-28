import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ActiveCompanyProvider } from "@/hooks/useActiveCompany";
import { usePermissions } from "@/hooks/usePermissions";
import Overview from "./pages/Overview";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import InvoiceView from "./pages/InvoiceView";
import EditInvoice from "./pages/EditInvoice";
import PublicInvoice from "./pages/PublicInvoice";
import Companies from "./pages/Companies";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";
import InvoiceSettings from "./pages/InvoiceSettings";
import OnlinePayments from "./pages/OnlinePayments";
import CreditNotes from "./pages/CreditNotes";
import Quotes from "./pages/Quotes";
import CreateQuote from "./pages/CreateQuote";
import EditQuote from "./pages/EditQuote";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CustomerStatement from "./pages/CustomerStatement";
import CustomerStatements from "./pages/CustomerStatements";
import Expenses from "./pages/Expenses";
import VatReport from "./pages/VatReport";
import RecurringInvoiceForm from "./pages/RecurringInvoiceForm";
import ActivityLog from "./pages/ActivityLog";
import { toast } from "sonner";

const queryClient = new QueryClient();

const ProtectedRoute = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, _ref) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
});
ProtectedRoute.displayName = 'ProtectedRoute';

const AuthRoute = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, _ref) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
});
AuthRoute.displayName = 'AuthRoute';

/** Admin-only route guard */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const permissions = usePermissions();
  
  if (permissions.loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }
  
  if (!permissions.canAccessSettings) {
    toast.error("You don't have permission to access this page");
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

/** Guard for recurring invoice management (admin only) */
function RecurringGuard({ children }: { children: React.ReactNode }) {
  const permissions = usePermissions();
  
  if (permissions.loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }
  
  if (!permissions.canManageRecurring) {
    toast.error("You don't have permission to access this page");
    return <Navigate to="/invoices" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ActiveCompanyProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/public/invoice/:id" element={<PublicInvoice />} />
              <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/invoices/new" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceView /></ProtectedRoute>} />
              <Route path="/invoices/:id/edit" element={<ProtectedRoute><EditInvoice /></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/customer-statements" element={<ProtectedRoute><CustomerStatements /></ProtectedRoute>} />
              <Route path="/customers/:id/statement" element={<ProtectedRoute><CustomerStatement /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/recurring" element={<Navigate to="/invoices?tab=recurring" replace />} />
              <Route path="/recurring-invoices" element={<Navigate to="/invoices?tab=recurring" replace />} />
              <Route path="/invoices/recurring/new" element={<ProtectedRoute><RecurringGuard><RecurringInvoiceForm /></RecurringGuard></ProtectedRoute>} />
              <Route path="/online-payments" element={<ProtectedRoute><OnlinePayments /></ProtectedRoute>} />
              <Route path="/credit-notes" element={<ProtectedRoute><CreditNotes /></ProtectedRoute>} />
              <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
              <Route path="/settings/invoice" element={<ProtectedRoute><AdminRoute><InvoiceSettings /></AdminRoute></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/vat-report" element={<ProtectedRoute><VatReport /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AdminRoute><SettingsPage /></AdminRoute></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute><AdminRoute><ActivityLog /></AdminRoute></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ActiveCompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
