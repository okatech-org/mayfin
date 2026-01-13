import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { SectionConfig } from '@/components/smart-import/DocumentPreviewModal';

export interface ReportHistoryEntry {
    id: string;
    user_id: string;
    dossier_id: string | null;
    analyse_id: string | null;
    report_type: 'pdf' | 'word';
    file_name: string;
    sections_config: SectionConfig[];
    generated_at: string;
    raison_sociale: string | null;
    siren: string | null;
    score_global: number | null;
}

interface CreateReportHistoryParams {
    dossier_id?: string | null;
    analyse_id?: string | null;
    report_type: 'pdf' | 'word';
    file_name: string;
    sections_config: SectionConfig[];
    raison_sociale?: string | null;
    siren?: string | null;
    score_global?: number | null;
}

export function useReportsHistory() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: reports, isLoading, refetch } = useQuery({
        queryKey: ['reports-history', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('reports_history')
                .select('*')
                .eq('user_id', user.id)
                .order('generated_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching reports history:', error);
                throw error;
            }

            return (data || []).map(item => ({
                ...item,
                sections_config: (item.sections_config as unknown as SectionConfig[]) || []
            })) as ReportHistoryEntry[];
        },
        enabled: !!user?.id
    });

    const createMutation = useMutation({
        mutationFn: async (params: CreateReportHistoryParams) => {
            if (!user?.id) throw new Error('Non authentifié');

            const { error, data } = await supabase
                .from('reports_history')
                .insert({
                    user_id: user.id,
                    dossier_id: params.dossier_id || null,
                    analyse_id: params.analyse_id || null,
                    report_type: params.report_type,
                    file_name: params.file_name,
                    sections_config: JSON.parse(JSON.stringify(params.sections_config)),
                    raison_sociale: params.raison_sociale || null,
                    siren: params.siren || null,
                    score_global: params.score_global || null
                } as never)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports-history', user?.id] });
        },
        onError: (error) => {
            console.error('Error creating report history:', error);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (reportId: string) => {
            if (!user?.id) throw new Error('Non authentifié');

            const { error } = await supabase
                .from('reports_history')
                .delete()
                .eq('id', reportId)
                .eq('user_id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports-history', user?.id] });
            toast.success('Rapport supprimé de l\'historique');
        },
        onError: (error) => {
            console.error('Error deleting report:', error);
            toast.error('Erreur lors de la suppression');
        }
    });

    return {
        reports: reports || [],
        isLoading,
        refetch,
        createReportEntry: createMutation.mutateAsync,
        deleteReport: deleteMutation.mutate,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending
    };
}
