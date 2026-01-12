import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface AuditLogRow {
  id: string;
  user_id: string;
  dossier_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs(dossierId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['audit_logs', dossierId],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dossierId) {
        query = query.eq('dossier_id', dossierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogRow[];
    },
    enabled: !!user,
  });
}

export function useCreateAuditLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (log: {
      dossier_id?: string;
      action: string;
      entity_type: string;
      entity_id?: string;
      old_values?: Record<string, unknown>;
      new_values?: Record<string, unknown>;
    }) => {
      const insertData = {
        user_id: user!.id,
        dossier_id: log.dossier_id || null,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id || null,
        old_values: (log.old_values || null) as Json,
        new_values: (log.new_values || null) as Json,
        user_agent: navigator.userAgent,
      };

      const { data, error } = await supabase
        .from('audit_logs')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as AuditLogRow;
    },
    onSuccess: (data: AuditLogRow) => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      if (data?.dossier_id) {
        queryClient.invalidateQueries({ queryKey: ['audit_logs', data.dossier_id] });
      }
    },
  });
}

// Helper function to log actions
export async function logAuditAction(
  userId: string,
  action: string,
  entityType: string,
  dossierId?: string,
  entityId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
) {
  const insertData = {
    user_id: userId,
    dossier_id: dossierId || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    old_values: (oldValues || null) as Json,
    new_values: (newValues || null) as Json,
    user_agent: navigator.userAgent,
  };

  const { error } = await supabase
    .from('audit_logs')
    .insert(insertData);

  if (error) {
    console.error('Failed to log audit action:', error);
  }
}
