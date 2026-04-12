import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface EmailTemplate {
  id: string;
  subject: string;
  body: string;
  templateType: string;
  companyId: string | null;
}

const DEFAULT_SUBJECT = 'Invoice {{invoice_number}} from {{company_name}}';
const DEFAULT_BODY = `Hi {{client_name}},

Please find attached invoice {{invoice_number}} for {{total_amount}}.

Due date: {{due_date}}

Thank you for your business.

Best regards,
{{company_name}}`;

export function useEmailTemplates() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTemplate = useCallback(async () => {
    if (!user) { setTemplate(null); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from('email_templates' as any)
      .select('*')
      .eq('owner_id', user.id)
      .eq('template_type', 'invoice');
    
    if (activeCompanyId) {
      query = query.eq('company_id', activeCompanyId);
    } else {
      query = query.is('company_id', null);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      const row = data as any;
      setTemplate({
        id: row.id,
        subject: row.subject,
        body: row.body,
        templateType: row.template_type,
        companyId: row.company_id,
      });
    } else {
      setTemplate(null);
    }
    setLoading(false);
  }, [user, activeCompanyId]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  const saveTemplate = useCallback(async (subject: string, body: string) => {
    if (!user) return false;
    if (template) {
      const { error } = await (supabase.from('email_templates' as any) as any)
        .update({ subject, body })
        .eq('id', template.id);
      if (!error) {
        setTemplate(prev => prev ? { ...prev, subject, body } : prev);
        return true;
      }
      return false;
    } else {
      const { data, error } = await (supabase.from('email_templates' as any) as any)
        .insert({
          owner_id: user.id,
          company_id: activeCompanyId || null,
          template_type: 'invoice',
          subject,
          body,
        })
        .select()
        .single();
      if (!error && data) {
        setTemplate({
          id: data.id,
          subject: data.subject,
          body: data.body,
          templateType: data.template_type,
          companyId: data.company_id,
        });
        return true;
      }
      return false;
    }
  }, [user, template, activeCompanyId]);

  const resetToDefault = useCallback(() => {
    return { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY };
  }, []);

  const getSubject = useCallback(() => template?.subject || DEFAULT_SUBJECT, [template]);
  const getBody = useCallback(() => template?.body || DEFAULT_BODY, [template]);

  return { template, loading, saveTemplate, resetToDefault, getSubject, getBody, refetch: fetchTemplate };
}
