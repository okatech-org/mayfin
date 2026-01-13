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
    totalActif?: number;
    totalPassif?: number;
    creancesClients?: number;
    dettesFournisseurs?: number;
    stocks?: number;
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

export interface ScoreJustifications {
    solvabilite: string;
    rentabilite: string;
    structure: string;
    activite: string;
}

export interface AnalyseSectorielle {
    contexteMarche: string;
    risquesSecteur: string[];
    opportunites: string[];
    benchmarkConcurrents: string;
    sources: string[];
}

export interface SyntheseNarrative {
    resumeExecutif: string;
    pointsForts: string[];
    pointsVigilance: string[];
    recommandationsConditions: string[];
    conclusionArgumentee: string;
}

export interface BesoinAnalyse {
    typeInvestissement: string;
    categorieInvestissement: 'vehicule' | 'materiel' | 'immobilier' | 'bfr' | 'informatique' | 'autre';
    apportClient: number;
    tauxApport: number;
    montantFinance: number;
    mensualiteEstimee: number;
    capaciteRemboursement: number;
    adequationBesoin: number;
    justificationAdequation: string;
    produitRecommande: {
        nom: string;
        type: string;
        avantages: string[];
        conditions: string[];
        alternative?: {
            nom: string;
            type: string;
            raison: string;
        };
    };
    alertes: string[];
    recommandationsStructuration: string[];
}

export interface AnalysisResult {
    success: boolean;
    data?: ExtractedData;
    score?: {
        global: number;
        details: ScoreDetails;
        justifications?: ScoreJustifications;
    };
    recommandation?: 'FAVORABLE' | 'RESERVES' | 'DEFAVORABLE';
    seuilAccordable?: number;
    besoinAnalyse?: BesoinAnalyse;
    analyseSectorielle?: AnalyseSectorielle;
    syntheseNarrative?: SyntheseNarrative;
    modelsUsed?: string[];
    erreur?: string;
}

