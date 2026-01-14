import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileQuestion, ArrowRight, Car, Laptop, Building, Coins, Wrench, Package } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentDropzone } from '@/components/smart-import/DocumentDropzone';
import { AIAnalysisProgress } from '@/components/smart-import/AIAnalysisProgress';
import { AnalysisResultCard } from '@/components/smart-import/AnalysisResultCard';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { useCreateDossier } from '@/hooks/useDossiers';
import { toast } from 'sonner';

type TypeBien = 'vehicule' | 'materiel' | 'immobilier' | 'informatique' | 'bfr' | 'autre';

const TYPE_BIEN_OPTIONS: { value: TypeBien; label: string; icon: typeof Car }[] = [
    { value: 'vehicule', label: 'Véhicule', icon: Car },
    { value: 'materiel', label: 'Matériel / Équipement', icon: Wrench },
    { value: 'immobilier', label: 'Immobilier', icon: Building },
    { value: 'informatique', label: 'Informatique / IT', icon: Laptop },
    { value: 'bfr', label: 'BFR / Trésorerie', icon: Coins },
    { value: 'autre', label: 'Autre', icon: Package },
];

export default function SmartImportPage() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<File[]>([]);
    const [siret, setSiret] = useState('');
    const [montantDemande, setMontantDemande] = useState('');
    const [apportClient, setApportClient] = useState('');
    const [typeBien, setTypeBien] = useState<TypeBien | ''>('');

    const { step, progress, uploadProgress, result, error, isAnalyzing, isDemoMode, analyzeDocuments, reset, cancel } = useDocumentAnalysis();
    const createDossier = useCreateDossier();

    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) {
            toast.error('Veuillez sélectionner au moins un document');
            return;
        }

        await analyzeDocuments(files, {
            siret: siret || undefined,
            montantDemande: montantDemande ? parseFloat(montantDemande) : undefined,
            apportClient: apportClient ? parseFloat(apportClient) : undefined,
            typeBien: typeBien || undefined,
        });
    }, [files, siret, montantDemande, apportClient, typeBien, analyzeDocuments]);

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
        setTypeBien('');
    };

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
                            <div className="flex items-center gap-2 mb-4">
                                <FileQuestion className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-medium text-foreground">Informations complémentaires</h3>
                                <span className="text-xs text-muted-foreground">(optionnel)</span>
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
                                    <Label htmlFor="typeBien">Type de bien financé</Label>
                                    <Select 
                                        value={typeBien} 
                                        onValueChange={(v) => setTypeBien(v as TypeBien)}
                                        disabled={isAnalyzing}
                                    >
                                        <SelectTrigger id="typeBien">
                                            <SelectValue placeholder="Sélectionner le type de bien" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-background border">
                                            {TYPE_BIEN_OPTIONS.map((option) => {
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
                                    <p className="text-xs text-muted-foreground">
                                        Permet d'orienter vers le produit adapté (ex: Arval pour véhicules)
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <p className="text-sm text-muted-foreground mb-2">
                                    📋 <span className="font-medium">Types de dossiers acceptés :</span>
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-md">Entreprise existante</span>
                                    <span className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded-md">Création d'entreprise</span>
                                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded-md">Reprise d'activité</span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                size="lg"
                                className="flex-1"
                                onClick={handleAnalyze}
                                disabled={files.length === 0 || isAnalyzing}
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Lancer l'analyse IA
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
        </Layout>
    );
}
