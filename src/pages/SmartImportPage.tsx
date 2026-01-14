import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileQuestion, ArrowRight, Car, Laptop, Building, Coins, Wrench, Package, History, Settings2, ImageOff, ChevronUp, ChevronDown, Save, StickyNote, Plus, X, Wand2, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DocumentDropzone } from '@/components/smart-import/DocumentDropzone';
import { AIAnalysisProgress } from '@/components/smart-import/AIAnalysisProgress';
import { AnalysisResultCard } from '@/components/smart-import/AnalysisResultCard';
import { AnalyseHistoryPanel } from '@/components/smart-import/AnalyseHistoryPanel';
import { useDocumentAnalysis, type AnalysisResult } from '@/hooks/useDocumentAnalysis';
import { useAnalyseHistory, type AnalyseHistoryEntry } from '@/hooks/useAnalyseHistory';
import { useCreateDossier } from '@/hooks/useDossiers';
import { toast } from 'sonner';

type TypeBienCode = 'vehicule' | 'materiel' | 'immobilier' | 'informatique' | 'bfr' | 'autre';
type ContexteDossier = 'entreprise_existante' | 'creation_entreprise' | 'reprise_activite' | 'franchise';

interface TypeBienItem {
    type: TypeBienCode;
    montant?: number;
}

const TYPE_BIEN_OPTIONS: { value: TypeBienCode; label: string; icon: typeof Car }[] = [
    { value: 'vehicule', label: 'Véhicule', icon: Car },
    { value: 'materiel', label: 'Matériel / Équipement', icon: Wrench },
    { value: 'immobilier', label: 'Immobilier', icon: Building },
    { value: 'informatique', label: 'Informatique / IT', icon: Laptop },
    { value: 'bfr', label: 'BFR / Trésorerie', icon: Coins },
    { value: 'autre', label: 'Autre', icon: Package },
];

const CONTEXTE_DOSSIER_OPTIONS: { value: ContexteDossier; label: string; description: string }[] = [
    { value: 'entreprise_existante', label: 'Entreprise existante', description: 'Société déjà immatriculée' },
    { value: 'creation_entreprise', label: 'Création d\'entreprise', description: 'Projet de création' },
    { value: 'reprise_activite', label: 'Reprise d\'activité', description: 'Rachat ou transmission' },
    { value: 'franchise', label: 'Franchise', description: 'Réseau de franchise' },
];

