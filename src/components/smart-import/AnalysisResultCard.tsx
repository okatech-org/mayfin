import { useState } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Building2,
    User,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Wallet,
    FileText,
    Download,
    Cpu,
    Globe,
    Lightbulb,
    Shield,
    Target,
    BookOpen,
    Eye,
    RefreshCw,
    Save,
    FileType
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AnalysisResult, AnalyseSectorielle } from '@/hooks/useDocumentAnalysis';
import { generateSmartAnalysisPDF } from '@/lib/rapport-pdf-generator';
import { generateSmartAnalysisWord } from '@/lib/rapport-word-generator';
import { toast } from 'sonner';
import { PDFPreviewModal } from './PDFPreviewModal';
import { supabase } from '@/integrations/supabase/client';
import { useAnalyseHistory } from '@/hooks/useAnalyseHistory';

interface AnalysisResultCardProps {
    result: AnalysisResult;
    onCreateDossier: () => void;
    onManualMode: () => void;
    isCreating?: boolean;
    isDemoMode?: boolean;
}

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let color = 'text-success';
    if (score < 45) color = 'text-destructive';
    else if (score < 70) color = 'text-warning';

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={8}
                    className="text-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={8}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn('transition-all duration-1000', color)}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-3xl font-bold', color)}>{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
        </div>
    );
}

