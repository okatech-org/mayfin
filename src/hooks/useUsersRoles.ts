import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserWithRole {
  user_id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'charge_affaires' | null;
  role_id: string | null;
}

export function useUsersWithRoles() {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_roles');
      
      if (error) {
        console.error('Error fetching users with roles:', error);
        throw error;
      }
      
      return data as UserWithRole[];
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'charge_affaires' }) => {
      const { data, error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole,
      });
      
      if (error) {
        console.error('Error updating user role:', error);
        throw error;
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
