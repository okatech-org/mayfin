import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AnalysisStep =
    | 'idle'
    | 'uploading'
    | 'analyzing'
    | 'extracting'
    | 'validating'
    | 'scoring'
    | 'complete'
    | 'error';

export interface ExtractedEntreprise {
    siren?: string;
    siret?: string;
    raisonSociale?: string;
    formeJuridique?: string;
    dateCreation?: string;
    codeNaf?: string;
    secteurActivite?: string;
    adresseSiege?: string;
    nbSalaries?: number;
}

export interface ExtractedDirigeant {
    nom?: string;
    prenom?: string;
    fonction?: string;
    dateNaissance?: string;
    telephone?: string;
    email?: string;
}

export interface ExtractedFinanceYear {
    annee: number;
    chiffreAffaires?: number;
    resultatNet?: number;
    ebitda?: number;
    capitauxPropres?: number;
    dettesFinancieres?: number;
    tresorerie?: number;
}

export interface ExtractedFinancement {
    montantDemande?: number;
    objetFinancement?: string;
    dureeEnMois?: number;
}

export interface ExtractedData {
    entreprise: ExtractedEntreprise;
    dirigeant: ExtractedDirigeant;
    finances: { annees: ExtractedFinanceYear[] };
    financement: ExtractedFinancement;
    documentsDetectes: string[];
    confianceExtraction: number;
}

export interface ScoreDetails {
    solvabilite: number;
    rentabilite: number;
    structure: number;
    activite: number;
}

export interface AnalysisResult {
    success: boolean;
    data?: ExtractedData;
    score?: {
        global: number;
        details: ScoreDetails;
    };
    recommandation?: 'FAVORABLE' | 'RESERVES' | 'DEFAVORABLE';
    seuilAccordable?: number;
    erreur?: string;
}

export function useDocumentAnalysis() {
    const [step, setStep] = useState<AnalysisStep>('idle');
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setStep('idle');
        setProgress(0);
        setResult(null);
        setError(null);
    }, []);

    const analyzeDocuments = useCallback(async (
        files: File[],
        options?: { siret?: string; montantDemande?: number }
    ) => {
        try {
            reset();
            setStep('uploading');
            setProgress(10);

            // Build form data with files
            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file);
            }
            if (options?.siret) {
                formData.append('siret', options.siret);
            }
            if (options?.montantDemande) {
                formData.append('montantDemande', options.montantDemande.toString());
            }

            setStep('analyzing');
            setProgress(30);

            // Call the Edge Function
            const { data, error: fnError } = await supabase.functions.invoke('analyze-documents', {
                body: formData,
            });

            if (fnError) {
                throw new Error(fnError.message);
            }

            setStep('extracting');
            setProgress(50);

            // Simulate step progression for UX
            await new Promise(resolve => setTimeout(resolve, 500));
            setStep('validating');
            setProgress(70);

            await new Promise(resolve => setTimeout(resolve, 500));
            setStep('scoring');
            setProgress(90);

            await new Promise(resolve => setTimeout(resolve, 300));

            const analysisResult = data as AnalysisResult;

            if (!analysisResult.success) {
                throw new Error(analysisResult.erreur || 'Erreur inconnue');
            }

            setResult(analysisResult);
            setStep('complete');
            setProgress(100);
            toast.success('Analyse terminée avec succès');

            return analysisResult;

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse';
            setError(message);
            setStep('error');
            toast.error(message);
            return null;
        }
    }, [reset]);

    return {
        step,
        progress,
        result,
        error,
        isAnalyzing: step !== 'idle' && step !== 'complete' && step !== 'error',
        analyzeDocuments,
        reset,
    };
}
