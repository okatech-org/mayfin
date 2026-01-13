import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { QUESTIONS } from '@/data/questionnaire-structure';
import type { Question } from '@/types/rapport-analyse.types';

// Row type from database (snake_case)
export interface RapportAnalyseRow {
    id: string;
    dossier_id: string;
    user_id: string;
    zone_exploitation_adresse: string | null;
    zone_exploitation_code_postal: string | null;
    zone_exploitation_commune: string | null;
    detail_demande: string | null;
    commentaire_zone_exploitation: string | null;
    premiere_experience_entrepreneuriale: boolean | null;
    exigences_acces_profession: boolean | null;
    exigences_acces_commentaire: string | null;
    liens_associes: string | null;
    conjoint_role_activite: boolean | null;
    conjoint_role_detail: string | null;
    autres_infos_porteur: string | null;
    emprunteur_multi_bancarise: boolean | null;
    presence_justificatif_cession: boolean | null;
    salaries_repris: string | null;
    salaries_repris_commentaire: string | null;
    raisons_cession: string | null;
    commentaire_environnement_local: string | null;
    autres_infos_projet: string | null;
    commentaire_bilans_consolides: string | null;
    synthese_compte_resultat: string | null;
    evenements_conjoncturels: boolean | null;
    evenements_conjoncturels_detail: string | null;
    charges_previsionnelles: unknown;
    commentaire_charges_externes: string | null;
    commentaire_marge_brute: string | null;
    validation_caf_previsionnel: boolean | null;
    commentaire_evolution_fonds_propres: string | null;
    validation_caf_global: boolean | null;
    caf_couvre_annuites: boolean | null;
    beneficie_aides_etat: boolean | null;
    aides_etat_detail: unknown;
    revenus_cautions: unknown;
    endettement_cautions: unknown;
    commentaire_charges_personnels: string | null;
    commentaire_charges_externes_previsionnel: string | null;
    presence_financements_lies: boolean | null;
    financements_lies_detail: string | null;
    presentation_declic: boolean | null;
    fonds_propres_negatifs: boolean | null;
    fonds_propres_negatifs_commentaire: string | null;
    controles_indispensables_realises: boolean | null;
    synthese_collaborateur: string | null;
    synthese_motif_non_concluant: string | null;
    point_attention: string | null;
    ajout_point_texte: string | null;
    decision_finale: string | null;
    conditions_particulieres: unknown;
    statut: string;
    created_at: string;
    updated_at: string;
    finalized_at: string | null;
}

// Type assertion helper for Supabase client
// Note: After applying migration and regenerating types, remove this bypass
const supabaseAny = supabase as any;

/**
 * Fetch existing rapport for a dossier
 */
export function useRapportAnalyse(dossierId: string) {
    return useQuery({
        queryKey: ['rapport-analyse', dossierId],
        queryFn: async () => {
            const { data, error } = await supabaseAny
                .from('rapports_analyse')
                .select('*')
                .eq('dossier_id', dossierId)
                .maybeSingle();

            if (error) throw error;
            return data as RapportAnalyseRow | null;
        },
        enabled: !!dossierId
    });
}

/**
 * Create a new rapport for a dossier
 */
export function useCreateRapport() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (dossierId: string) => {
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabaseAny
                .from('rapports_analyse')
                .insert({
                    dossier_id: dossierId,
                    user_id: user.id,
                    statut: 'brouillon'
                })
                .select()
                .single();

            if (error) throw error;

            return data as RapportAnalyseRow;
        },
        onSuccess: (data: RapportAnalyseRow) => {
            queryClient.invalidateQueries({ queryKey: ['rapport-analyse', data.dossier_id] });
            toast.success('Rapport créé');
        },
        onError: (error: Error) => {
            console.error('Error creating rapport:', error);
            toast.error('Erreur lors de la création du rapport');
        }
    });
}

/**
 * Update rapport (for auto-save)
 */
export function useUpdateRapport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<RapportAnalyseRow> & { id: string }) => {
            const { data: updated, error } = await supabaseAny
                .from('rapports_analyse')
                .update({
                    ...data,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated as RapportAnalyseRow;
        },
        onSuccess: (data: RapportAnalyseRow) => {
            queryClient.setQueryData(['rapport-analyse', data.dossier_id], data);
        },
        onError: (error: Error) => {
            console.error('Error updating rapport:', error);
            toast.error('Erreur lors de la sauvegarde');
        }
    });
}

/**
 * Finalize rapport (validate completeness and lock)
 */
