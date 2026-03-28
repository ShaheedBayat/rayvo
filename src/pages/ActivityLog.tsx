import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { format, parseISO } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import { Activity, FileText, CreditCard, RefreshCw, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface LogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string;
  createdAt: string;
  userName: string;
}

const entityIcons: Record<string, React.ElementType> = {
  invoice: FileText,
  payment: CreditCard,
  recurring: RefreshCw,
};

const actionColors: Record<string, string> = {
  created: 'bg-success/10 text-success border-success/20',
  updated: 'bg-info/10 text-info border-info/20',
  deleted: 'bg-destructive/10 text-destructive border-destructive/20',
  voided: 'bg-destructive/10 text-destructive border-destructive/20',
  approved_and_sent: 'bg-info/10 text-info border-info/20',
  emailed: 'bg-info/10 text-info border-info/20',
  paid: 'bg-success/10 text-success border-success/20',
  partial_payment: 'bg-warning/10 text-warning border-warning/20',
  payment_removed: 'bg-warning/10 text-warning border-warning/20',
  generated: 'bg-success/10 text-success border-success/20',
};

export default function ActivityLog() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (entityFilter !== 'all') {
      query = query.eq('entity_type', entityFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      // Fetch unique owner_ids to get display names
      const ownerIds = [...new Set(data.map(r => r.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', ownerIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.user_id] = p.display_name || 'Unknown'; });

      setLogs(data.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        details: row.details || '',
        createdAt: row.created_at,
        userName: nameMap[row.owner_id] || 'Unknown',
      })));
    }
    setLoading(false);
  }, [user, entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (!permissions.loading && !permissions.canAccessSettings) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">You do not have permission to view the activity log.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Activity Log</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20">
          <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const Icon = entityIcons[log.entityType] || Activity;
                const colorClass = actionColors[log.action] || 'bg-muted text-muted-foreground';
                return (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`${colorClass} text-[11px] capitalize`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize text-muted-foreground">{log.entityType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {log.details || <span className="text-muted-foreground italic">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
