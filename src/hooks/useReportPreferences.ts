import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { SectionConfig } from '@/components/smart-import/DocumentPreviewModal';

interface ReportSectionPreferences {
    id: string;
    user_id: string;
    sections_config: SectionConfig[];
    created_at: string;
    updated_at: string;
}

export function useReportPreferences() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['report-preferences', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('report_section_preferences')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching preferences:', error);
                throw error;
            }

            if (data) {
                return {
                    ...data,
                    sections_config: data.sections_config as unknown as SectionConfig[]
                } as ReportSectionPreferences;
            }

            return null;
        },
        enabled: !!user?.id
    });

    const saveMutation = useMutation({
        mutationFn: async (sectionsConfig: SectionConfig[]) => {
            if (!user?.id) throw new Error('Non authentifié');

            // Use upsert to handle both insert and update
            const { error } = await supabase
                .from('report_section_preferences')
                .upsert({
                    user_id: user.id,
                    sections_config: JSON.parse(JSON.stringify(sectionsConfig))
                } as never, { onConflict: 'user_id' });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report-preferences', user?.id] });
            toast.success('Préférences sauvegardées');
        },
        onError: (error) => {
            console.error('Error saving preferences:', error);
            toast.error('Erreur lors de la sauvegarde des préférences');
        }
    });

    return {
        preferences,
        isLoading,
        savedSections: preferences?.sections_config || null,
        savePreferences: saveMutation.mutate,
        isSaving: saveMutation.isPending
    };
}