export function useFinalizeRapport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, dossierId }: { id: string; dossierId: string }) => {
            // First fetch the current data to validate
            const { data: rapport, error: fetchError } = await supabaseAny
                .from('rapports_analyse')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Validate completeness
            const validation = validateRapport(rapport as RapportAnalyseRow);
            if (!validation.isComplete) {
                throw new Error(`Rapport incomplet: ${validation.missingQuestions.join(', ')}`);
            }

            // Update status to finalized
            const { data: updated, error } = await supabaseAny
                .from('rapports_analyse')
                .update({
                    statut: 'finalise',
                    finalized_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return updated as RapportAnalyseRow;
        },
        onSuccess: (data: RapportAnalyseRow) => {
            queryClient.invalidateQueries({ queryKey: ['rapport-analyse', data.dossier_id] });
            toast.success('Rapport finalisé avec succès');
        },
        onError: (error: Error) => {
            console.error('Error finalizing rapport:', error);
            toast.error(error.message || 'Erreur lors de la finalisation');
        }
    });
}

/**
 * Calculate completion percentage of a rapport
 */
export function calculateCompletion(rapport: RapportAnalyseRow | null): number {
    if (!rapport) return 0;

    let filled = 0;
    let total = 0;

    const checkQuestion = (question: Question, rapportData: RapportAnalyseRow) => {
        // Check if this question should be evaluated (based on dependencies)
        if (question.dependances && question.dependances.length > 0) {
            const shouldShow = question.dependances.some(dep => {
                const parentValue = rapportData[dep.questionCode as keyof RapportAnalyseRow];
                return parentValue === dep.valeurCondition;
            });
            if (!shouldShow) return; // Skip this question if dependencies not met
        }

        total++;
        const value = rapportData[question.code as keyof RapportAnalyseRow];

        if (value !== null && value !== undefined && value !== '') {
            // For text fields, check minimum length if required
            if (question.validations?.minLength && typeof value === 'string') {
                if (value.length >= question.validations.minLength) {
                    filled++;
                }
            } else {
                filled++;
            }
        }
    };

    const processQuestions = (questions: Question[]) => {
        for (const q of questions) {
            if (q.obligatoire) {
                checkQuestion(q, rapport);
            }
            if (q.sousQuestions) {
                processQuestions(q.sousQuestions);
            }
        }
    };

    processQuestions(QUESTIONS);

    return total === 0 ? 0 : Math.round((filled / total) * 100);
}

// Validation result type
export interface ValidationResult {
    isComplete: boolean;
    missingQuestions: string[];
    errors: string[];
    completion: number;
}

/**
 * Validate that rapport is complete and ready for finalization
 */
export function validateRapport(rapport: RapportAnalyseRow | null): ValidationResult {
    if (!rapport) {
        return {
            isComplete: false,
            missingQuestions: ['Aucun rapport'],
            errors: [],
            completion: 0
        };
    }

    const missingQuestions: string[] = [];
    const errors: string[] = [];

    const checkQuestion = (question: Question, rapportData: RapportAnalyseRow) => {
        // Check if this question should be evaluated (based on dependencies)
        if (question.dependances && question.dependances.length > 0) {
            const shouldShow = question.dependances.some(dep => {
                const parentValue = rapportData[dep.questionCode as keyof RapportAnalyseRow];
                return parentValue === dep.valeurCondition;
            });
            if (!shouldShow) return; // Skip this question if dependencies not met
        }

        const value = rapportData[question.code as keyof RapportAnalyseRow];

        // Check required
        if (question.obligatoire) {
            if (value === null || value === undefined || value === '') {
                missingQuestions.push(question.libelle);
                return;
            }
        }

        // Check validations on filled values
        if (value && question.validations) {
            if (question.validations.minLength && typeof value === 'string') {
                if (value.length < question.validations.minLength) {
                    errors.push(`${question.libelle} : minimum ${question.validations.minLength} caractères requis (actuellement ${value.length})`);
                }
            }
            if (question.validations.maxLength && typeof value === 'string') {
                if (value.length > question.validations.maxLength) {
                    errors.push(`${question.libelle} : maximum ${question.validations.maxLength} caractères`);
                }
            }
            if (question.validations.pattern && typeof value === 'string') {
                if (!new RegExp(question.validations.pattern).test(value)) {
                    errors.push(`${question.libelle} : format invalide`);
                }
            }
        }
    };

    const processQuestions = (questions: Question[]) => {
        for (const q of questions) {
            checkQuestion(q, rapport);
            if (q.sousQuestions) {
                processQuestions(q.sousQuestions);
            }
        }
    };

    processQuestions(QUESTIONS);

    const completion = calculateCompletion(rapport);

    return {
        isComplete: missingQuestions.length === 0 && errors.length === 0,
        missingQuestions,
        errors,
        completion
    };
}

/**
 * Get or create rapport for a dossier
 */
export function useGetOrCreateRapport(dossierId: string) {
    const { data: existingRapport, isLoading } = useRapportAnalyse(dossierId);
    const createRapport = useCreateRapport();

    const getOrCreate = async () => {
        if (existingRapport) return existingRapport;
        return await createRapport.mutateAsync(dossierId);
    };

    return {
        rapport: existingRapport,
        isLoading: isLoading || createRapport.isPending,
        getOrCreate
    };
}