function RecommandationBadge({ recommandation }: { recommandation: string }) {
    const config = {
        FAVORABLE: { icon: CheckCircle2, color: 'bg-success/20 text-success border-success/30', label: 'Favorable' },
        RESERVES: { icon: AlertTriangle, color: 'bg-warning/20 text-warning border-warning/30', label: 'Avec réserves' },
        DEFAVORABLE: { icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Défavorable' },
    };

    const { icon: Icon, color, label } = config[recommandation as keyof typeof config] || config.RESERVES;

    return (
        <div className={cn('flex items-center gap-2 rounded-full border px-4 py-2', color)}>
            <Icon className="h-5 w-5" />
            <span className="font-semibold">{label}</span>
        </div>
    );
}

function DataSection({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
    badge,
    badgeColor = 'default'
}: {
    title: string;
    icon: typeof Building2;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
    badgeColor?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">{title}</span>
                        {badge && (
                            <Badge variant={badgeColor === 'default' ? 'secondary' : badgeColor as 'secondary'}
                                className={cn(
                                    badgeColor === 'success' && 'bg-success/20 text-success',
                                    badgeColor === 'warning' && 'bg-warning/20 text-warning',
                                    badgeColor === 'destructive' && 'bg-destructive/20 text-destructive'
                                )}
                            >
                                {badge}
                            </Badge>
                        )}
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 py-3">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
    if (!value) return null;
    return (
        <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground">{value}</span>
        </div>
    );
}

function formatCurrency(value?: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function AnalysisResultCard({ result, onCreateDossier, onManualMode, isCreating, isDemoMode }: AnalysisResultCardProps) {
    const { data, score, recommandation, seuilAccordable, modelsUsed, analyseSectorielle, syntheseNarrative } = result;
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadingWord, setIsDownloadingWord] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isRefreshingSector, setIsRefreshingSector] = useState(false);
    const [sectorData, setSectorData] = useState<AnalyseSectorielle | undefined>(analyseSectorielle);
    const { saveToHistory, isSaving } = useAnalyseHistory();

    if (!data || !score) return null;

    const handleDownloadPDF = () => {
        setIsDownloading(true);
        try {
            generateSmartAnalysisPDF(updatedResult);
            toast.success('PDF généré avec succès');
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            toast.error('Erreur lors de la génération du PDF: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadWord = async () => {
        setIsDownloadingWord(true);
        try {
            await generateSmartAnalysisWord(updatedResult);
            toast.success('Document Word généré avec succès');
        } catch (error) {
            console.error('Erreur génération Word:', error);
            toast.error('Erreur lors de la génération du Word: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
        } finally {
            setIsDownloadingWord(false);
        }
    };

    const handleSaveToHistory = async () => {
        try {
            await saveToHistory({ 
                analysisResult: updatedResult,
                sourceFiles: data.documentsDetectes
            });
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
        }
    };

    const handleRefreshSectorAnalysis = async () => {
        if (!data.entreprise.secteurActivite) {
            toast.error('Secteur d\'activité non disponible');
            return;
        }

        setIsRefreshingSector(true);
        try {
            const { data: response, error } = await supabase.functions.invoke('sector-analysis', {
                body: {
                    secteur: data.entreprise.secteurActivite,
                    codeNaf: data.entreprise.codeNaf,
                    localisation: data.entreprise.adresseSiege,
                    raisonSociale: data.entreprise.raisonSociale
                }
            });

            if (error) throw error;

            if (response?.success && response?.analyseSectorielle) {
                setSectorData(response.analyseSectorielle);
                toast.success('Analyse sectorielle actualisée avec Perplexity');
            } else {
                throw new Error(response?.error || 'Erreur lors de l\'analyse');
            }
        } catch (error) {
            console.error('Erreur analyse sectorielle:', error);
            toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'actualisation');
        } finally {
            setIsRefreshingSector(false);
        }
    };

    // Create updated result with refreshed sector data
    const updatedResult: AnalysisResult = {
        ...result,
        analyseSectorielle: sectorData
    };

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Demo mode indicator */}
            {isDemoMode && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2">
                    <p className="text-sm text-amber-600 font-medium text-center">
                        ⚡ Mode démonstration — Les données affichées sont simulées
                    </p>
                </div>
            )}

            {/* Models used indicator */}
            {modelsUsed && modelsUsed.length > 0 && !isDemoMode && (
                <div className="bg-primary/5 border-b border-primary/20 px-6 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Cpu className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Modèles IA utilisés :</span>
                        {modelsUsed.map((model, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-background">
                                {model}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Header with score */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <ScoreGauge score={score.global} />

                    <div className="flex-1 text-center md:text-left space-y-3">
                        <RecommandationBadge recommandation={recommandation || 'RESERVES'} />

                        {seuilAccordable && seuilAccordable > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Seuil accordable estimé :</span>
                                <span className="font-bold text-primary">{formatCurrency(seuilAccordable)}</span>
                            </div>
                        )}

                        {data.confianceExtraction && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span>Confiance extraction : {Math.round(data.confianceExtraction * 100)}%</span>
                            </div>
                        )}
                    </div>

                    {/* Score details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-center p-2 rounded-lg bg-background/50">
                            <p className="text-muted-foreground text-xs">Solvabilité</p>
                            <p className="font-bold text-lg">{score.details.solvabilite}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                            <p className="text-muted-foreground text-xs">Rentabilité</p>
                            <p className="font-bold text-lg">{score.details.rentabilite}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                            <p className="text-muted-foreground text-xs">Structure</p>
                            <p className="font-bold text-lg">{score.details.structure}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                            <p className="text-muted-foreground text-xs">Activité</p>
                            <p className="font-bold text-lg">{score.details.activite}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score justifications */}
            {score.justifications && (
                <div className="px-6 py-4 border-b bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Justifications du scoring</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {score.justifications.solvabilite && (
                            <div className="p-3 rounded-lg bg-background border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Solvabilité</p>
                                <p className="text-foreground">{score.justifications.solvabilite}</p>
                            </div>
                        )}
                        {score.justifications.rentabilite && (
                            <div className="p-3 rounded-lg bg-background border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Rentabilité</p>
                                <p className="text-foreground">{score.justifications.rentabilite}</p>
                            </div>
                        )}
                        {score.justifications.structure && (
                            <div className="p-3 rounded-lg bg-background border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Structure</p>
                                <p className="text-foreground">{score.justifications.structure}</p>
                            </div>
                        )}
                        {score.justifications.activite && (
                            <div className="p-3 rounded-lg bg-background border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Activité</p>
                                <p className="text-foreground">{score.justifications.activite}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Synthesis section */}
            {syntheseNarrative && (
                <div className="px-6 py-4 border-b">
                    <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold text-foreground">Synthèse IA</span>
                        <Badge variant="outline" className="text-xs">Cohere</Badge>
                    </div>

                    {syntheseNarrative.resumeExecutif && (
                        <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-sm font-medium text-primary mb-1">Résumé exécutif</p>
                            <p className="text-sm text-foreground">{syntheseNarrative.resumeExecutif}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {syntheseNarrative.pointsForts && syntheseNarrative.pointsForts.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                    <span className="text-sm font-medium text-success">Points forts</span>
                                </div>
                                <ul className="space-y-1">
                                    {syntheseNarrative.pointsForts.map((point, i) => (
                                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                            <span className="text-success mt-1">•</span>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {syntheseNarrative.pointsVigilance && syntheseNarrative.pointsVigilance.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-warning" />
                                    <span className="text-sm font-medium text-warning">Points de vigilance</span>
                                </div>
                                <ul className="space-y-1">
                                    {syntheseNarrative.pointsVigilance.map((point, i) => (
                                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                            <span className="text-warning mt-1">•</span>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {syntheseNarrative.recommandationsConditions && syntheseNarrative.recommandationsConditions.length > 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Recommandations</span>
                            </div>
                            <ul className="space-y-1">
                                {syntheseNarrative.recommandationsConditions.map((rec, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-primary mt-1">→</span>
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {syntheseNarrative.conclusionArgumentee && (
                        <div className="mt-4 p-3 rounded-lg border">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Conclusion</p>
                            <p className="text-sm text-foreground">{syntheseNarrative.conclusionArgumentee}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Sector analysis section */}
            {(sectorData || data.entreprise.secteurActivite) && (
                <div className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-blue-500" />
                            <span className="font-semibold text-foreground">Analyse sectorielle</span>
                            <Badge variant="outline" className="text-xs">Perplexity</Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshSectorAnalysis}
                            disabled={isRefreshingSector}
                        >
                            <RefreshCw className={cn('h-4 w-4 mr-1', isRefreshingSector && 'animate-spin')} />
                            {isRefreshingSector ? 'Actualisation...' : 'Actualiser'}
                        </Button>
                    </div>

                    {sectorData ? (
                        <>
                            {sectorData.contexteMarche && (
                                <div className="mb-4">
                                    <p className="text-sm text-muted-foreground mb-2 font-medium">Contexte de marché</p>
                                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                                        {sectorData.contexteMarche}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sectorData.risquesSecteur && sectorData.risquesSecteur.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-destructive" />
                                            <span className="text-sm font-medium text-destructive">Risques sectoriels</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {sectorData.risquesSecteur.map((risque, i) => (
                                                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                                    <span className="text-destructive mt-1">⚠</span>
                                                    <span>{risque}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {sectorData.opportunites && sectorData.opportunites.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-success" />
                                            <span className="text-sm font-medium text-success">Opportunités</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {sectorData.opportunites.map((opp, i) => (
                                                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                                    <span className="text-success mt-1">✓</span>
                                                    <span>{opp}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {sectorData.benchmarkConcurrents && (
                                <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                    <p className="text-sm font-medium text-blue-600 mb-1">Benchmark concurrentiel</p>
                                    <p className="text-sm text-foreground">{sectorData.benchmarkConcurrents}</p>
                                </div>
                            )}

                            {sectorData.sources && sectorData.sources.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs text-muted-foreground mb-1">Sources ({sectorData.sources.length})</p>
                                    <div className="flex flex-wrap gap-1">
                                        {sectorData.sources.slice(0, 3).map((src, i) => {
                                            try {
                                                return (
                                                    <a 
                                                        key={i} 
                                                        href={src} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-primary hover:underline truncate max-w-[200px]"
                                                    >
                                                        {new URL(src).hostname}
                                                    </a>
                                                );
                                            } catch {
                                                return null;
                                            }
                                        })}
                                        {sectorData.sources.length > 3 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{sectorData.sources.length - 3} autres
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-6 text-muted-foreground">
                            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm mb-2">Analyse sectorielle non disponible</p>
                            <p className="text-xs">Cliquez sur "Actualiser" pour charger les données en temps réel</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detected documents */}
            {data.documentsDetectes && data.documentsDetectes.length > 0 && (
                <div className="px-6 py-4 border-b flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Documents détectés :</span>
                    {data.documentsDetectes.map((doc, i) => (
                        <Badge key={i} variant="secondary">{doc}</Badge>
                    ))}
                </div>
            )}

            {/* Extracted data sections */}
            <div className="p-6 space-y-3">
                <DataSection title="Entreprise" icon={Building2} defaultOpen>
                    <DataRow label="SIREN" value={data.entreprise.siren} />
                    <DataRow label="SIRET" value={data.entreprise.siret} />
                    <DataRow label="Raison sociale" value={data.entreprise.raisonSociale} />
                    <DataRow label="Forme juridique" value={data.entreprise.formeJuridique} />
                    <DataRow label="Date de création" value={data.entreprise.dateCreation} />
                    <DataRow label="Code NAF" value={data.entreprise.codeNaf} />
                    <DataRow label="Secteur" value={data.entreprise.secteurActivite} />
                    <DataRow label="Adresse" value={data.entreprise.adresseSiege} />
                    <DataRow label="Effectif" value={data.entreprise.nbSalaries} />
                </DataSection>

                <DataSection title="Dirigeant" icon={User}>
                    <DataRow label="Nom" value={data.dirigeant.nom} />
                    <DataRow label="Prénom" value={data.dirigeant.prenom} />
                    <DataRow label="Fonction" value={data.dirigeant.fonction} />
                    <DataRow label="Date de naissance" value={data.dirigeant.dateNaissance} />
                    <DataRow label="Téléphone" value={data.dirigeant.telephone} />
                    <DataRow label="Email" value={data.dirigeant.email} />
                </DataSection>

                <DataSection title="Données financières" icon={TrendingUp}>
                    {data.finances.annees.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 font-medium text-muted-foreground">Année</th>
                                        <th className="text-right py-2 font-medium text-muted-foreground">CA</th>
                                        <th className="text-right py-2 font-medium text-muted-foreground">Résultat net</th>
                                        <th className="text-right py-2 font-medium text-muted-foreground">EBITDA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.finances.annees.map((annee, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="py-2 font-medium">{annee.annee}</td>
                                            <td className="py-2 text-right">{formatCurrency(annee.chiffreAffaires)}</td>
                                            <td className="py-2 text-right">{formatCurrency(annee.resultatNet)}</td>
                                            <td className="py-2 text-right">{formatCurrency(annee.ebitda)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Aucune donnée financière extraite</p>
                    )}
                </DataSection>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-muted/30 border-t">
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        className="flex-1"
                        size="lg"
                        onClick={onCreateDossier}
                        disabled={isCreating}
                    >
                        {isCreating ? 'Création en cours...' : 'Créer le dossier'}
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={onManualMode}
                        disabled={isCreating}
                    >
                        Mode manuel
                    </Button>
                </div>

                <Separator className="my-4" />

                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Aperçu
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveToHistory}
                        disabled={isSaving}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Sauvegarde...' : 'Historique'}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" disabled={isDownloading || isDownloadingWord}>
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
                                <FileText className="h-4 w-4 mr-2" />
                                {isDownloading ? 'Génération...' : 'Format PDF'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDownloadWord} disabled={isDownloadingWord}>
                                <FileType className="h-4 w-4 mr-2" />
                                {isDownloadingWord ? 'Génération...' : 'Format Word (.docx)'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* PDF Preview Modal */}
            <PDFPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                result={updatedResult}
                onRefreshSectorAnalysis={handleRefreshSectorAnalysis}
                isRefreshingSector={isRefreshingSector}
            />
        </div>
    );
}
