import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileQuestion, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DocumentDropzone } from '@/components/smart-import/DocumentDropzone';
import { AIAnalysisProgress } from '@/components/smart-import/AIAnalysisProgress';
import { AnalysisResultCard } from '@/components/smart-import/AnalysisResultCard';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { useCreateDossier } from '@/hooks/useDossiers';
import { toast } from 'sonner';

export default function SmartImportPage() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<File[]>([]);
    const [siret, setSiret] = useState('');
    const [montantDemande, setMontantDemande] = useState('');

    const { step, progress, result, error, isAnalyzing, analyzeDocuments, reset } = useDocumentAnalysis();
    const createDossier = useCreateDossier();

    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) {
            toast.error('Veuillez sélectionner au moins un document');
            return;
        }

        await analyzeDocuments(files, {
            siret: siret || undefined,
            montantDemande: montantDemande ? parseFloat(montantDemande) : undefined,
        });
    }, [files, siret, montantDemande, analyzeDocuments]);

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
                                        placeholder="Si non trouvé dans les documents"
                                        maxLength={14}
                                        disabled={isAnalyzing}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Renseignez uniquement si l'IA ne le trouve pas
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="montant">Montant demandé (€)</Label>
                                    <Input
                                        id="montant"
                                        type="number"
                                        value={montantDemande}
                                        onChange={(e) => setMontantDemande(e.target.value)}
                                        placeholder="Laissez vide pour une estimation"
                                        disabled={isAnalyzing}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        L'IA suggérera le seuil accordable si non renseigné
                                    </p>
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
                        <AIAnalysisProgress step={step} progress={progress} error={error} />
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
