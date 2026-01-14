import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressFiles, isImageFile } from '@/lib/imageCompression';

export type AnalysisStep =
    | 'idle'
    | 'compressing'
    | 'uploading'
    | 'analyzing'
    | 'extracting'
    | 'validating'
    | 'scoring'
    | 'complete'
    | 'error';

export interface UploadProgress {
    phase: 'compressing' | 'uploading' | 'analyzing';
    current: number;
    total: number;
    fileName?: string;
    bytesUploaded?: number;
    bytesTotal?: number;
}

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

    const totalFileSize = files.reduce((acc, f) => acc + f.size, 0);
    const fileNameHash = files.reduce((acc, f) => acc + f.name.charCodeAt(0) + f.name.length, 0);
    const seed = (totalFileSize + fileNameHash + Date.now()) % 1000;

    const vary = (base: number, variance: number) =>
        Math.round(base + (((seed + base) % 100) / 100 - 0.5) * variance * 2);

    const companyNames = [
        'TECH SOLUTIONS FRANCE', 'DIGITAL SERVICES PRO', 'INNOVATION CONSULTING',
        'GREEN ENERGY SYSTEMS', 'SMART LOGISTICS SAS', 'PREMIUM DISTRIBUTION',
        'NEXUS TECHNOLOGIES', 'ALPHA CONSULTING GROUP', 'MERIDIAN SERVICES', 'ATLANTIC SOLUTIONS'
    ];
    const formeJuridiques = ['SARL', 'SAS', 'SA', 'EURL', 'SNC'];
    const secteurs = [
        'Programmation informatique', 'Conseil en gestion', 'Commerce de gros',
        'Services aux entreprises', 'Restauration', 'Transport routier', 'Construction', 'Immobilier'
    ];
    const noms = ['MARTIN', 'BERNARD', 'DUBOIS', 'THOMAS', 'ROBERT', 'PETIT', 'DURAND', 'LEROY', 'MOREAU', 'SIMON'];
    const prenoms = ['Pierre', 'Jean', 'Marie', 'Sophie', 'Nicolas', 'Isabelle', 'Laurent', 'Nathalie', 'François', 'Céline'];

    const siret = options?.siret || `${String(seed * 100000).padStart(9, '0')}${String(seed % 10000).padStart(5, '0')}`;
    const siren = siret.length >= 9 ? siret.substring(0, 9) : String(seed * 100000).padStart(9, '0');

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

    const dernierExercice = finances[finances.length - 1];
    const details: ScoreDetails = {
        solvabilite: vary(70, 25),
        rentabilite: vary(68, 25),
        structure: vary(65, 25),
        activite: vary(75, 25),
    };

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

    const global = Math.round(
        details.solvabilite * 0.30 +
        details.rentabilite * 0.30 +
        details.structure * 0.20 +
        details.activite * 0.20
    );

    let recommandation: 'FAVORABLE' | 'RESERVES' | 'DEFAVORABLE' = 'RESERVES';
    if (global >= 70) recommandation = 'FAVORABLE';
    else if (global < 45) recommandation = 'DEFAVORABLE';

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
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isCancelled, setIsCancelled] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const reset = useCallback(() => {
        setStep('idle');
        setProgress(0);
        setUploadProgress(null);
        setResult(null);
        setError(null);
        setIsDemoMode(false);
        setIsCancelled(false);
        abortControllerRef.current = null;
    }, []);

    const cancel = useCallback(() => {
        setIsCancelled(true);
        abortControllerRef.current?.abort();
        setStep('idle');
        setProgress(0);
        setUploadProgress(null);
        setError(null);
    }, []);

    const analyzeDocuments = useCallback(async (
        files: File[],
        options?: { 
            siret?: string; 
            montantDemande?: number; 
            apportClient?: number; 
            typesBien?: { type: string; montant?: number }[]; 
            contextesDossier?: string[];
            disableCompression?: boolean;
        }
    ) => {
        try {
            reset();

            // Phase 1: Compress images (if not disabled)
            const hasImages = files.some(f => isImageFile(f));
            let processedFiles = files;

            if (hasImages && !options?.disableCompression) {
                setStep('compressing');
                setProgress(5);

                const originalSize = files.reduce((acc, f) => acc + f.size, 0);

                processedFiles = await compressFiles(files, { maxSizeMB: 2, quality: 0.8 }, (current, total, fileName) => {
                    setUploadProgress({
                        phase: 'compressing',
                        current,
                        total,
                        fileName,
                    });
                    setProgress(5 + (current / total) * 10);
                });

                const compressedSize = processedFiles.reduce((acc, f) => acc + f.size, 0);
                const savings = originalSize - compressedSize;
                if (savings > 0) {
                    toast.info(`Images compressées`, {
                        description: `Taille réduite de ${(savings / 1024 / 1024).toFixed(1)} Mo`,
                        duration: 3000,
                    });
                }
            } else if (hasImages && options?.disableCompression) {
                console.log('[SmartImport] Compression désactivée par l\'utilisateur');
            }

            // Phase 2: Upload files
            setStep('uploading');
            setProgress(15);

            const totalSize = processedFiles.reduce((acc, f) => acc + f.size, 0);
            setUploadProgress({
                phase: 'uploading',
                current: 0,
                total: processedFiles.length,
                bytesTotal: totalSize,
                bytesUploaded: 0,
            });

            // Build form data with files
            const formData = new FormData();
            for (let i = 0; i < processedFiles.length; i++) {
                const file = processedFiles[i];
                formData.append('files', file);
                setUploadProgress({
                    phase: 'uploading',
                    current: i + 1,
                    total: processedFiles.length,
                    fileName: file.name,
                    bytesTotal: totalSize,
                    bytesUploaded: processedFiles.slice(0, i + 1).reduce((acc, f) => acc + f.size, 0),
                });
                setProgress(15 + ((i + 1) / processedFiles.length) * 15);
            }

            if (options?.siret) {
                formData.append('siret', options.siret);
            }
            if (options?.montantDemande) {
                formData.append('montantDemande', options.montantDemande.toString());
            }
            if (options?.apportClient) {
                formData.append('apportClient', options.apportClient.toString());
            }
            if (options?.typesBien && options.typesBien.length > 0) {
                formData.append('typesBien', JSON.stringify(options.typesBien));
            }
            if (options?.contextesDossier && options.contextesDossier.length > 0) {
                formData.append('contextesDossier', JSON.stringify(options.contextesDossier));
            }

            // Phase 3: Analyze
            setStep('analyzing');
            setProgress(35);
            setUploadProgress({
                phase: 'analyzing',
                current: 0,
                total: 4,
            });

            let analysisResult: AnalysisResult;
            let useDemoMode = false;

            try {
                const { data, error: fnError } = await supabase.functions.invoke('analyze-documents', {
                    body: formData,
                });

                if (fnError) {
                    throw new Error(fnError.message);
                }

                analysisResult = data as AnalysisResult;
            } catch (edgeFnError) {
                console.warn('[SmartImport] Edge Function not available, using demo mode:', edgeFnError);
                useDemoMode = true;
                setIsDemoMode(true);

                await new Promise(resolve => setTimeout(resolve, 800));
                analysisResult = generateDemoData(processedFiles, options);

                toast.info('Mode démonstration activé', {
                    description: 'L\'analyse IA simulée est utilisée car le service n\'est pas disponible.',
                    duration: 5000,
                });
            }

            setStep('extracting');
            setProgress(55);
            setUploadProgress({ phase: 'analyzing', current: 1, total: 4 });

            await new Promise(resolve => setTimeout(resolve, useDemoMode ? 400 : 500));
            setStep('validating');
            setProgress(70);
            setUploadProgress({ phase: 'analyzing', current: 2, total: 4 });

            await new Promise(resolve => setTimeout(resolve, useDemoMode ? 400 : 500));
            setStep('scoring');
            setProgress(85);
            setUploadProgress({ phase: 'analyzing', current: 3, total: 4 });

            await new Promise(resolve => setTimeout(resolve, useDemoMode ? 300 : 300));
            setUploadProgress({ phase: 'analyzing', current: 4, total: 4 });

            if (!analysisResult.success) {
                throw new Error(analysisResult.erreur || 'Erreur inconnue');
            }

            setResult(analysisResult);
            setStep('complete');
            setProgress(100);
            setUploadProgress(null);
            toast.success('Analyse terminée avec succès');

            return analysisResult;

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse';
            setError(message);
            setStep('error');
            setUploadProgress(null);
            toast.error(message);
            return null;
        }
    }, [reset]);

    // Load a result from history (for reload functionality)
    const loadFromHistory = useCallback((analysisResult: AnalysisResult) => {
        setResult(analysisResult);
        setStep('complete');
        setProgress(100);
        setError(null);
        setIsDemoMode(false);
    }, []);

    return {
        step,
        progress,
        uploadProgress,
        result,
        error,
        isDemoMode,
        isCancelled,
        isAnalyzing: step !== 'idle' && step !== 'complete' && step !== 'error',
        analyzeDocuments,
        reset,
        cancel,
        loadFromHistory,
    };
}
