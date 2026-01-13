import { useState } from 'react';
import { X, Download, FileText, Building2, User, TrendingUp, Globe, Lightbulb, Target, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, FileType, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/hooks/useDocumentAnalysis';
import { generateSmartAnalysisPDF } from '@/lib/rapport-pdf-generator';
import { generateSmartAnalysisWord } from '@/lib/rapport-word-generator';
import { toast } from 'sonner';

export interface SectionConfig {
    id: string;
    label: string;
    icon: typeof FileText;
    enabled: boolean;
    defaultExpanded?: boolean;
}

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: AnalysisResult;
    onRefreshSectorAnalysis?: () => void;
    isRefreshingSector?: boolean;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
    { id: 'entreprise', label: 'Informations Entreprise', icon: Building2, enabled: true, defaultExpanded: true },
    { id: 'dirigeant', label: 'Dirigeant', icon: User, enabled: true, defaultExpanded: false },
    { id: 'scoring', label: 'Scoring Détaillé', icon: TrendingUp, enabled: true, defaultExpanded: true },
    { id: 'secteur', label: 'Analyse Sectorielle', icon: Globe, enabled: true, defaultExpanded: true },
    { id: 'synthese', label: 'Synthèse IA', icon: Lightbulb, enabled: true, defaultExpanded: true },
    { id: 'financier', label: 'Données Financières', icon: TrendingUp, enabled: true, defaultExpanded: false },
];

