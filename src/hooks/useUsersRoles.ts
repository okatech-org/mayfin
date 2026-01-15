import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { logAuditAction } from './useAuditLogs';

interface UserWithRole {
  user_id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'charge_affaires' | null;
  role_id: string | null;
}

// Fetch all users with their roles (admin only)
// Includes audit logging for PII access compliance (emails from auth.users)
export function useUsersWithRoles() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_roles');
      
      if (error) {
        console.error('Error fetching users with roles:', error);
        throw error;
      }
      
      // Audit log: Admin accessed user list with emails (PII from auth.users)
      if (user?.id && data && data.length > 0) {
        await logAuditAction(
          user.id,
          'ADMIN_LIST_USERS_WITH_EMAILS',
          'admin_access',
          undefined,
          undefined,
          undefined,
          { users_count: data.length, accessed_auth_emails: true }
        );
      }
      
      return data as UserWithRole[];
    },
  });
}

// Update user role with comprehensive audit logging
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ userId, newRole, previousRole }: { userId: string; newRole: 'admin' | 'charge_affaires'; previousRole?: string }) => {
      const { data, error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole,
      });
      
      if (error) {
        // Audit log: Failed role change attempt
        if (user?.id) {
          await logAuditAction(
            user.id,
            'ADMIN_ROLE_CHANGE_FAILED',
            'user_role',
            undefined,
            userId,
            { role: previousRole },
            { role: newRole, error: error.message }
          );
        }
        console.error('Error updating user role:', error);
        throw error;
      }
      
      // Audit log: Successful role change
      if (user?.id) {
        await logAuditAction(
          user.id,
          'ADMIN_ROLE_CHANGED',
          'user_role',
          undefined,
          userId,
          { role: previousRole || 'unknown' },
          { role: newRole }
        );
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Rôle mis à jour avec succès');
    },
    onError: (error: Error) => {
      if (error.message.includes('cannot remove your own admin role')) {
        toast.error('Vous ne pouvez pas retirer votre propre rôle admin');
      } else if (error.message.includes('Only admins')) {
        toast.error('Seuls les administrateurs peuvent modifier les rôles');
      } else {
        toast.error('Erreur lors de la mise à jour du rôle');
      }
    },
  });
}
