import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Auto-processes recurring invoices once per session.
 * Call this hook in the app layout or invoices page.
 */
export function useRecurringProcessor() {
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user || hasRun.current) return;
    hasRun.current = true;

    const process = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('process-recurring-invoices');
        if (error) {
          console.error('Recurring invoice processing failed:', error);
          return;
        }
        if (data?.created > 0) {
          console.log(`Auto-generated ${data.created} invoice(s) from recurring templates`);
        }
      } catch (err) {
        console.error('Error processing recurring invoices:', err);
      }
    };

    process();
  }, [user]);
}