function PreviewSection({
    title,
    icon: Icon,
    children,
    variant = 'default',
    isExpanded,
    onToggle,
    enabled,
    onEnabledChange
}: {
    title: string;
    icon: typeof FileText;
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'info';
    isExpanded: boolean;
    onToggle: () => void;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
}) {
    const variantStyles = {
        default: 'border-border bg-card',
        success: 'border-success/30 bg-success/5',
        warning: 'border-warning/30 bg-warning/5',
        info: 'border-primary/30 bg-primary/5'
    };
    
    const iconStyles = {
        default: 'text-muted-foreground',
        success: 'text-success',
        warning: 'text-warning',
        info: 'text-primary'
    };

    return (
        <div className={cn('rounded-lg border', variantStyles[variant], !enabled && 'opacity-50')}>
            <div className="flex items-center gap-2 p-4">
                <Checkbox
                    id={`section-${title}`}
                    checked={enabled}
                    onCheckedChange={onEnabledChange}
                    className="mr-2"
                />
                <button
                    onClick={onToggle}
                    className="flex-1 flex items-center justify-between hover:bg-muted/30 transition-colors rounded p-1 -m-1"
                    disabled={!enabled}
                >
                    <div className="flex items-center gap-3">
                        <Icon className={cn('h-5 w-5', iconStyles[variant])} />
                        <span className="font-medium text-foreground">{title}</span>
                    </div>
                    {enabled && (isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                </button>
            </div>
            {enabled && isExpanded && (
                <div className="px-4 pb-4 pt-0">
                    <Separator className="mb-4" />
                    {children}
                </div>
            )}
        </div>
    );
}

function formatCurrency(value?: number): string {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function DocumentPreviewModal({ isOpen, onClose, result, onRefreshSectorAnalysis, isRefreshingSector }: DocumentPreviewModalProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadingWord, setIsDownloadingWord] = useState(false);
    const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        DEFAULT_SECTIONS.forEach(s => {
            initial[s.id] = s.defaultExpanded ?? false;
        });
        return initial;
    });
    const [showSettings, setShowSettings] = useState(false);
    
    const { data, score, recommandation, seuilAccordable, analyseSectorielle, syntheseNarrative, modelsUsed } = result;

    if (!data || !score) return null;

    const handleDownloadPDF = () => {
        if (!result.data) {
            toast.error('Aucune donnée disponible pour générer le PDF');
            return;
        }
        setIsDownloading(true);
        try {
            generateSmartAnalysisPDF(result);
            toast.success('PDF téléchargé avec succès');
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            toast.error('Erreur lors de la génération du PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadWord = async () => {
        if (!result.data) {
            toast.error('Aucune donnée disponible pour générer le document Word');
            return;
        }
        setIsDownloadingWord(true);
        try {
            await generateSmartAnalysisWord(result);
            toast.success('Document Word téléchargé avec succès');
        } catch (error) {
            console.error('Erreur génération Word:', error);
            toast.error('Erreur lors de la génération du Word');
        } finally {
            setIsDownloadingWord(false);
        }
    };

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSectionEnabled = (id: string, enabled: boolean) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    };

    const enabledSections = sections.filter(s => s.enabled);
    const scoreColor = score.global >= 70 ? 'text-success' : score.global >= 45 ? 'text-warning' : 'text-destructive';
    const recoBg = recommandation === 'FAVORABLE' ? 'bg-success/20 text-success' : recommandation === 'DEFAVORABLE' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning';

    const isSectionEnabled = (id: string) => sections.find(s => s.id === id)?.enabled ?? false;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-primary" />
                            <DialogTitle className="text-xl">Aperçu du Rapport</DialogTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSettings(!showSettings)}
                                className={cn(showSettings && 'bg-muted')}
                            >
                                <Settings2 className="h-4 w-4 mr-1" />
                                Personnaliser
                            </Button>
                            <Badge variant="outline" className={cn('px-3 py-1', recoBg)}>
                                {recommandation}
                            </Badge>
                            <Badge variant="secondary" className={cn('px-3 py-1 text-lg font-bold', scoreColor)}>
                                Score: {score.global}/100
                            </Badge>
                        </div>
                    </div>
                    {modelsUsed && modelsUsed.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="text-xs text-muted-foreground">Modèles IA:</span>
                            {modelsUsed.map((model, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                    {model}
                                </Badge>
                            ))}
                        </div>
                    )}
                </DialogHeader>

                {/* Settings panel */}
                <Collapsible open={showSettings} onOpenChange={setShowSettings}>
                    <CollapsibleContent>
                        <div className="px-6 py-4 bg-muted/30 border-b">
                            <p className="text-sm font-medium mb-3">Sections à inclure dans le rapport :</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {sections.map(section => (
                                    <div key={section.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`setting-${section.id}`}
                                            checked={section.enabled}
                                            onCheckedChange={(checked) => toggleSectionEnabled(section.id, !!checked)}
                                        />
                                        <Label htmlFor={`setting-${section.id}`} className="text-sm cursor-pointer">
                                            {section.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {enabledSections.length} section(s) sélectionnée(s)
                            </p>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <ScrollArea className="flex-1 max-h-[calc(90vh-250px)]">
                    <div className="p-6 space-y-4">
                        {/* Enterprise Info */}
                        {isSectionEnabled('entreprise') && (
                            <PreviewSection 
                                title="Informations Entreprise" 
                                icon={Building2}
                                isExpanded={expandedSections.entreprise}
                                onToggle={() => toggleSection('entreprise')}
                                enabled={isSectionEnabled('entreprise')}
                                onEnabledChange={(enabled) => toggleSectionEnabled('entreprise', enabled)}
                            >
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Raison sociale:</span>
                                        <p className="font-medium">{data.entreprise.raisonSociale || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">SIREN:</span>
                                        <p className="font-medium">{data.entreprise.siren || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Forme juridique:</span>
                                        <p className="font-medium">{data.entreprise.formeJuridique || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Secteur:</span>
                                        <p className="font-medium">{data.entreprise.secteurActivite || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Code NAF:</span>
                                        <p className="font-medium">{data.entreprise.codeNaf || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Effectif:</span>
                                        <p className="font-medium">{data.entreprise.nbSalaries || '-'} salariés</p>
                                    </div>
                                </div>
                            </PreviewSection>
                        )}

                        {/* Dirigeant */}
                        {isSectionEnabled('dirigeant') && (
                            <PreviewSection 
                                title="Dirigeant" 
                                icon={User}
                                isExpanded={expandedSections.dirigeant}
                                onToggle={() => toggleSection('dirigeant')}
                                enabled={isSectionEnabled('dirigeant')}
                                onEnabledChange={(enabled) => toggleSectionEnabled('dirigeant', enabled)}
                            >
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Nom:</span>
                                        <p className="font-medium">{data.dirigeant.nom} {data.dirigeant.prenom}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Fonction:</span>
                                        <p className="font-medium">{data.dirigeant.fonction || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email:</span>
                                        <p className="font-medium">{data.dirigeant.email || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Téléphone:</span>
                                        <p className="font-medium">{data.dirigeant.telephone || '-'}</p>
                                    </div>
                                </div>
                            </PreviewSection>
                        )}

                        {/* Scoring détaillé */}
                        {isSectionEnabled('scoring') && (
                            <PreviewSection 
                                title="Scoring Détaillé" 
                                icon={TrendingUp} 
                                variant="info"
                                isExpanded={expandedSections.scoring}
                                onToggle={() => toggleSection('scoring')}
                                enabled={isSectionEnabled('scoring')}
                                onEnabledChange={(enabled) => toggleSectionEnabled('scoring', enabled)}
                            >
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    {Object.entries(score.details).map(([key, value]) => (
                                        <div key={key} className="text-center p-3 rounded-lg bg-background border">
                                            <p className="text-xs text-muted-foreground capitalize">{key}</p>
                                            <p className={cn('text-2xl font-bold', value >= 70 ? 'text-success' : value >= 45 ? 'text-warning' : 'text-destructive')}>
                                                {value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {score.justifications && (
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium">Justifications:</p>
                                        {Object.entries(score.justifications).map(([key, value]) => (
                                            <div key={key} className="p-3 rounded-lg bg-muted/50 text-sm">
                                                <span className="font-medium capitalize">{key}:</span>
                                                <span className="text-muted-foreground ml-2">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {seuilAccordable && (
                                    <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                                        <span className="text-sm text-muted-foreground">Seuil accordable estimé:</span>
                                        <p className="text-xl font-bold text-primary">{formatCurrency(seuilAccordable)}</p>
                                    </div>
                                )}
                            </PreviewSection>
                        )}

                        {/* Analyse sectorielle */}
                        {isSectionEnabled('secteur') && (
                            <PreviewSection 
                                title="Analyse Sectorielle" 
                                icon={Globe} 
                                variant="info"
                                isExpanded={expandedSections.secteur}
                                onToggle={() => toggleSection('secteur')}
                                enabled={isSectionEnabled('secteur')}
                                onEnabledChange={(enabled) => toggleSectionEnabled('secteur', enabled)}
                            >
                                {analyseSectorielle ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium mb-2">Contexte de marché:</p>
                                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                                {analyseSectorielle.contexteMarche}
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            {analyseSectorielle.risquesSecteur && analyseSectorielle.risquesSecteur.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        Risques sectoriels
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {analyseSectorielle.risquesSecteur.map((r, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                                <span className="text-destructive">•</span>
                                                                <span>{r}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {analyseSectorielle.opportunites && analyseSectorielle.opportunites.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Opportunités
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {analyseSectorielle.opportunites.map((o, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                                <span className="text-success">•</span>
                                                                <span>{o}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {analyseSectorielle.benchmarkConcurrents && (
                                            <div>
                                                <p className="text-sm font-medium mb-2">Benchmark concurrentiel:</p>
                                                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                                    {analyseSectorielle.benchmarkConcurrents}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Analyse sectorielle non disponible</p>
                                        {onRefreshSectorAnalysis && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={onRefreshSectorAnalysis}
                                                disabled={isRefreshingSector}
                                                className="mt-3"
                                            >
                                                <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshingSector && 'animate-spin')} />
                                                {isRefreshingSector ? 'Chargement...' : 'Charger avec Perplexity'}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </PreviewSection>
                        )}

                        {/* Synthèse IA */}
                        {isSectionEnabled('synthese') && (
                            <PreviewSection 
                                title="Synthèse IA" 
                                icon={Lightbulb} 
                                variant="success"
                                isExpanded={expandedSections.synthese}
                                onToggle={() => toggleSection('synthese')}
                                enabled={isSectionEnabled('synthese')}
                                onEnabledChange={(enabled) => toggleSectionEnabled('synthese', enabled)}
                            >
                                {syntheseNarrative ? (
                                    <div className="space-y-4">
                                        {syntheseNarrative.resumeExecutif && (
                                            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                                                <p className="text-sm font-medium text-success mb-1">Résumé exécutif</p>
                                                <p className="text-sm">{syntheseNarrative.resumeExecutif}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            {syntheseNarrative.pointsForts && syntheseNarrative.pointsForts.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium text-success mb-2">Points forts</p>
                                                    <ul className="space-y-1">
                                                        {syntheseNarrative.pointsForts.map((p, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                                <CheckCircle2 className="h-3 w-3 text-success mt-1 flex-shrink-0" />
                                                                <span>{p}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {syntheseNarrative.pointsVigilance && syntheseNarrative.pointsVigilance.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium text-warning mb-2">Points de vigilance</p>
                                                    <ul className="space-y-1">
                                                        {syntheseNarrative.pointsVigilance.map((p, i) => (
                                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                                <AlertTriangle className="h-3 w-3 text-warning mt-1 flex-shrink-0" />
                                                                <span>{p}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {syntheseNarrative.recommandationsConditions && syntheseNarrative.recommandationsConditions.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-primary" />
                                                    Recommandations
                                                </p>
                                                <ul className="space-y-1 bg-muted/30 p-3 rounded-lg">
                                                    {syntheseNarrative.recommandationsConditions.map((r, i) => (
                                                        <li key={i} className="text-sm text-muted-foreground">
                                                            → {r}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {syntheseNarrative.conclusionArgumentee && (
                                            <div className="p-3 rounded-lg border">
                                                <p className="text-sm font-medium mb-1">Conclusion</p>
                                                <p className="text-sm text-muted-foreground">{syntheseNarrative.conclusionArgumentee}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Synthèse narrative non disponible</p>
                                    </div>
                                )}
                            </PreviewSection>
                        )}

                        {/* Données financières */}
                        {isSectionEnabled('financier') && data.finances.annees.length > 0 && (
                            <PreviewSection 
                                title="Données Financières" 
                                icon={TrendingUp}
                                isExpanded={expandedSections.financier}
                                onToggle={() => toggleSection('financier')}
                                enabled={isSectionEnabled('financier')}
                                onEnabledChange={(enabled) => toggleSectionEnabled('financier', enabled)}
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 font-medium">Année</th>
                                                <th className="text-right py-2 font-medium">CA</th>
                                                <th className="text-right py-2 font-medium">Résultat net</th>
                                                <th className="text-right py-2 font-medium">EBITDA</th>
                                                <th className="text-right py-2 font-medium">Capitaux propres</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.finances.annees.map((annee, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-2 font-medium">{annee.annee}</td>
                                                    <td className="py-2 text-right">{formatCurrency(annee.chiffreAffaires)}</td>
                                                    <td className="py-2 text-right">{formatCurrency(annee.resultatNet)}</td>
                                                    <td className="py-2 text-right">{formatCurrency(annee.ebitda)}</td>
                                                    <td className="py-2 text-right">{formatCurrency(annee.capitauxPropres)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </PreviewSection>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        {enabledSections.length} section(s) incluse(s) dans le rapport
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Fermer
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={handleDownloadWord} 
                            disabled={isDownloadingWord}
                        >
                            <FileType className="h-4 w-4 mr-2" />
                            {isDownloadingWord ? 'Génération...' : 'Word'}
                        </Button>
                        <Button onClick={handleDownloadPDF} disabled={isDownloading}>
                            <Download className="h-4 w-4 mr-2" />
                            {isDownloading ? 'Génération...' : 'PDF'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
