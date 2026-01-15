import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logAuditAction } from './useAuditLogs';

interface UserWithProfile {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    role: string;
    created_at: string;
}

interface AdminStats {
    totalUsers: number;
    adminCount: number;
    chargeAffairesCount: number;
    totalDossiers: number;
    recentUsers: Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
    }>;
    dossiersByStatus: Array<{
        status: string;
        count: number;
    }>;
}

// Fetch all users with their profiles and roles (admin only)
// Includes audit logging for PII access compliance
export function useAdminUsers() {
    const { user } = useAuth();
    
    return useQuery({
        queryKey: ['admin_users'],
        queryFn: async (): Promise<UserWithProfile[]> => {
            // Fetch profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            // Fetch roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) throw rolesError;

            // Audit log: Admin accessed user list with emails (PII)
            if (user?.id && profiles && profiles.length > 0) {
                await logAuditAction(
                    user.id,
                    'ADMIN_LIST_USERS',
                    'admin_access',
                    undefined,
                    undefined,
                    undefined,
                    { users_count: profiles.length, accessed_pii: true }
                );
            }

            // Create a map of user_id to role
            const rolesMap = new Map(
                roles?.map((r) => [r.user_id, r.role]) ?? []
            );

            // Combine profiles with roles
            return (profiles ?? []).map((profile) => ({
                id: profile.id,
                user_id: profile.user_id,
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email ?? '',
                phone: profile.phone,
                role: rolesMap.get(profile.user_id) ?? 'charge_affaires',
                created_at: profile.created_at,
            }));
        },
    });
}

// Fetch admin dashboard stats
export function useAdminStats() {
    return useQuery({
        queryKey: ['admin_stats'],
        queryFn: async (): Promise<AdminStats> => {
            // Fetch profiles count
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, created_at')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            // Fetch roles count
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('role');

            if (rolesError) throw rolesError;

            // Fetch dossiers count
            const { data: dossiers, error: dossiersError } = await supabase
                .from('dossiers')
                .select('id, status');

            if (dossiersError) throw dossiersError;

            // Calculate stats
            const adminCount = roles?.filter((r) => r.role === 'admin').length ?? 0;
            const chargeAffairesCount = roles?.filter((r) => r.role === 'charge_affaires').length ?? 0;

            // Group dossiers by status
            const statusCounts = new Map<string, number>();
            dossiers?.forEach((d) => {
                const count = statusCounts.get(d.status) ?? 0;
                statusCounts.set(d.status, count + 1);
            });

            const dossiersByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
                status,
                count,
            }));

            return {
                totalUsers: profiles?.length ?? 0,
                adminCount,
                chargeAffairesCount,
                totalDossiers: dossiers?.length ?? 0,
                recentUsers: (profiles ?? []).slice(0, 5).map((p) => ({
                    id: p.id,
                    first_name: p.first_name,
                    last_name: p.last_name,
                    email: p.email ?? '',
                })),
                dossiersByStatus,
            };
        },
    });
}

// Update user role - Uses secure RPC function with validation
// Includes comprehensive audit logging for security compliance
export function useUpdateUserRole() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ userId, role, previousRole }: { userId: string; role: 'admin' | 'charge_affaires'; previousRole?: string }) => {
            // Use the secure RPC function instead of direct table manipulation
            // This ensures:
            // 1. Admin validation is done server-side
            // 2. Self-demotion protection (admin can't remove own admin role)
            // 3. Atomic transaction
            const { data, error } = await supabase.rpc('update_user_role', {
                target_user_id: userId,
                new_role: role,
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
                        { role, error: error.message }
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
                    { role }
                );
            }

            return { userId, role };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_users'] });
            queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
            queryClient.invalidateQueries({ queryKey: ['user_role'] });
            queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
        },
    });
}
