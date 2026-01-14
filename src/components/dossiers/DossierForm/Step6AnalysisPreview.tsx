import { useMemo, useState } from 'react';
import { Target, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Wallet, Shield, FileText, ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { calculerScoring, calculerRatios, genererAlertes } from '@/lib/scoring';
import { QuestionnaireForm } from '@/components/questionnaire';
import { validateQuestionnaire } from '@/lib/questionnaire-bnp';
import type { DonneesFinancieres, ScoringResult, RatioFinancier } from '@/types/dossier.types';

interface Step6AnalysisPreviewProps {
    data: Record<string, any>;
    onUpdate: (data: Record<string, any>) => void;
    onPrevious: () => void;
    onSubmit: (scoringResult: ScoringResult) => void;
    isSubmitting?: boolean;
}

function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let color = 'text-success';
    let bgClass = 'text-success/20';
    if (score < 40) {
        color = 'text-destructive';
        bgClass = 'text-destructive/20';
    } else if (score < 60) {
        color = 'text-warning';
        bgClass = 'text-warning/20';
    }

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={10}
                    className={bgClass}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={10}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn('transition-all duration-1000', color)}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-4xl font-bold', color)}>{score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
        </div>
    );
}

function RecommandationBadge({ statut }: { statut: ScoringResult['statut'] }) {
    const config = {
        accord_favorable: { icon: CheckCircle2, color: 'bg-success/20 text-success border-success/30', label: 'Favorable' },
        accord_conditionne: { icon: AlertTriangle, color: 'bg-warning/20 text-warning border-warning/30', label: 'Avec réserves' },
        etude_approfondie: { icon: AlertTriangle, color: 'bg-warning/20 text-warning border-warning/30', label: 'Étude approfondie' },
        refus: { icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Défavorable' },
    };

    const { icon: Icon, color, label } = config[statut] || config.etude_approfondie;

    return (
        <div className={cn('flex items-center gap-2 rounded-full border px-4 py-2', color)}>
            <Icon className="h-5 w-5" />
            <span className="font-semibold">{label}</span>
        </div>
    );
}

function formatCurrency(value?: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function Step6AnalysisPreview({
    data,
    onUpdate,
    onPrevious,
    onSubmit,
    isSubmitting = false
}: Step6AnalysisPreviewProps) {
    const [activeTab, setActiveTab] = useState('scoring');
    const [questionnaireResponses, setQuestionnaireResponses] = useState<Record<string, any>>({});

    // Transform form data to DonneesFinancieres format
    // Step4 stores data in exercices object with year keys and camelCase fields
    const donneesFinancieres: DonneesFinancieres[] = useMemo(() => {
        const financialData: DonneesFinancieres[] = [];

        // Step4 stores data in exercices object with year keys
        const exercices = data.exercices || {};
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 1, currentYear - 2, currentYear - 3];

        years.forEach((year) => {
            const ex = exercices[year];
            if (ex && (ex.chiffreAffaires || ex.resultatNet)) {
                financialData.push({
                    id: `exercise_${year}`,
                    dossierId: '',
                    anneeExercice: year,
                    chiffreAffaires: ex.chiffreAffaires,
                    resultatNet: ex.resultatNet,
                    ebitda: ex.ebe || ex.ebitda,
                    capaciteAutofinancement: ex.resultatNet && ex.amortissements
                        ? ex.resultatNet + ex.amortissements
                        : undefined,
                    totalActif: ex.totalActif,
                    capitauxPropres: ex.capitauxPropres,
                    dettesFinancieres: ex.dettesFinancieres,
                    actifCirculant: ex.actifCirculant,
                    passifCirculant: ex.passifCirculant,
                    stocks: ex.stocks,
                    creancesClients: ex.creancesClients,
                    tresorerie: ex.tresorerie,
                    dettesFournisseurs: ex.dettesFournisseurs,
                    createdAt: new Date(),
                });
            }
        });

        return financialData;
    }, [data]);

    // Calculate scoring
    // Handle both camelCase (from step forms) and snake_case (from DB)
    const scoringResult: ScoringResult = useMemo(() => {
        const dateCreation = data.dateCreation || data.date_creation
            ? new Date(data.dateCreation || data.date_creation)
            : undefined;

        return calculerScoring(donneesFinancieres, {
            dateCreation,
            dirigeantExperience: data.dirigeantExperience || data.dirigeant_experience || 0,
            dirigeantFicheFicp: data.dirigeantFicheFicp || data.dirigeant_fiche_ficp || false,
            enProcedure: data.enProcedure || data.en_procedure || false,
            secteurActivite: data.secteurActivite || data.secteur_activite,
        });
    }, [donneesFinancieres, data]);

    // Calculate ratios for display
    const ratios: RatioFinancier[] = useMemo(() => {
        return calculerRatios(donneesFinancieres);
    }, [donneesFinancieres]);

    // Generate alerts
    const alertes: string[] = useMemo(() => {
        const lastFinanciere = donneesFinancieres[0];
        return genererAlertes(ratios, {
            dateCreation: data.dateCreation || data.date_creation
                ? new Date(data.dateCreation || data.date_creation)
                : undefined,
            dirigeantFicheFicp: data.dirigeantFicheFicp || data.dirigeant_fiche_ficp,
            enProcedure: data.enProcedure || data.en_procedure,
            capitauxPropres: lastFinanciere?.capitauxPropres,
        });
    }, [ratios, data, donneesFinancieres]);

    // Map statut to recommandation for DB
    const getRecommandation = (statut: ScoringResult['statut']): string => {
        switch (statut) {
            case 'accord_favorable': return 'FAVORABLE';
            case 'accord_conditionne':
            case 'etude_approfondie': return 'RESERVES';
            case 'refus': return 'DEFAVORABLE';
            default: return 'RESERVES';
        }
    };

    const handleSubmit = () => {
        onSubmit(scoringResult);
    };

    // Questionnaire validation
    const questionnaireValidation = useMemo(() => {
        return validateQuestionnaire(questionnaireResponses, data.typeFinancement || data.type_financement);
    }, [questionnaireResponses, data.typeFinancement, data.type_financement]);

    // Key ratios for summary display
    const keyRatios = ratios.filter(r =>
        ['Autonomie financière', 'Marge EBE', 'Liquidité réduite', 'DSCR (EBITDA/Service dette)'].includes(r.nom)
    ).slice(0, 4);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Target className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Analyse & Validation</h2>
                <p className="text-muted-foreground mt-1">
                    Vérifiez le scoring et complétez le questionnaire BNP
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="scoring" className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Score & Ratios
                    </TabsTrigger>
                    <TabsTrigger value="questionnaire" className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Questionnaire BNP
                        {questionnaireValidation.completion > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {questionnaireValidation.completion}%
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Scoring Tab */}
                <TabsContent value="scoring" className="space-y-6 mt-6">
                    <Card className="overflow-hidden">
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <ScoreGauge score={scoringResult.scoreGlobal} />

                                <div className="flex-1 text-center md:text-left space-y-3">
                                    <RecommandationBadge statut={scoringResult.statut} />

                                    <div className="flex items-center gap-2 justify-center md:justify-start text-sm">
                                        <Wallet className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Montant demandé :</span>
                                        <span className="font-bold text-primary">
                                            {formatCurrency(data.montantDemande || data.montant_demande)}
                                        </span>
                                    </div>
                                </div>

                                {/* Score breakdown */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {scoringResult.details.slice(0, 4).map((detail) => (
                                        <div key={detail.critere} className="text-center p-2 rounded-lg bg-background/50">
                                            <p className="text-muted-foreground text-xs truncate">{detail.critere}</p>
                                            <p className="font-bold text-lg">{Math.round(detail.points)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Two columns: Points forts + Alertes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Points forts */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-success" />
                                    Points forts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {scoringResult.facteursPositifs.length > 0 ? (
                                    <ul className="space-y-2">
                                        {scoringResult.facteursPositifs.map((facteur, i) => (
                                            <li key={i} className="text-sm flex items-start gap-2">
                                                <span className="text-success mt-0.5">✓</span>
                                                <span>{facteur.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Aucun point fort identifié</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Alertes */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-warning" />
                                    Points d'attention
                                    {alertes.length > 0 && (
                                        <Badge variant="destructive" className="ml-auto">{alertes.length}</Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {alertes.length > 0 ? (
                                    <ul className="space-y-2">
                                        {alertes.map((alerte, i) => (
                                            <li key={i} className="text-sm flex items-start gap-2">
                                                <span className="text-warning mt-0.5">⚠</span>
                                                <span>{alerte}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex items-center gap-2 text-success">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-sm">Aucune alerte</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Key Ratios */}
                    {keyRatios.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Ratios clés
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {keyRatios.map((ratio) => (
                                        <div key={ratio.nom} className="text-center p-3 rounded-lg bg-muted/50">
                                            <p className="text-xs text-muted-foreground mb-1 truncate">{ratio.nom}</p>
                                            <p className="text-lg font-bold">
                                                {ratio.valeurN !== null
                                                    ? `${ratio.valeurN.toFixed(1)}${ratio.unite || ''}`
                                                    : '-'}
                                            </p>
                                            <div className={cn(
                                                'w-2 h-2 rounded-full mx-auto mt-1',
                                                ratio.statut === 'good' && 'bg-success',
                                                ratio.statut === 'warning' && 'bg-warning',
                                                ratio.statut === 'bad' && 'bg-destructive'
                                            )} />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Company summary */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Récapitulatif
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Raison sociale</p>
                                    <p className="font-medium">{data.raisonSociale || data.raison_sociale || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">SIREN</p>
                                    <p className="font-medium font-mono">{data.siren || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Type financement</p>
                                    <p className="font-medium">{data.typeFinancement || data.type_financement || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Dirigeant</p>
                                    <p className="font-medium">
                                        {data.dirigeantPrenom || data.dirigeant_prenom} {data.dirigeantNom || data.dirigeant_nom}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">CA (N-1)</p>
                                    <p className="font-medium">
                                        {formatCurrency(
                                            data.exercices?.[new Date().getFullYear() - 1]?.chiffreAffaires
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Résultat net (N-1)</p>
                                    <p className="font-medium">
                                        {formatCurrency(
                                            data.exercices?.[new Date().getFullYear() - 1]?.resultatNet
                                        )}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent>

                {/* Questionnaire Tab */}
                <TabsContent value="questionnaire" className="mt-6">
                    <QuestionnaireForm
                        typeFinancement={data.typeFinancement || data.type_financement}
                        initialResponses={questionnaireResponses}
                        onResponsesChange={setQuestionnaireResponses}
                    />
                </TabsContent>
            </Tabs>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={onPrevious} disabled={isSubmitting}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Modifier les informations
                </Button>

                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || questionnaireValidation.blocking.length > 0}
                    className="bg-primary hover:bg-primary/90"
                >
                    {isSubmitting ? 'Création en cours...' : 'Créer le dossier'}
                </Button>
            </div>
        </div>
    );
}
