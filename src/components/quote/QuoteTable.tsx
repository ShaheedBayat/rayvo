import { MoreHorizontal, Edit, ArrowRight, Trash2, Loader2, Send, MessageSquareWarning, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, calculateSmartTotals } from '@/types/invoice';
import type { Quote } from '@/hooks/useQuotes';
import type { Company } from '@/types/invoice';

interface QuoteTableProps {
  quotes: Quote[];
  statusConfig: Record<string, { label: string; className: string }>;
  getCompany: (id: string) => Company | undefined;
  converting: string | null;
  sending: string | null;
  onEdit: (q: Quote) => void;
  onConvert: (q: Quote) => void;
  onViewInvoice: (invoiceId: string) => void;
  onSend: (q: Quote) => void;
  onShowReason: (q: Quote) => void;
  onUpdateStatus: (q: Quote, status: Quote['status']) => void;
  onDelete: (id: string) => void;
}

export default function QuoteTable({
  quotes, statusConfig, getCompany, converting, sending,
  onEdit, onConvert, onViewInvoice, onSend, onShowReason, onUpdateStatus, onDelete,
}: QuoteTableProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card invoice-shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/20">
             <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Number</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Valid Until</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-4 py-3 w-12" />
          </tr>
        </thead>
        <tbody>
          {quotes.map(q => {
            const co = q.companyId ? getCompany(q.companyId) : undefined;
            const total = calculateSmartTotals(q.items, q.taxRate, co?.pricingMode || 'exclusive', co?.isVatRegistered ?? false).total;
            const cfg = statusConfig[q.status] || statusConfig.draft;
            const isConverting = converting === q.id;
            return (
              <tr key={q.id} className="border-b last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="px-4 py-3.5 mono font-medium">{q.quoteNumber}</td>
                <td className="px-4 py-3.5">{q.clientName}</td>
                <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{new Date(q.validUntil).toLocaleDateString()}</td>
                <td className="px-4 py-3.5 text-right mono font-medium">{formatCurrency(total, q.currency)}</td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Badge variant="outline" className={`${cfg.className} text-[11px]`}>{cfg.label}</Badge>
                    {q.status === 'rejected' && q.rejectionReason && (
                      <button
                        onClick={() => onShowReason(q)}
                        className="text-[11px] text-destructive underline hover:no-underline"
                      >
                        See reason
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {q.status === 'draft' && (
                        <DropdownMenuItem onClick={() => onEdit(q)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      )}
                      {(q.status === 'draft' || q.status === 'sent') && q.clientEmail && (
                        <DropdownMenuItem onClick={() => onSend(q)} disabled={sending === q.id}>
                          {sending === q.id ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="mr-2 h-4 w-4" /> {q.status === 'sent' ? 'Resend Email' : 'Send to Customer'}</>
                          )}
                        </DropdownMenuItem>
                      )}
                      {q.status === 'rejected' && q.rejectionReason && (
                        <DropdownMenuItem onClick={() => onShowReason(q)}>
                          <MessageSquareWarning className="mr-2 h-4 w-4" /> View Rejection Reason
                        </DropdownMenuItem>
                      )}
                      {q.status === 'converted' && q.convertedInvoiceId && (
                        <DropdownMenuItem onClick={() => onViewInvoice(q.convertedInvoiceId!)}>
                          <Eye className="mr-2 h-4 w-4" /> View Invoice
                        </DropdownMenuItem>
                      )}
                      {(q.status === 'draft' || q.status === 'sent' || q.status === 'accepted') && (
                        <DropdownMenuItem onClick={() => onConvert(q)} disabled={isConverting}>
                          {isConverting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Converting...</>
                          ) : (
                            <><ArrowRight className="mr-2 h-4 w-4" /> Convert to Invoice</>
                          )}
                        </DropdownMenuItem>
                      )}
                      {q.status === 'draft' && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(q, 'sent')}>
                          Mark as Sent
                        </DropdownMenuItem>
                      )}
                      {q.status === 'sent' && (
                        <>
                          <DropdownMenuItem onClick={() => onUpdateStatus(q, 'accepted')}>
                            Mark as Accepted
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateStatus(q, 'rejected')}>
                            Mark as Rejected
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(q.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
