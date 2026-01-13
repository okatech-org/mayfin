import { useState, useEffect } from 'react';
import { Download, FileText, Building2, User, TrendingUp, Globe, Lightbulb, ChevronDown, ChevronUp, RefreshCw, FileType, Settings2, Save, History, Trash2, AlertTriangle, CheckCircle2, Target, ShoppingCart, Car, Briefcase, ArrowRightLeft, GripVertical, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/hooks/useDocumentAnalysis';
import { generateSmartAnalysisPDF } from '@/lib/rapport-pdf-generator';
import { generateSmartAnalysisWord } from '@/lib/rapport-word-generator';
import { useReportPreferences } from '@/hooks/useReportPreferences';
import { useReportsHistory, ReportHistoryEntry } from '@/hooks/useReportsHistory';
import { SortableSectionsPanel } from './SortableSectionsPanel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    analyseId?: string;
    dossierId?: string;
    onRefreshSectorAnalysis?: () => void;
    isRefreshingSector?: boolean;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
    { id: 'entreprise', label: 'Informations Entreprise', icon: Building2, enabled: true, defaultExpanded: true },
    { id: 'dirigeant', label: 'Dirigeant', icon: User, enabled: true, defaultExpanded: false },
    { id: 'besoin', label: 'Analyse du Besoin', icon: ShoppingCart, enabled: true, defaultExpanded: true },
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

export function DocumentPreviewModal({ isOpen, onClose, result, analyseId, dossierId, onRefreshSectorAnalysis, isRefreshingSector }: DocumentPreviewModalProps) {
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
    const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
    
    const { savedSections, savePreferences, isSaving, isLoading: isLoadingPrefs } = useReportPreferences();
    const { reports, createReportEntry, deleteReport, isLoading: isLoadingHistory } = useReportsHistory();
    
    const { data, score, recommandation, seuilAccordable, besoinAnalyse, analyseSectorielle, syntheseNarrative, modelsUsed } = result;

    // Load saved preferences when available (including order)
    useEffect(() => {
        if (savedSections && savedSections.length > 0 && isOpen) {
            // Restore both order and enabled state from saved preferences
            // Create a map of saved sections for quick lookup
            const savedMap = new Map(savedSections.map(s => [s.id, s]));
            
            // Get sections in saved order, falling back to defaults for any missing
            const orderedSections: SectionConfig[] = [];
            
            // First, add sections in saved order
            savedSections.forEach(savedSection => {
                const defaultSection = DEFAULT_SECTIONS.find(d => d.id === savedSection.id);
                if (defaultSection) {
                    orderedSections.push({
                        ...defaultSection,
                        enabled: savedSection.enabled
                    });
                }
            });
            
            // Add any new default sections that weren't in saved preferences
            DEFAULT_SECTIONS.forEach(defaultSection => {
                if (!savedMap.has(defaultSection.id)) {
                    orderedSections.push(defaultSection);
                }
            });
            
            setSections(orderedSections);
        }
    }, [savedSections, isOpen]);

    // Reset to default configuration
    const handleResetToDefaults = () => {
        setSections([...DEFAULT_SECTIONS]);
        toast.success('Configuration réinitialisée par défaut');
    };

    if (!data || !score) return null;

    const generateFileName = (type: 'pdf' | 'word') => {
        const ext = type === 'pdf' ? 'pdf' : 'docx';
        const siren = data.entreprise.siren || 'entreprise';
        const date = format(new Date(), 'yyyy-MM-dd');
        return `analyse_${siren}_${date}.${ext}`;
    };

    const handleDownloadPDF = async () => {
        if (!result.data) {
            toast.error('Aucune donnée disponible pour générer le PDF');
            return;
        }
        setIsDownloading(true);
        try {
            const fileName = generateFileName('pdf');
            generateSmartAnalysisPDF(result);
            
            // Track in history
            await createReportEntry({
                dossier_id: dossierId,
                analyse_id: analyseId,
                report_type: 'pdf',
                file_name: fileName,
                sections_config: sections,
                raison_sociale: data.entreprise.raisonSociale,
                siren: data.entreprise.siren,
                score_global: score.global
            });
            
            toast.success('PDF téléchargé avec succès');
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            toast.error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
            const fileName = generateFileName('word');
            await generateSmartAnalysisWord(result);
            
            // Track in history
            await createReportEntry({
                dossier_id: dossierId,
                analyse_id: analyseId,
                report_type: 'word',
                file_name: fileName,
                sections_config: sections,
                raison_sociale: data.entreprise.raisonSociale,
                siren: data.entreprise.siren,
                score_global: score.global
            });
            
            toast.success('Document Word téléchargé avec succès');
        } catch (error) {
            console.error('Erreur génération Word:', error);
            toast.error('Erreur lors de la génération du Word');
        } finally {
            setIsDownloadingWord(false);
        }
    };

    const handleSavePreferences = () => {
        savePreferences(sections);
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

                {/* Settings panel with drag & drop */}
                <Collapsible open={showSettings} onOpenChange={setShowSettings}>
                    <CollapsibleContent>
                        <div className="px-6 py-4 bg-muted/30 border-b">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm font-medium">Personnaliser le rapport</p>
                                    <p className="text-xs text-muted-foreground">Activez/désactivez et réorganisez les sections</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetToDefaults}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-1" />
                                        Réinitialiser
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSavePreferences}
                                        disabled={isSaving}
                                    >
                                        <Save className="h-4 w-4 mr-1" />
                                        {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                                    </Button>
                                </div>
                            </div>
                            
                            <SortableSectionsPanel
                                sections={sections}
                                onSectionsChange={setSections}
                                onToggle={toggleSectionEnabled}
                            />
                            
                            <p className="text-xs text-muted-foreground mt-3">
                                {enabledSections.length} section(s) sélectionnée(s)
                                {savedSections && ' • Préférences chargées'}
                            </p>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* Tabs for Preview/History */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'history')} className="flex-1 flex flex-col">
                    <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2 max-w-xs">
                        <TabsTrigger value="preview">
                            <FileText className="h-4 w-4 mr-2" />
                            Aperçu
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            <History className="h-4 w-4 mr-2" />
                            Historique ({reports.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="flex-1 mt-0">
                        <ScrollArea className="max-h-[calc(90vh-350px)]">
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

                        {/* Analyse du Besoin */}
                        {isSectionEnabled('besoin') && (
                            <PreviewSection 
                                title="Analyse du Besoin" 
                                icon={ShoppingCart} 
                                variant={besoinAnalyse?.adequationBesoin && besoinAnalyse.adequationBesoin >= 70 ? 'success' : besoinAnalyse?.adequationBesoin && besoinAnalyse.adequationBesoin >= 45 ? 'warning' : 'default'}
                                isExpanded={expandedSections.besoin}
                                onToggle={() => toggleSection('besoin')}
                                enabled={isSectionEnabled('besoin')}
                                onEnabledChange={(enabled) => toggleSectionEnabled('besoin', enabled)}
                            >
                                {besoinAnalyse ? (
                                    <div className="space-y-4">
                                        {/* Investment Summary */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="p-3 rounded-lg bg-background border text-center">
                                                <p className="text-xs text-muted-foreground">Type d'investissement</p>
                                                <p className="font-medium text-sm mt-1 capitalize">{besoinAnalyse.typeInvestissement || besoinAnalyse.categorieInvestissement}</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-background border text-center">
                                                <p className="text-xs text-muted-foreground">Apport client</p>
                                                <p className="font-medium text-sm mt-1">{formatCurrency(besoinAnalyse.apportClient)}</p>
                                                <p className="text-xs text-muted-foreground">({besoinAnalyse.tauxApport?.toFixed(1) || 0}%)</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-background border text-center">
                                                <p className="text-xs text-muted-foreground">Montant financé</p>
                                                <p className="font-medium text-sm mt-1">{formatCurrency(besoinAnalyse.montantFinance)}</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-background border text-center">
                                                <p className="text-xs text-muted-foreground">Mensualité estimée</p>
                                                <p className="font-medium text-sm mt-1">{formatCurrency(besoinAnalyse.mensualiteEstimee)}</p>
                                            </div>
                                        </div>

                                        {/* Adequation Score */}
                                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                                            <div className="flex-shrink-0">
                                                <div className={cn(
                                                    'h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold',
                                                    besoinAnalyse.adequationBesoin >= 70 ? 'bg-success/20 text-success' :
                                                    besoinAnalyse.adequationBesoin >= 45 ? 'bg-warning/20 text-warning' :
                                                    'bg-destructive/20 text-destructive'
                                                )}>
                                                    {besoinAnalyse.adequationBesoin || 0}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium mb-1">Adéquation Besoin / Capacité</p>
                                                <p className="text-sm text-muted-foreground">{besoinAnalyse.justificationAdequation}</p>
                                            </div>
                                        </div>

                                        {/* Capacity Analysis */}
                                        {besoinAnalyse.capaciteRemboursement > 0 && (
                                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Briefcase className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">Capacité de remboursement mensuelle</span>
                                                </div>
                                                <p className="text-xl font-bold text-primary">{formatCurrency(besoinAnalyse.capaciteRemboursement)}</p>
                                            </div>
                                        )}

                                        {/* Product Recommendation */}
                                        {besoinAnalyse.produitRecommande && (
                                            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                                                <div className="flex items-center gap-2 mb-3">
                                                    {besoinAnalyse.categorieInvestissement === 'vehicule' ? (
                                                        <Car className="h-5 w-5 text-success" />
                                                    ) : (
                                                        <Target className="h-5 w-5 text-success" />
                                                    )}
                                                    <span className="font-medium text-success">Produit Recommandé</span>
                                                </div>
                                                <p className="text-lg font-bold mb-1">{besoinAnalyse.produitRecommande.nom}</p>
                                                <p className="text-sm text-muted-foreground mb-3">{besoinAnalyse.produitRecommande.type}</p>
                                                
                                                {besoinAnalyse.produitRecommande.avantages && besoinAnalyse.produitRecommande.avantages.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-xs font-medium text-success mb-1">Avantages</p>
                                                        <ul className="space-y-1">
                                                            {besoinAnalyse.produitRecommande.avantages.map((a, i) => (
                                                                <li key={i} className="text-sm flex items-start gap-2">
                                                                    <CheckCircle2 className="h-3 w-3 text-success mt-1 flex-shrink-0" />
                                                                    <span>{a}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {besoinAnalyse.produitRecommande.conditions && besoinAnalyse.produitRecommande.conditions.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Conditions</p>
                                                        <ul className="space-y-1">
                                                            {besoinAnalyse.produitRecommande.conditions.map((c, i) => (
                                                                <li key={i} className="text-xs text-muted-foreground">• {c}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Alternative product */}
                                                {besoinAnalyse.produitRecommande.alternative && (
                                                    <div className="mt-3 pt-3 border-t border-success/20">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-xs font-medium">Alternative: {besoinAnalyse.produitRecommande.alternative.nom}</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{besoinAnalyse.produitRecommande.alternative.raison}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Alerts */}
                                        {besoinAnalyse.alertes && besoinAnalyse.alertes.length > 0 && (
                                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                                                <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    Alertes
                                                </p>
                                                <ul className="space-y-1">
                                                    {besoinAnalyse.alertes.map((a, i) => (
                                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                            <span className="text-destructive">•</span>
                                                            <span>{a}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Structuring Recommendations */}
                                        {besoinAnalyse.recommandationsStructuration && besoinAnalyse.recommandationsStructuration.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                                    <Lightbulb className="h-4 w-4 text-primary" />
                                                    Recommandations de structuration
                                                </p>
                                                <ul className="space-y-1 bg-muted/30 p-3 rounded-lg">
                                                    {besoinAnalyse.recommandationsStructuration.map((r, i) => (
                                                        <li key={i} className="text-sm text-muted-foreground">
                                                            → {r}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Analyse du besoin non disponible</p>
                                        <p className="text-xs mt-1">Renseignez le type de bien et l'apport client lors de l'import pour activer cette analyse</p>
                                    </div>
                                )}
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
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 mt-0">
                        <ScrollArea className="max-h-[calc(90vh-350px)]">
                            <div className="p-6 space-y-4">
                                {isLoadingHistory ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Chargement de l'historique...
                                    </div>
                                ) : reports.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="font-medium">Aucun rapport généré</p>
                                        <p className="text-sm">Les rapports téléchargés apparaîtront ici</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {reports.map((report) => (
                                            <div 
                                                key={report.id} 
                                                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {report.report_type === 'pdf' ? (
                                                        <FileText className="h-8 w-8 text-destructive" />
                                                    ) : (
                                                        <FileType className="h-8 w-8 text-primary" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-sm">{report.file_name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>{report.raison_sociale || 'Entreprise'}</span>
                                                            {report.score_global && (
                                                                <>
                                                                    <span>•</span>
                                                                    <Badge variant="outline" className={cn('text-xs', 
                                                                        report.score_global >= 70 ? 'text-success' : 
                                                                        report.score_global >= 45 ? 'text-warning' : 'text-destructive'
                                                                    )}>
                                                                        Score: {report.score_global}
                                                                    </Badge>
                                                                </>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(report.generated_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteReport(report.id)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

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