export default function SmartImportPage() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<File[]>([]);
    const [siret, setSiret] = useState('');
    const [montantDemande, setMontantDemande] = useState('');
    const [apportClient, setApportClient] = useState('');
    const [typesBien, setTypesBien] = useState<TypeBienItem[]>([]);
    const [newTypeMontant, setNewTypeMontant] = useState<string>('');
    const [contextesDossier, setContextesDossier] = useState<ContexteDossier[]>([]);
    const [disableCompression, setDisableCompression] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [showNotesDialog, setShowNotesDialog] = useState(false);
    const [analysisNotes, setAnalysisNotes] = useState('');
    const [pendingAnalysisResult, setPendingAnalysisResult] = useState<AnalysisResult | null>(null);
    const [pendingSourceFiles, setPendingSourceFiles] = useState<string[]>([]);
    const [isPreAnalyzing, setIsPreAnalyzing] = useState(false);

    const { step, progress, uploadProgress, result, error, isAnalyzing, isDemoMode, analyzeDocuments, reset, cancel, loadFromHistory } = useDocumentAnalysis();
    const { saveToHistory, isSaving } = useAnalyseHistory();
    const createDossier = useCreateDossier();

    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) {
            toast.error('Veuillez sélectionner au moins un document');
            return;
        }

        const analysisResult = await analyzeDocuments(files, {
            siret: siret || undefined,
            montantDemande: montantDemande ? parseFloat(montantDemande) : undefined,
            apportClient: apportClient ? parseFloat(apportClient) : undefined,
            typesBien: typesBien.length > 0 ? typesBien.map(t => ({ type: t.type, montant: t.montant })) : undefined,
            contextesDossier: contextesDossier.length > 0 ? contextesDossier : undefined,
            disableCompression,
        });

        // Store result and show notes dialog for saving to history
        if (analysisResult?.success && analysisResult.data) {
            setPendingAnalysisResult(analysisResult);
            setPendingSourceFiles(files.map(f => f.name));
            setShowNotesDialog(true);
        }
    }, [files, siret, montantDemande, apportClient, typesBien, contextesDossier, disableCompression, analyzeDocuments]);

    const handleAddTypeBien = (type: TypeBienCode) => {
        if (!typesBien.some(t => t.type === type)) {
            const montant = newTypeMontant ? parseFloat(newTypeMontant) : undefined;
            setTypesBien([...typesBien, { type, montant }]);
            setNewTypeMontant('');
        }
    };

    const handleRemoveTypeBien = (type: TypeBienCode) => {
        setTypesBien(typesBien.filter(t => t.type !== type));
    };

    const handleUpdateTypeBienMontant = (type: TypeBienCode, montant: string) => {
        setTypesBien(typesBien.map(t => 
            t.type === type 
                ? { ...t, montant: montant ? parseFloat(montant) : undefined }
                : t
        ));
    };

    const handleToggleContexte = (contexte: ContexteDossier) => {
        if (contextesDossier.includes(contexte)) {
            setContextesDossier(contextesDossier.filter(c => c !== contexte));
        } else {
            setContextesDossier([...contextesDossier, contexte]);
        }
    };

    // Pre-analysis function to auto-fill form fields from documents
    const handlePreAnalyze = useCallback(async () => {
        if (files.length === 0) {
            toast.error('Veuillez d\'abord sélectionner des documents');
            return;
        }

        setIsPreAnalyzing(true);
        toast.info('Pré-analyse en cours...', { duration: 2000 });

        try {
            // Call the analysis API in a lightweight mode just to extract basic info
            const formData = new FormData();
            files.forEach((file) => {
                formData.append('files', file);
            });

            const { data: session } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            
            const response = await fetch(`${supabaseUrl}/functions/v1/analyze-documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.session?.access_token || ''}`,
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la pré-analyse');
            }

            const result = await response.json();

            if (result.success && result.data) {
                const { entreprise, financement, projet } = result.data;
                let fieldsUpdated = 0;

                // Auto-fill SIRET if found and empty
                if (entreprise?.siret && !siret) {
                    setSiret(entreprise.siret);
                    fieldsUpdated++;
                } else if (entreprise?.siren && !siret) {
                    setSiret(entreprise.siren);
                    fieldsUpdated++;
                }

                // Auto-fill montant if found and empty
                if (financement?.montantDemande && !montantDemande) {
                    setMontantDemande(String(financement.montantDemande));
                    fieldsUpdated++;
                }

                // Auto-fill apport if found and empty
                if (financement?.apportClient && !apportClient) {
                    setApportClient(String(financement.apportClient));
                    fieldsUpdated++;
                }

                // Auto-detect type d'investissement from multiple sources
                if (typesBien.length === 0) {
                    const detectedTypes: TypeBienItem[] = [];
                    const objetLower = (financement?.objetFinancement || '').toLowerCase();
                    const descriptionBienLower = (financement?.descriptionBien || '').toLowerCase();
                    const descriptionProjetFinancement = (financement?.descriptionProjet || '').toLowerCase();
                    const descriptionProjetDetails = (projet?.descriptionProjet || '').toLowerCase();
                    const contexteProjet = (projet?.contexte || '').toLowerCase();
                    const objectifs = (projet?.objectifs || []).join(' ').toLowerCase();
                    
                    // Combine all text sources for comprehensive detection
                    const combinedText = `${objetLower} ${descriptionBienLower} ${descriptionProjetFinancement} ${descriptionProjetDetails} ${contexteProjet} ${objectifs}`;
                    
                    // Detect vehicle-related keywords
                    if (/v[ée]hicule|voiture|camion|utilitaire|auto|flotte|transport|tracteur|remorque/.test(combinedText)) {
                        detectedTypes.push({ type: 'vehicule', montant: undefined });
                    }
                    
                    // Detect material/equipment keywords
                    if (/mat[ée]riel|[ée]quipement|machine|outillage|engin|chariot|grue|nacelle/.test(combinedText)) {
                        detectedTypes.push({ type: 'materiel', montant: undefined });
                    }
                    
                    // Detect real estate keywords
                    if (/immobilier|local|bureau|entrep[oô]t|b[aâ]timent|murs|locaux|terrain|commerce/.test(combinedText)) {
                        detectedTypes.push({ type: 'immobilier', montant: undefined });
                    }
                    
                    // Detect IT keywords
                    if (/informatique|ordinateur|serveur|logiciel|it|digital|num[ée]rique|technologie/.test(combinedText)) {
                        detectedTypes.push({ type: 'informatique', montant: undefined });
                    }
                    
                    // Detect BFR/treasury keywords
                    if (/bfr|tr[ée]sorerie|fonds de roulement|stock|cr[ée]ances|besoin en fonds/.test(combinedText)) {
                        detectedTypes.push({ type: 'bfr', montant: undefined });
                    }
                    
                    // Fallback to typeInvestissement if provided
                    if (detectedTypes.length === 0 && financement?.typeInvestissement) {
                        const typeMapping: Record<string, TypeBienCode> = {
                            'vehicule': 'vehicule',
                            'materiel': 'materiel',
                            'immobilier': 'immobilier',
                            'bfr': 'bfr',
                            'informatique': 'informatique',
                            'autre': 'autre'
                        };
                        const detectedType = typeMapping[financement.typeInvestissement] || 'autre';
                        detectedTypes.push({ type: detectedType, montant: financement.montantDemande });
                    }
                    
                    if (detectedTypes.length > 0) {
                        setTypesBien(detectedTypes);
                        fieldsUpdated++;
                    }
                }

                // Detect context from documents with enhanced analysis
                if (contextesDossier.length === 0) {
                    const detectedContexts: ContexteDossier[] = [];
                    const hasFinancialHistory = result.data.finances?.annees && result.data.finances.annees.length > 0;
                    const objetLower = (financement?.objetFinancement || '').toLowerCase();
                    const descriptionProjetFinancement = (financement?.descriptionProjet || '').toLowerCase();
                    const descriptionProjetDetails = (projet?.descriptionProjet || '').toLowerCase();
                    const contexteProjet = (projet?.contexte || '').toLowerCase();
                    const objectifs = (projet?.objectifs || []).join(' ').toLowerCase();
                    const raisonSocialeLower = (entreprise?.raisonSociale || '').toLowerCase();
                    
                    // Combine all text sources for comprehensive detection
                    const combinedText = `${objetLower} ${descriptionProjetFinancement} ${descriptionProjetDetails} ${contexteProjet} ${objectifs} ${raisonSocialeLower}`;
                    
                    // Detect franchise keywords
                    if (/franchise|franchis[ée]|r[ée]seau|enseigne|master franchise|concept|licence de marque/.test(combinedText)) {
                        detectedContexts.push('franchise');
                    }
                    
                    // Detect creation keywords
                    if (/cr[ée]ation|nouvelle entreprise|lancement|d[ée]marrage|startup|projet de cr[ée]ation/.test(combinedText)) {
                        detectedContexts.push('creation_entreprise');
                    }
                    
                    // Detect reprise/takeover keywords
                    if (/reprise|rachat|transmission|cession|acquisition|succession/.test(combinedText)) {
                        detectedContexts.push('reprise_activite');
                    }
                    
                    // If has financial history and no other context detected, assume existing company
                    if (hasFinancialHistory && detectedContexts.length === 0) {
                        detectedContexts.push('entreprise_existante');
                    } else if (!hasFinancialHistory && detectedContexts.length === 0) {
                        // No history and no specific context = likely creation
                        detectedContexts.push('creation_entreprise');
                    }
                    
                    if (detectedContexts.length > 0) {
                        setContextesDossier(detectedContexts);
                        fieldsUpdated++;
                    }
                }

                if (fieldsUpdated > 0) {
                    toast.success(`${fieldsUpdated} champ(s) rempli(s) automatiquement`);
                } else {
                    toast.info('Aucune nouvelle information détectée dans les documents');
                }
            } else {
                toast.warning('Pré-analyse terminée mais aucune donnée exploitable trouvée');
            }
        } catch (error) {
            console.error('Erreur pré-analyse:', error);
            toast.error('Erreur lors de la pré-analyse. Réessayez ou remplissez manuellement.');
        } finally {
            setIsPreAnalyzing(false);
        }
    }, [files, siret, montantDemande, apportClient, typesBien.length, contextesDossier.length]);

    const handleSaveToHistory = useCallback(async (withNotes: boolean) => {
        if (!pendingAnalysisResult) return;

        try {
            await saveToHistory({
                analysisResult: pendingAnalysisResult,
                sourceFiles: pendingSourceFiles,
                notes: withNotes && analysisNotes.trim() ? analysisNotes.trim() : undefined,
            });
            setShowNotesDialog(false);
            setAnalysisNotes('');
            setPendingAnalysisResult(null);
            setPendingSourceFiles([]);
        } catch (err) {
            console.error('Erreur sauvegarde historique:', err);
        }
    }, [pendingAnalysisResult, pendingSourceFiles, analysisNotes, saveToHistory]);

    const handleSkipSaveToHistory = useCallback(() => {
        setShowNotesDialog(false);
        setAnalysisNotes('');
        setPendingAnalysisResult(null);
        setPendingSourceFiles([]);
        toast.info('Analyse non sauvegardée dans l\'historique');
    }, []);

    const handleCreateDossier = useCallback(async () => {
        if (!result?.data) return;

        const { entreprise, dirigeant, financement } = result.data;

        try {
            await createDossier.mutateAsync({
                raison_sociale: entreprise.raisonSociale || 'Entreprise',
                siren: entreprise.siren || '',
                siret: entreprise.siret || null,
                forme_juridique: entreprise.formeJuridique || null,
                date_creation: entreprise.dateCreation || null,
                code_naf: entreprise.codeNaf || null,
                secteur_activite: entreprise.secteurActivite || null,
                nb_salaries: entreprise.nbSalaries || null,
                adresse_siege: entreprise.adresseSiege || null,
                en_procedure: false,
                type_procedure: null,
                date_jugement: null,
                tribunal: null,
                dirigeant_civilite: null,
                dirigeant_nom: dirigeant.nom || '',
                dirigeant_prenom: dirigeant.prenom || '',
                dirigeant_date_naissance: dirigeant.dateNaissance || null,
                dirigeant_adresse: null,
                dirigeant_telephone: dirigeant.telephone || null,
                dirigeant_email: dirigeant.email || null,
                dirigeant_experience: null,
                dirigeant_fiche_ficp: null,
                type_financement: 'credit_bail',
                montant_demande: financement.montantDemande || 0,
                duree_mois: financement.dureeEnMois || null,
                objet_financement: financement.objetFinancement || null,
                nature_bien: null,
                description_bien: null,
                score_global: result.score?.global || null,
                recommandation: result.recommandation || null,
                status: 'en_cours',
            });

            toast.success('Dossier créé avec succès');
            navigate('/dossiers');
        } catch (err) {
            toast.error('Erreur lors de la création du dossier');
        }
    }, [result, createDossier, navigate]);

    const handleManualMode = useCallback(() => {
        // Navigate to manual form with pre-filled data
        const params = new URLSearchParams();
        if (result?.data) {
            params.set('prefill', JSON.stringify(result.data));
        }
        navigate(`/nouveau-dossier?${params.toString()}`);
    }, [result, navigate]);

    const handleReset = () => {
        reset();
        setFiles([]);
        setSiret('');
        setMontantDemande('');
        setApportClient('');
        setTypesBien([]);
        setContextesDossier([]);
        // Keep compression setting as user preference
    };

    const handleReloadFromHistory = useCallback((entry: AnalyseHistoryEntry) => {
        // Reconstruct AnalysisResult from history entry
        const extractedData = entry.extracted_data as unknown as AnalysisResult['data'];
        
        const analysisResult: AnalysisResult = {
            success: true,
            data: extractedData,
            score: {
                global: entry.score_global,
                details: {
                    solvabilite: entry.score_solvabilite || 0,
                    rentabilite: entry.score_rentabilite || 0,
                    structure: entry.score_structure || 0,
                    activite: entry.score_activite || 0,
                }
            },
            recommandation: entry.recommandation as AnalysisResult['recommandation'],
            seuilAccordable: entry.seuil_accordable || undefined,
            analyseSectorielle: entry.analyse_sectorielle as unknown as AnalysisResult['analyseSectorielle'],
            syntheseNarrative: entry.synthese_narrative as unknown as AnalysisResult['syntheseNarrative'],
            modelsUsed: entry.models_used || [],
        };

        loadFromHistory(analysisResult);
        setShowHistory(false);
        toast.success('Analyse rechargée depuis l\'historique');
    }, [loadFromHistory]);

    const showForm = step === 'idle' || step === 'error';
    const showProgress = isAnalyzing;
    const showResult = step === 'complete' && result;

    return (
        <Layout>
            <Header
                title="Nouveau dossier IA"
                subtitle="Importez vos documents et laissez l'IA analyser automatiquement"
            />

            <div className="p-6 max-w-4xl mx-auto">
                {/* Hero section */}
                {showForm && (
                    <div className="text-center mb-8">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            Analyse intelligente de documents
                        </h2>
                        <p className="text-muted-foreground max-w-lg mx-auto">
                            Déposez vos documents (Kbis, bilans, liasses fiscales...) et notre IA extraira
                            automatiquement toutes les informations nécessaires à l'étude du dossier.
                        </p>
                    </div>
                )}

                {/* Form section */}
                {showForm && (
                    <div className="space-y-6">
                        <div className="rounded-xl border bg-card p-6">
                            <DocumentDropzone
                                files={files}
                                onFilesChange={setFiles}
                                disabled={isAnalyzing}
                            />
                        </div>

                        {/* Optional fields */}
                        <div className="rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <FileQuestion className="h-5 w-5 text-muted-foreground" />
                                    <h3 className="font-medium text-foreground">Informations complémentaires</h3>
                                    <span className="text-xs text-muted-foreground">(optionnel)</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreAnalyze}
                                    disabled={files.length === 0 || isAnalyzing || isPreAnalyzing}
                                    className="gap-2"
                                >
                                    {isPreAnalyzing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Pré-analyse...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="h-4 w-4" />
                                            Auto
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="siret">SIRET / SIREN</Label>
                                    <Input
                                        id="siret"
                                        value={siret}
                                        onChange={(e) => setSiret(e.target.value)}
                                        placeholder="Entreprise existante ou vide si création"
                                        maxLength={14}
                                        disabled={isAnalyzing}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Laissez vide pour un projet de création d'entreprise
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="montant">Montant demandé (€)</Label>
                                    <Input
                                        id="montant"
                                        type="number"
                                        value={montantDemande}
                                        onChange={(e) => setMontantDemande(e.target.value)}
                                        placeholder="Montant du financement souhaité"
                                        disabled={isAnalyzing}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Obligatoire pour les créations d'entreprise
                                    </p>
                                </div>
                            </div>

                            {/* New fields for client contribution and asset type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed">
                                <div className="space-y-2">
                                    <Label htmlFor="apport">Apport client (€)</Label>
                                    <Input
                                        id="apport"
                                        type="number"
                                        value={apportClient}
                                        onChange={(e) => setApportClient(e.target.value)}
                                        placeholder="Montant de l'apport personnel"
                                        disabled={isAnalyzing}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Apport personnel du client pour le financement
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Types de bien financé</Label>
                                    <div className="space-y-2 mb-3">
                                        {typesBien.map((item) => {
                                            const option = TYPE_BIEN_OPTIONS.find(o => o.value === item.type);
                                            if (!option) return null;
                                            const Icon = option.icon;
                                            return (
                                                <div 
                                                    key={item.type}
                                                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                                                >
                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                        <Icon className="h-3 w-3" />
                                                        {option.label}
                                                    </Badge>
                                                    <Input
                                                        type="number"
                                                        placeholder="Montant (optionnel)"
                                                        value={item.montant || ''}
                                                        onChange={(e) => handleUpdateTypeBienMontant(item.type, e.target.value)}
                                                        className="w-32 h-8 text-sm"
                                                        disabled={isAnalyzing}
                                                    />
                                                    <span className="text-xs text-muted-foreground">€</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 ml-auto hover:bg-destructive/20 rounded-full"
                                                        onClick={() => handleRemoveTypeBien(item.type)}
                                                        disabled={isAnalyzing}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Montant €"
                                            value={newTypeMontant}
                                            onChange={(e) => setNewTypeMontant(e.target.value)}
                                            className="w-28"
                                            disabled={isAnalyzing}
                                        />
                                        <Select 
                                            value="" 
                                            onValueChange={(v) => handleAddTypeBien(v as TypeBienCode)}
                                            disabled={isAnalyzing}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Ajouter un type de bien" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background border">
                                                {TYPE_BIEN_OPTIONS.filter(o => !typesBien.some(t => t.type === o.value)).map((option) => {
                                                    const Icon = option.icon;
                                                    return (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                                <span>{option.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Indiquez le montant prévu pour chaque type de bien (optionnel mais recommandé)
                                    </p>
                                </div>
                            </div>

                            {/* Contexte du dossier */}
                            <div className="mt-4 pt-4 border-t border-dashed">
                                <Label className="mb-3 block">Contexte du financement</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {CONTEXTE_DOSSIER_OPTIONS.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                contextesDossier.includes(option.value) 
                                                    ? 'bg-primary/10 border-primary' 
                                                    : 'bg-muted/30 border-border hover:bg-muted/50'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={contextesDossier.includes(option.value)}
                                                onCheckedChange={() => handleToggleContexte(option.value)}
                                                disabled={isAnalyzing}
                                            />
                                            <div>
                                                <p className="text-sm font-medium">{option.label}</p>
                                                <p className="text-xs text-muted-foreground">{option.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced options */}
                            <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions} className="mt-4 pt-4 border-t border-dashed">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                                        <Settings2 className="h-4 w-4" />
                                        Options avancées
                                        {showAdvancedOptions ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-4 space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <ImageOff className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Désactiver la compression d'images</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Envoyer les images sans compression (fichiers plus lourds, meilleure qualité)
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={disableCompression}
                                            onCheckedChange={setDisableCompression}
                                            disabled={isAnalyzing}
                                        />
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                size="lg"
                                className="flex-1"
                                onClick={handleAnalyze}
                                disabled={files.length === 0 || isAnalyzing || isSaving}
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Lancer l'analyse IA
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setShowHistory(!showHistory)}
                            >
                                <History className="h-4 w-4 mr-2" />
                                Historique
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => navigate('/nouveau-dossier')}
                                disabled={isAnalyzing}
                            >
                                Mode manuel
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>

                        {/* History panel */}
                        {showHistory && (
                            <div className="mt-6">
                                <AnalyseHistoryPanel onReloadAnalysis={handleReloadFromHistory} />
                            </div>
                        )}
                    </div>
                )}

                {/* Progress section */}
                {showProgress && (
                    <div className="space-y-6">
                        <AIAnalysisProgress 
                            step={step} 
                            progress={progress} 
                            error={error} 
                            uploadProgress={uploadProgress} 
                            onCancel={cancel}
                        />
                    </div>
                )}

                {/* Error state with retry */}
                {step === 'error' && (
                    <div className="mt-6 flex justify-center">
                        <Button variant="outline" onClick={handleReset}>
                            Réessayer
                        </Button>
                    </div>
                )}

                {/* Result section */}
                {showResult && (
                    <div className="space-y-6">
                        <AnalysisResultCard
                            result={result}
                            onCreateDossier={handleCreateDossier}
                            onManualMode={handleManualMode}
                            isCreating={createDossier.isPending}
                            isDemoMode={isDemoMode}
                        />

                        <div className="text-center">
                            <Button variant="ghost" onClick={handleReset}>
                                Analyser un autre dossier
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Notes Dialog for saving to history */}
            <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <StickyNote className="h-5 w-5 text-primary" />
                            Sauvegarder l'analyse
                        </DialogTitle>
                        <DialogDescription>
                            Ajoutez des notes personnalisées pour retrouver facilement cette analyse dans l'historique.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="analysis-notes">Notes (optionnel)</Label>
                            <Textarea
                                id="analysis-notes"
                                value={analysisNotes}
                                onChange={(e) => setAnalysisNotes(e.target.value)}
                                placeholder="Ex: Dossier prioritaire, revoir les garanties, attente documents complémentaires..."
                                className="min-h-[100px] resize-none"
                                maxLength={500}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {analysisNotes.length}/500 caractères
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="ghost"
                            onClick={handleSkipSaveToHistory}
                            className="sm:mr-auto"
                        >
                            Ne pas sauvegarder
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSaveToHistory(false)}
                            disabled={isSaving}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder sans notes
                        </Button>
                        <Button
                            onClick={() => handleSaveToHistory(true)}
                            disabled={isSaving}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Sauvegarde...' : 'Sauvegarder avec notes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
