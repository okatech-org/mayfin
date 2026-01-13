import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { AnalysisResult } from './useDocumentAnalysis';

export interface AnalyseHistoryEntry {
    id: string;
    dossier_id: string | null;
    user_id: string;
    created_at: string;
    extracted_data: Record<string, unknown>;
    score_global: number;
    score_solvabilite: number | null;
    score_rentabilite: number | null;
    score_structure: number | null;
    score_activite: number | null;
    recommandation: string | null;
    seuil_accordable: number | null;
    analyse_sectorielle: Record<string, unknown> | null;
    synthese_narrative: Record<string, unknown> | null;
    models_used: string[] | null;
    source_files: string[] | null;
    confidence_extraction: number | null;
    version: number;
    notes: string | null;
}

export interface ScoreComparison {
    current: AnalyseHistoryEntry;
    previous: AnalyseHistoryEntry | null;
    changes: {
        global: number;
        solvabilite: number;
        rentabilite: number;
        structure: number;
        activite: number;
    } | null;
}

export function useAnalyseHistory(dossierId?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch history for a specific dossier or all user's history
    const { data: history, isLoading, error } = useQuery({
        queryKey: ['analyse-history', dossierId, user?.id],
        queryFn: async (): Promise<AnalyseHistoryEntry[]> => {
            if (!user?.id) return [];

            let query = supabase
                .from('analyse_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (dossierId) {
                query = query.eq('dossier_id', dossierId);
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;
            return (data || []) as AnalyseHistoryEntry[];
        },
        enabled: !!user?.id
    });

    // Save analysis to history
    const saveToHistory = useMutation({
        mutationFn: async ({
            analysisResult,
            dossierId,
            sourceFiles,
            notes
        }: {
            analysisResult: AnalysisResult;
            dossierId?: string;
            sourceFiles?: string[];
            notes?: string;
        }) => {
            if (!user?.id) throw new Error('Non authentifié');
            if (!analysisResult.data || !analysisResult.score) {
                throw new Error('Données d\'analyse incomplètes');
            }

            // Get next version number
            let version = 1;
            if (dossierId) {
                const { data: existingVersions } = await supabase
                    .from('analyse_history')
                    .select('version')
                    .eq('dossier_id', dossierId)
                    .order('version', { ascending: false })
                    .limit(1);

                if (existingVersions && existingVersions.length > 0) {
                    version = (existingVersions[0].version || 0) + 1;
                }
            }

            const insertData = {
                user_id: user.id,
                dossier_id: dossierId || null,
                extracted_data: analysisResult.data as unknown as Record<string, unknown>,
                score_global: analysisResult.score.global,
                score_solvabilite: analysisResult.score.details.solvabilite,
                score_rentabilite: analysisResult.score.details.rentabilite,
                score_structure: analysisResult.score.details.structure,
                score_activite: analysisResult.score.details.activite,
                recommandation: analysisResult.recommandation,
                seuil_accordable: analysisResult.seuilAccordable,
                analyse_sectorielle: analysisResult.analyseSectorielle as unknown as Record<string, unknown> || null,
                synthese_narrative: analysisResult.syntheseNarrative as unknown as Record<string, unknown> || null,
                models_used: analysisResult.modelsUsed || [],
                source_files: sourceFiles || [],
                confidence_extraction: analysisResult.data.confianceExtraction,
                version,
                notes
            };

            const { data, error } = await supabase
                .from('analyse_history')
                .insert(insertData as never)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analyse-history'] });
            toast.success('Analyse sauvegardée dans l\'historique');
        },
        onError: (error) => {
            console.error('Erreur sauvegarde historique:', error);
            toast.error('Erreur lors de la sauvegarde');
        }
    });

    // Delete from history
    const deleteFromHistory = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('analyse_history')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analyse-history'] });
            toast.success('Entrée supprimée de l\'historique');
        },
        onError: (error) => {
            console.error('Erreur suppression:', error);
            toast.error('Erreur lors de la suppression');
        }
    });

    // Compare two analyses
    const compareAnalyses = useCallback((
        current: AnalyseHistoryEntry,
        previous: AnalyseHistoryEntry | null
    ): ScoreComparison => {
        if (!previous) {
            return { current, previous: null, changes: null };
        }

        return {
            current,
            previous,
            changes: {
                global: current.score_global - previous.score_global,
                solvabilite: (current.score_solvabilite || 0) - (previous.score_solvabilite || 0),
                rentabilite: (current.score_rentabilite || 0) - (previous.score_rentabilite || 0),
                structure: (current.score_structure || 0) - (previous.score_structure || 0),
                activite: (current.score_activite || 0) - (previous.score_activite || 0)
            }
        };
    }, []);

    // Get comparison for latest two entries
    const getLatestComparison = useCallback((): ScoreComparison | null => {
        if (!history || history.length === 0) return null;

        const current = history[0];
        const previous = history.length > 1 ? history[1] : null;

        return compareAnalyses(current, previous);
    }, [history, compareAnalyses]);

    return {
        history,
        isLoading,
        error,
        saveToHistory: saveToHistory.mutateAsync,
        isSaving: saveToHistory.isPending,
        deleteFromHistory: deleteFromHistory.mutateAsync,
        isDeleting: deleteFromHistory.isPending,
        compareAnalyses,
        getLatestComparison
    };
}