// Generate variable demo data based on file characteristics and user input
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

    // Generate a semi-random seed from file characteristics for variability
    const totalFileSize = files.reduce((acc, f) => acc + f.size, 0);
    const fileNameHash = files.reduce((acc, f) => acc + f.name.charCodeAt(0) + f.name.length, 0);
    const seed = (totalFileSize + fileNameHash + Date.now()) % 1000;

    // Helper for random variation
    const vary = (base: number, variance: number) =>
        Math.round(base + (((seed + base) % 100) / 100 - 0.5) * variance * 2);

    // Company names pool
    const companyNames = [
        'TECH SOLUTIONS FRANCE',
        'DIGITAL SERVICES PRO',
        'INNOVATION CONSULTING',
        'GREEN ENERGY SYSTEMS',
        'SMART LOGISTICS SAS',
        'PREMIUM DISTRIBUTION',
        'NEXUS TECHNOLOGIES',
        'ALPHA CONSULTING GROUP',
        'MERIDIAN SERVICES',
        'ATLANTIC SOLUTIONS'
    ];
    const formeJuridiques = ['SARL', 'SAS', 'SA', 'EURL', 'SNC'];
    const secteurs = [
        'Programmation informatique',
        'Conseil en gestion',
        'Commerce de gros',
        'Services aux entreprises',
        'Restauration',
        'Transport routier',
        'Construction',
        'Immobilier'
    ];
    const noms = ['MARTIN', 'BERNARD', 'DUBOIS', 'THOMAS', 'ROBERT', 'PETIT', 'DURAND', 'LEROY', 'MOREAU', 'SIMON'];
    const prenoms = ['Pierre', 'Jean', 'Marie', 'Sophie', 'Nicolas', 'Isabelle', 'Laurent', 'Nathalie', 'François', 'Céline'];

    // Extract SIREN from SIRET if provided, otherwise generate one based on seed
    const siret = options?.siret || `${String(seed * 100000).padStart(9, '0')}${String(seed % 10000).padStart(5, '0')}`;
    const siren = siret.length >= 9 ? siret.substring(0, 9) : String(seed * 100000).padStart(9, '0');

    // Generate realistic company data based on seed
    const companyIndex = seed % companyNames.length;
    const formeIndex = seed % formeJuridiques.length;
    const secteurIndex = (seed + fileNames.length) % secteurs.length;

    const entreprise: ExtractedEntreprise = {
        siren,
        siret,
        raisonSociale: companyNames[companyIndex],
        formeJuridique: formeJuridiques[formeIndex],
        dateCreation: `20${String(15 + (seed % 8)).padStart(2, '0')}-${String(1 + (seed % 12)).padStart(2, '0')}-${String(1 + (seed % 28)).padStart(2, '0')}`,
        codeNaf: `${String(seed % 99).padStart(2, '0')}${String.fromCharCode(65 + (seed % 26))}`,
        secteurActivite: secteurs[secteurIndex],
        adresseSiege: `${vary(50, 100)} ${['rue', 'avenue', 'boulevard'][seed % 3]} ${['de la République', 'Victor Hugo', 'du Commerce', 'des Lilas'][seed % 4]}, ${String(75000 + (seed % 95) * 1000)}`,
        nbSalaries: vary(15, 30),
    };

    const nomIndex = seed % noms.length;
    const prenomIndex = (seed + files.length) % prenoms.length;

    const dirigeant: ExtractedDirigeant = {
        nom: noms[nomIndex],
        prenom: prenoms[prenomIndex],
        fonction: ['Gérant', 'Président', 'Directeur Général'][seed % 3],
        dateNaissance: `19${String(60 + (seed % 35)).padStart(2, '0')}-${String(1 + (seed % 12)).padStart(2, '0')}-${String(1 + (seed % 28)).padStart(2, '0')}`,
        telephone: `06 ${String((seed * 17) % 100).padStart(2, '0')} ${String((seed * 23) % 100).padStart(2, '0')} ${String((seed * 31) % 100).padStart(2, '0')} ${String((seed * 41) % 100).padStart(2, '0')}`,
        email: `${prenoms[prenomIndex].toLowerCase()}.${noms[nomIndex].toLowerCase()}@${companyNames[companyIndex].toLowerCase().replace(/ /g, '-').substring(0, 15)}.fr`,
    };

    // Generate 3 years of financial data with variation
    const currentYear = new Date().getFullYear();
    const baseCA = vary(800000, 700000);
    const growth = 0.05 + ((seed % 20) / 100);

    const finances: ExtractedFinanceYear[] = [
        {
            annee: currentYear - 2,
            chiffreAffaires: Math.round(baseCA),
            resultatNet: Math.round(baseCA * (0.04 + (seed % 8) / 100)),
            ebitda: Math.round(baseCA * (0.08 + (seed % 6) / 100)),
            capitauxPropres: vary(200000, 150000),
            dettesFinancieres: vary(100000, 80000),
            tresorerie: vary(50000, 40000),
        },
        {
            annee: currentYear - 1,
            chiffreAffaires: Math.round(baseCA * (1 + growth)),
            resultatNet: Math.round(baseCA * (1 + growth) * (0.05 + (seed % 7) / 100)),
            ebitda: Math.round(baseCA * (1 + growth) * (0.09 + (seed % 5) / 100)),
            capitauxPropres: vary(250000, 180000),
            dettesFinancieres: vary(85000, 60000),
            tresorerie: vary(65000, 50000),
        },
        {
            annee: currentYear,
            chiffreAffaires: Math.round(baseCA * (1 + growth) * (1 + growth)),
            resultatNet: Math.round(baseCA * (1 + growth) * (1 + growth) * (0.06 + (seed % 6) / 100)),
            ebitda: Math.round(baseCA * (1 + growth) * (1 + growth) * (0.10 + (seed % 5) / 100)),
            capitauxPropres: vary(320000, 220000),
            dettesFinancieres: vary(70000, 50000),
            tresorerie: vary(80000, 60000),
        },
    ];

    const montantDemande = options?.montantDemande || vary(150000, 100000);
    const financement: ExtractedFinancement = {
        montantDemande,
        objetFinancement: [
            'Acquisition de matériel informatique et équipements',
            'Développement et expansion commerciale',
            'Modernisation des équipements de production',
            'Financement du besoin en fonds de roulement',
            'Investissement immobilier professionnel'
        ][seed % 5],
        dureeEnMois: [36, 48, 60, 72, 84][seed % 5],
    };

    // Calculate score based on financial data
    const dernierExercice = finances[finances.length - 1];
    const details: ScoreDetails = {
        solvabilite: vary(70, 25),
        rentabilite: vary(68, 25),
        structure: vary(65, 25),
        activite: vary(75, 25),
    };

    // Adjust scores based on calculated ratios
    if (dernierExercice.capitauxPropres && dernierExercice.dettesFinancieres) {
        const ratio = dernierExercice.capitauxPropres /
            (dernierExercice.capitauxPropres + dernierExercice.dettesFinancieres);
        if (ratio > 0.5) details.solvabilite = Math.min(95, details.solvabilite + 15);
        else if (ratio < 0.3) details.solvabilite = Math.max(30, details.solvabilite - 15);
    }

    if (dernierExercice.resultatNet && dernierExercice.chiffreAffaires) {
        const marge = dernierExercice.resultatNet / dernierExercice.chiffreAffaires;
        if (marge > 0.08) details.rentabilite = Math.min(95, details.rentabilite + 15);
        else if (marge < 0.03) details.rentabilite = Math.max(30, details.rentabilite - 15);
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
            confianceExtraction: 0.80 + ((seed % 20) / 100),
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
