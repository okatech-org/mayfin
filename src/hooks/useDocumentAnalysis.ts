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

// Generate realistic demo data based on file names and user input
function generateDemoData(
    files: File[],
    options?: { siret?: string; montantDemande?: number }
): AnalysisResult {
    const fileNames = files.map(f => f.name.toLowerCase());
    const documentsDetectes: string[] = [];

    // Detect document types from file names
    if (fileNames.some(f => f.includes('kbis') || f.includes('rcs'))) {
        documentsDetectes.push('Extrait Kbis');
    }
    if (fileNames.some(f => f.includes('bilan'))) {
        documentsDetectes.push('Bilan comptable');
    }
    if (fileNames.some(f => f.includes('liasse') || f.includes('2050'))) {
        documentsDetectes.push('Liasse fiscale');
    }
    if (fileNames.some(f => f.includes('statut'))) {
        documentsDetectes.push('Statuts');
    }
    if (fileNames.some(f => f.includes('cni') || f.includes('identite') || f.includes('passeport'))) {
        documentsDetectes.push("Pièce d'identité");
    }
    if (documentsDetectes.length === 0) {
        documentsDetectes.push('Document PDF');
    }

    // Extract SIREN from SIRET if provided
    const siret = options?.siret || '12345678901234';
    const siren = siret.length >= 9 ? siret.substring(0, 9) : '123456789';

    // Generate realistic company data
    const entreprise: ExtractedEntreprise = {
        siren,
        siret,
        raisonSociale: 'SARL DEMO ENTREPRISE',
        formeJuridique: 'SARL',
        dateCreation: '2019-03-15',
        codeNaf: '6201Z',
        secteurActivite: 'Programmation informatique',
        adresseSiege: '123 Avenue des Champs-Élysées, 75008 Paris',
        nbSalaries: 12,
    };

    const dirigeant: ExtractedDirigeant = {
        nom: 'DUPONT',
        prenom: 'Jean-Pierre',
        fonction: 'Gérant',
        dateNaissance: '1975-06-20',
        telephone: '06 12 34 56 78',
        email: 'jp.dupont@demo-entreprise.fr',
    };

    // Generate 3 years of financial data
    const currentYear = new Date().getFullYear();
    const finances: ExtractedFinanceYear[] = [
        {
            annee: currentYear - 2,
            chiffreAffaires: 850000,
            resultatNet: 45000,
            ebitda: 78000,
            capitauxPropres: 180000,
            dettesFinancieres: 95000,
            tresorerie: 42000,
        },
        {
            annee: currentYear - 1,
            chiffreAffaires: 920000,
            resultatNet: 62000,
            ebitda: 95000,
            capitauxPropres: 242000,
            dettesFinancieres: 80000,
            tresorerie: 58000,
        },
        {
            annee: currentYear,
            chiffreAffaires: 1050000,
            resultatNet: 78000,
            ebitda: 115000,
            capitauxPropres: 320000,
            dettesFinancieres: 65000,
            tresorerie: 72000,
        },
    ];

    const montantDemande = options?.montantDemande || 150000;
    const financement: ExtractedFinancement = {
        montantDemande,
        objetFinancement: 'Acquisition de matériel informatique et équipements',
        dureeEnMois: 48,
    };

    // Calculate score based on financial data
    const dernierExercice = finances[finances.length - 1];
    const details: ScoreDetails = {
        solvabilite: 75,
        rentabilite: 72,
        structure: 68,
        activite: 82,
    };

    // Adjust solvabilite based on capitaux propres ratio
    if (dernierExercice.capitauxPropres && dernierExercice.dettesFinancieres) {
        const ratio = dernierExercice.capitauxPropres /
            (dernierExercice.capitauxPropres + dernierExercice.dettesFinancieres);
        if (ratio > 0.5) details.solvabilite = 88;
        else if (ratio > 0.3) details.solvabilite = 72;
    }

    // Adjust rentabilite based on margin
    if (dernierExercice.resultatNet && dernierExercice.chiffreAffaires) {
        const marge = dernierExercice.resultatNet / dernierExercice.chiffreAffaires;
        if (marge > 0.08) details.rentabilite = 85;
        else if (marge > 0.05) details.rentabilite = 70;
    }

    // Calculate global score
    const global = Math.round(
        details.solvabilite * 0.30 +
        details.rentabilite * 0.30 +
        details.structure * 0.20 +
        details.activite * 0.20
    );

    // Determine recommendation
    let recommandation: 'FAVORABLE' | 'RESERVES' | 'DEFAVORABLE' = 'RESERVES';
    if (global >= 70) recommandation = 'FAVORABLE';
    else if (global < 45) recommandation = 'DEFAVORABLE';

    // Calculate threshold based on EBITDA
    const seuilAccordable = Math.round((dernierExercice.ebitda || 0) * 3);

    return {
        success: true,
        data: {
            entreprise,
            dirigeant,
            finances: { annees: finances },
            financement,
            documentsDetectes,
            confianceExtraction: 0.87,
        },
        score: { global, details },
        recommandation,
        seuilAccordable,
    };
}

export function useDocumentAnalysis() {
    const [step, setStep] = useState<AnalysisStep>('idle');
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);

    const reset = useCallback(() => {
        setStep('idle');
        setProgress(0);
        setResult(null);
        setError(null);
        setIsDemoMode(false);
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

            let analysisResult: AnalysisResult;
            let useDemoMode = false;

            try {
                // Try calling the Edge Function
                const { data, error: fnError } = await supabase.functions.invoke('analyze-documents', {
                    body: formData,
                });

                if (fnError) {
                    throw new Error(fnError.message);
                }

                analysisResult = data as AnalysisResult;
            } catch (edgeFnError) {
                // Fallback to demo mode if Edge Function is not available
                console.warn('[SmartImport] Edge Function not available, using demo mode:', edgeFnError);
                useDemoMode = true;
                setIsDemoMode(true);

                // Simulate network delay for realistic UX
                await new Promise(resolve => setTimeout(resolve, 800));
                analysisResult = generateDemoData(files, options);

                toast.info('Mode démonstration activé', {
                    description: 'L\'analyse IA simulée est utilisée car le service n\'est pas disponible.',
                    duration: 5000,
                });
            }

            setStep('extracting');
            setProgress(50);

            // Simulate step progression for UX
            await new Promise(resolve => setTimeout(resolve, useDemoMode ? 400 : 500));
            setStep('validating');
            setProgress(70);

            await new Promise(resolve => setTimeout(resolve, useDemoMode ? 400 : 500));
            setStep('scoring');
            setProgress(90);

            await new Promise(resolve => setTimeout(resolve, useDemoMode ? 300 : 300));

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
        isDemoMode,
        isAnalyzing: step !== 'idle' && step !== 'complete' && step !== 'error',
        analyzeDocuments,
        reset,
    };
}
