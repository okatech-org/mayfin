import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logAuditAction } from './useAuditLogs';
import type { Json } from '@/integrations/supabase/types';

export interface AdminAuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  user_agent: string | null;
  created_at: string;
  // Joined profile data
  admin_email?: string;
  admin_name?: string;
}

// Filter options for admin audit logs
export interface AdminAuditLogFilters {
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Hook to fetch admin-related audit logs
 * Only returns logs related to admin actions (ADMIN_* prefixed)
 */
export function useAdminAuditLogs(filters?: AdminAuditLogFilters) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin_audit_logs', filters],
    queryFn: async (): Promise<AdminAuditLog[]> => {
      // Build query for admin-related audit logs
      let query = supabase
        .from('audit_logs')
        .select('*')
        .like('action', 'ADMIN_%')
        .order('created_at', { ascending: false })
        .limit(filters?.limit ?? 100);

      // Apply date filters if provided
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      if (!logs || logs.length === 0) {
        return [];
      }

      // Get unique user IDs to fetch profile info
      const userIds = [...new Set(logs.map(log => log.user_id))];
      
      // Fetch profiles for admins who performed actions
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profiles?.map(p => [p.user_id, p]) ?? []
      );

      // Log that admin viewed audit logs (meta-audit)
      if (user?.id) {
        await logAuditAction(
          user.id,
          'ADMIN_VIEW_AUDIT_LOGS',
          'admin_access',
          undefined,
          undefined,
          undefined,
          { logs_count: logs.length, filters: filters ? JSON.stringify(filters) : null }
        );
      }

      // Combine logs with profile info
      return logs.map(log => {
        const profile = profilesMap.get(log.user_id);
        return {
          ...log,
          admin_email: profile?.email ?? undefined,
          admin_name: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : undefined,
        };
      });
    },
    enabled: !!user,
  });
}

/**
 * Get distinct admin action types for filtering
 */
export function useAdminActionTypes() {
  return useQuery({
    queryKey: ['admin_action_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action')
        .like('action', 'ADMIN_%');

      if (error) throw error;

      // Get unique action types
      const uniqueActions = [...new Set(data?.map(d => d.action) ?? [])];
      return uniqueActions.sort();
    },
  });
}
