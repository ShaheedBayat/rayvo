import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

function mapAttachment(row: any): Attachment {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}

export function useAttachments(entityType: string, entityId: string) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    if (!entityId) { setAttachments([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (!error && data) setAttachments(data.map(mapAttachment));
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  const uploadAttachment = useCallback(async (file: File) => {
    if (!user || !entityId) return null;
    const filePath = `${user.id}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, { upsert: false });
    if (uploadError) return null;

    const { data, error } = await supabase.from('attachments').insert({
      owner_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    }).select().single();
    if (!error && data) {
      const mapped = mapAttachment(data);
      setAttachments(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }, [user, entityType, entityId]);

  const deleteAttachment = useCallback(async (attachment: Attachment) => {
    await supabase.storage.from('attachments').remove([attachment.filePath]);
    const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
    if (!error) setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    return !error;
  }, []);

  const getPublicUrl = useCallback((filePath: string) => {
    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  return { attachments, loading, uploadAttachment, deleteAttachment, getPublicUrl, refetch: fetchAttachments };
}
