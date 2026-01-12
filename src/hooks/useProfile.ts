import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  position: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  position?: string;
}

// Fetch current user's profile
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      // Cast to Profile - date_of_birth and position may not exist yet in DB
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });
}

// Update current user's profile
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            ...data,
          });

        if (error) throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}
