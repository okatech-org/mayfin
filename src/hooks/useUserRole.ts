import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'charge_affaires';

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading, error } = useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.role as AppRole) ?? 'charge_affaires';
    },
    enabled: !!user?.id,
  });

  const isAdmin = role === 'admin';
  const isChargeAffaires = role === 'charge_affaires';

  return {
    role,
    isAdmin,
    isChargeAffaires,
    isLoading,
    error,
  };
}
