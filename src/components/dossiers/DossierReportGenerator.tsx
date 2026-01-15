import { useState } from 'react';
import { FileText, Download, Eye, Loader2, FileType, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import type { AnalysisResult } from '@/hooks/useDocumentAnalysis';
import { DocumentPreviewModal } from '@/components/smart-import/DocumentPreviewModal';
import { generateSmartAnalysisPDF } from '@/lib/rapport-pdf-generator';
import { generateSmartAnalysisWord } from '@/lib/rapport-word-generator';
import { useAnalyseHistory } from '@/hooks/useAnalyseHistory';
import { generateBNPRapportPDF, createBNPQuestionnaireFromAnalysis, type BNPReportInput } from '@/lib/bnp-rapport-generator';
import type { BNPQuestionnaireData, BNPRecommandationFinale } from '@/types/bnp-rapport.types';

type DossierRow = Tables<'dossiers'>;
type DonneeFinanciereRow = Tables<'donnees_financieres'>;

interface DossierReportGeneratorProps {
    dossier: DossierRow;
    financieres: DonneeFinanciereRow[];
}

function formatCurrency(value?: number | null): string {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function DossierReportGenerator({ dossier, financieres }: DossierReportGeneratorProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isGeneratingWord, setIsGeneratingWord] = useState(false);
    const [isGeneratingBNP, setIsGeneratingBNP] = useState(false);
    const { history, isLoading: loadingHistory } = useAnalyseHistory(dossier.id);

    // Convert dossier data to AnalysisResult format
    const buildAnalysisResult = (): AnalysisResult => {
        // Get latest history entry if available
        const latestHistory = history?.[0];

        // Build financial data from donnees_financieres
        const annees = financieres.map(df => ({
            annee: df.annee_exercice,
            chiffreAffaires: df.chiffre_affaires ?? undefined,
            resultatNet: df.resultat_net ?? undefined,
            ebitda: df.ebitda ?? undefined,
            capitauxPropres: df.capitaux_propres ?? undefined,
            dettesFinancieres: df.dettes_financieres ?? undefined,
            tresorerie: df.tresorerie ?? undefined,
        }));

        // Calculate basic score if no history
        const scoreGlobal = latestHistory?.score_global ?? dossier.score_global ?? 50;
        const recommandation = latestHistory?.recommandation ?? dossier.recommandation ?? 'RESERVES';

        // Build justifications if available
        const justifications = latestHistory?.extracted_data && typeof latestHistory.extracted_data === 'object' && 'justifications' in latestHistory.extracted_data
            ? (latestHistory.extracted_data as { justifications?: { solvabilite?: string; rentabilite?: string; structure?: string; activite?: string } }).justifications
            : undefined;

        return {
            success: true,
            data: {
                entreprise: {
                    siren: dossier.siren,
                    siret: dossier.siret || undefined,
                    raisonSociale: dossier.raison_sociale,
                    formeJuridique: dossier.forme_juridique || undefined,
                    dateCreation: dossier.date_creation || undefined,
                    codeNaf: dossier.code_naf || undefined,
                    secteurActivite: dossier.secteur_activite || undefined,
                    adresseSiege: dossier.adresse_siege || undefined,
                    nbSalaries: dossier.nb_salaries ?? undefined,
                },
                dirigeant: {
                    nom: dossier.dirigeant_nom,
                    prenom: dossier.dirigeant_prenom,
                    dateNaissance: dossier.dirigeant_date_naissance || undefined,
                    telephone: dossier.dirigeant_telephone || undefined,
                    email: dossier.dirigeant_email || undefined,
                    fonction: undefined,
                },
                finances: {
                    annees,
                },
                financement: {
                    montantDemande: dossier.montant_demande,
                    dureeEnMois: dossier.duree_mois ?? undefined,
                    objetFinancement: dossier.objet_financement || undefined,
                },
                documentsDetectes: [],
                confianceExtraction: latestHistory?.confidence_extraction ?? 0.85,
            },
            score: {
                global: scoreGlobal,
                details: {
                    solvabilite: latestHistory?.score_solvabilite ?? Math.round(scoreGlobal * 0.9),
                    rentabilite: latestHistory?.score_rentabilite ?? Math.round(scoreGlobal * 1.1),
                    structure: latestHistory?.score_structure ?? Math.round(scoreGlobal * 0.95),
                    activite: latestHistory?.score_activite ?? Math.round(scoreGlobal * 1.05),
                },
                justifications: justifications ? {
                    solvabilite: justifications.solvabilite ?? 'Non disponible',
                    rentabilite: justifications.rentabilite ?? 'Non disponible',
                    structure: justifications.structure ?? 'Non disponible',
                    activite: justifications.activite ?? 'Non disponible',
                } : undefined,
            },
            recommandation: recommandation as 'FAVORABLE' | 'RESERVES' | 'DEFAVORABLE',
            seuilAccordable: latestHistory?.seuil_accordable ?? undefined,
            analyseSectorielle: latestHistory?.analyse_sectorielle ? latestHistory.analyse_sectorielle as unknown as AnalysisResult['analyseSectorielle'] : undefined,
            syntheseNarrative: latestHistory?.synthese_narrative ? latestHistory.synthese_narrative as unknown as AnalysisResult['syntheseNarrative'] : undefined,
            modelsUsed: latestHistory?.models_used ?? ['Données dossier'],
        };
    };

    const handleGeneratePDF = () => {
        setIsGeneratingPDF(true);
        try {
            const analysisResult = buildAnalysisResult();
            generateSmartAnalysisPDF(analysisResult);
            toast.success('PDF généré avec succès');
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            toast.error('Erreur lors de la génération du PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleGenerateWord = async () => {
        setIsGeneratingWord(true);
        try {
            const analysisResult = buildAnalysisResult();
            await generateSmartAnalysisWord(analysisResult);
            toast.success('Document Word généré avec succès');
        } catch (error) {
            console.error('Erreur génération Word:', error);
            toast.error('Erreur lors de la génération du Word');
        } finally {
            setIsGeneratingWord(false);
        }
    };

    const handleGenerateBNP = () => {
        setIsGeneratingBNP(true);
        try {
            const analysisResult = buildAnalysisResult();

            // Create partial questionnaire from analysis
            const partialQuestionnaire = createBNPQuestionnaireFromAnalysis(
                analysisResult,
                dossier,
                'creation'
            );

            // Build complete questionnaire with defaults
            const questionnaire: BNPQuestionnaireData = {
                ...partialQuestionnaire,
                // Complete with required fields
                detailDemande: partialQuestionnaire.detailDemande || `Demande de financement ${dossier.type_financement} pour ${dossier.raison_sociale}`,
                zoneExploitationAdresse: dossier.adresse_siege || '',
                zoneExploitationCodePostal: '',
                zoneExploitationCommune: '',
                commentaireZoneExploitation: '',
                premiereExperienceEntrepreneuriale: true,
                exigencesAccesProfession: true,
                conjointRoleActivite: false,
                autresInfosPorteur: `${dossier.dirigeant_prenom} ${dossier.dirigeant_nom}`,
                commentaireEnvironnementLocal: 'Analyse environnement local à compléter.',
                commentaireBilansConsolides: partialQuestionnaire.commentaireBilansConsolides || 'Analyse financière à compléter.',
                syntheseCompteResultat: 'Synthèse compte de résultat à compléter.',
                evenementsConjoncturels: false,
                autresInfosAnalyseFinanciere: 'Informations complémentaires à analyser.',
                chargesPrevisionnelles: partialQuestionnaire.chargesPrevisionnelles || {
                    annee1: { chargesVariables: 0, chargesVariablesPct: 0, chargesFixesExploitation: 0, chargesPersonnel: 0 },
                    annee2: { chargesVariables: 0, chargesVariablesPct: 0, chargesFixesExploitation: 0, chargesPersonnel: 0 },
                    annee3: { chargesVariables: 0, chargesVariablesPct: 0, chargesFixesExploitation: 0, chargesPersonnel: 0 },
                },
                chargesBienReparties: true,
                commentaireChargesExternes: 'Analyse charges externes à détailler.',
                commentaireMargeBrute: 'Analyse marge brute à détailler.',
                validationCafPrevisionnel: true,
                cafData: partialQuestionnaire.cafData || {
                    annee1: { caf: 0, annuites: 0, solde: 0, dscr: 0 },
                    annee2: { caf: 0, annuites: 0, solde: 0, dscr: 0 },
                    annee3: { caf: 0, annuites: 0, solde: 0, dscr: 0 },
                },
                validationCafGlobal: true,
                validationCafJustification: 'Justification CAF à compléter.',
                beneficieAidesEtat: false,
                revenusCautions: [],
                commentaireChargesPersonnel: 'Analyse charges personnel à détailler.',
                presenceFinancementsLies: false,
                presentationDeclic: false,
                fondsPropresNegatifs: false,
                controlesIndispensablesRealises: false,
                checklistControles: [
                    { controle: 'Kbis / Extrait K', statut: 'a_obtenir' },
                    { controle: 'Pièce identité dirigeant', statut: 'a_obtenir' },
                    { controle: 'Business plan', statut: 'ok' },
                ],
                syntheseCollaborateur: analysisResult.score && analysisResult.score.global >= 60 ? 'concluante' : 'reservee',
                pointsAttention: ['Points d\'attention à identifier'],
                decisionFinale: analysisResult.score && analysisResult.score.global >= 60 ? 'accord_conditions' : 'transmission_comite',
                conditionsParticulieres: ['Conditions à définir'],
                recommandationJustification: 'Justification de la recommandation à compléter.',
            };

            // Build recommendation
            const recommandation: BNPRecommandationFinale = {
                decision: questionnaire.decisionFinale,
                montantFinancable: dossier.montant_demande,
                financements: [
                    {
                        type: dossier.type_financement || 'Crédit professionnel',
                        montant: dossier.montant_demande,
                        duree: Math.ceil((dossier.duree_mois || 60) / 12),
                        taux: 4.5,
                        mensualite: Math.round(dossier.montant_demande / (dossier.duree_mois || 60)),
                    },
                ],
                garanties: [
                    { type: 'Caution personnelle', description: 'Du dirigeant' },
                ],
                conditions: questionnaire.conditionsParticulieres,
                ratios: {
                    tauxApport: 20,
                    dettesCAF: 2.5,
                    dscrA1: 1.3,
                    autonomieFinanciere: 30,
                },
                justification: questionnaire.recommandationJustification,
            };

            // Generate the PDF
            const input: BNPReportInput = {
                questionnaire,
                dossier,
                analysisResult,
                projectType: 'creation',
                recommandation,
            };

            generateBNPRapportPDF(input);
            toast.success('Rapport BNP Paribas généré avec succès (20-30 pages)');
        } catch (error) {
            console.error('Erreur génération BNP:', error);
            toast.error('Erreur lors de la génération du rapport BNP');
        } finally {
            setIsGeneratingBNP(false);
        }
    };

    const analysisResult = buildAnalysisResult();
    const hasAIAnalysis = history && history.length > 0;

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Génération de rapport
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Générez un rapport d'analyse complet basé sur les données du dossier.
                    </p>

                    {hasAIAnalysis ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
                            <Sparkles className="h-4 w-4 text-success" />
                            <span className="text-sm text-success font-medium">
                                Analyse IA disponible (version {history[0].version})
                            </span>
                            <Badge variant="outline" className="ml-auto text-xs">
                                {new Date(history[0].created_at).toLocaleDateString('fr-FR')}
                            </Badge>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Rapport basé sur les données du dossier uniquement
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-muted-foreground">Score global:</span>
                            <p className="font-bold text-lg">{dossier.score_global ?? '-'}/100</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Recommandation:</span>
                            <p className="font-medium">{dossier.recommandation || 'À déterminer'}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Montant demandé:</span>
                            <p className="font-medium">{formatCurrency(dossier.montant_demande)}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Années financières:</span>
                            <p className="font-medium">{financieres.length} exercice(s)</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowPreview(true)}
                            disabled={loadingHistory}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Aperçu & Personnaliser
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleGenerateWord}
                            disabled={isGeneratingWord || loadingHistory}
                        >
                            {isGeneratingWord ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <FileType className="h-4 w-4 mr-2" />
                            )}
                            Word
                        </Button>
                        <Button
                            onClick={handleGeneratePDF}
                            disabled={isGeneratingPDF || loadingHistory}
                        >
                            {isGeneratingPDF ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Télécharger PDF
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleGenerateBNP}
                            disabled={isGeneratingBNP || loadingHistory}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isGeneratingBNP ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Building2 className="h-4 w-4 mr-2" />
                            )}
                            Rapport BNP 35Q
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <DocumentPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                result={analysisResult}
            />
        </>
    );
}
