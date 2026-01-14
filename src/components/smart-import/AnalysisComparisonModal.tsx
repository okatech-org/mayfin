import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GitCompare, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { AnalyseHistoryEntry } from '@/hooks/useAnalyseHistory';

interface AnalysisComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis1: AnalyseHistoryEntry | null;
    analysis2: AnalyseHistoryEntry | null;
}

function ScoreIndicator({ score, label }: { score: number | null; label: string }) {
    const scoreColor = (score || 0) >= 70 ? 'text-success' : (score || 0) >= 45 ? 'text-warning' : 'text-destructive';
    return (
        <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn('text-2xl font-bold', scoreColor)}>{score ?? '-'}</p>
        </div>
    );
}

function ScoreDiff({ value1, value2, label }: { value1: number | null; value2: number | null; label: string }) {
    const diff = (value2 || 0) - (value1 || 0);
    const diffColor = diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground';
    const DiffIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
    
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-12 text-right">{value1 ?? '-'}</span>
                <div className={cn('flex items-center gap-1 w-16 justify-center', diffColor)}>
                    <DiffIcon className="h-3 w-3" />
                    <span className="text-xs font-medium">
                        {diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : '='}
                    </span>
                </div>
                <span className="text-sm font-medium w-12 text-left">{value2 ?? '-'}</span>
            </div>
        </div>
    );
}

function AnalysisColumn({ analysis, title }: { analysis: AnalyseHistoryEntry; title: string }) {
    const extractedData = analysis.extracted_data as { 
        entreprise?: { raisonSociale?: string; siren?: string };
    };
    
    const scoreColor = analysis.score_global >= 70 ? 'text-success' : analysis.score_global >= 45 ? 'text-warning' : 'text-destructive';
    const recoBadge = analysis.recommandation === 'FAVORABLE' 
        ? 'bg-success/20 text-success' 
        : analysis.recommandation === 'DEFAVORABLE' 
            ? 'bg-destructive/20 text-destructive' 
            : 'bg-warning/20 text-warning';

    return (
        <div className="flex-1 space-y-4">
            <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{title}</p>
                <Badge variant="outline" className="mb-2">v{analysis.version}</Badge>
                <p className="text-sm font-medium truncate">
                    {extractedData?.entreprise?.raisonSociale || 'Sans nom'}
                </p>
                <p className="text-xs text-muted-foreground">
                    {format(new Date(analysis.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                </p>
            </div>

            <div className="text-center">
                <p className={cn('text-4xl font-bold', scoreColor)}>{analysis.score_global}</p>
                <p className="text-xs text-muted-foreground">/100</p>
            </div>

            <div className="flex justify-center">
                <Badge className={cn('text-xs', recoBadge)}>
                    {analysis.recommandation || 'Non défini'}
                </Badge>
            </div>

            {analysis.seuil_accordable && (
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">Seuil accordable</p>
                    <p className="font-medium">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(analysis.seuil_accordable)}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <ScoreIndicator score={analysis.score_solvabilite} label="Solvabilité" />
                <ScoreIndicator score={analysis.score_rentabilite} label="Rentabilité" />
                <ScoreIndicator score={analysis.score_structure} label="Structure" />
                <ScoreIndicator score={analysis.score_activite} label="Activité" />
            </div>

            {analysis.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{analysis.notes}</p>
                </div>
            )}
        </div>
    );
}

export function AnalysisComparisonModal({ isOpen, onClose, analysis1, analysis2 }: AnalysisComparisonModalProps) {
    if (!analysis1 || !analysis2) return null;

    const globalDiff = analysis2.score_global - analysis1.score_global;
    const globalDiffColor = globalDiff > 0 ? 'text-success' : globalDiff < 0 ? 'text-destructive' : 'text-muted-foreground';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitCompare className="h-5 w-5 text-primary" />
                        Comparaison d'analyses
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6">
                        {/* Side by side comparison */}
                        <div className="flex gap-6">
                            <AnalysisColumn analysis={analysis1} title="Analyse 1" />
                            
                            {/* Central diff indicator */}
                            <div className="flex flex-col items-center justify-center px-4">
                                <div className={cn('text-center p-4 rounded-lg bg-muted/50', globalDiffColor)}>
                                    <GitCompare className="h-6 w-6 mx-auto mb-2" />
                                    <p className="text-2xl font-bold">
                                        {globalDiff > 0 ? '+' : ''}{globalDiff}
                                    </p>
                                    <p className="text-xs">Score global</p>
                                </div>
                            </div>

                            <AnalysisColumn analysis={analysis2} title="Analyse 2" />
                        </div>

                        <Separator />

                        {/* Detailed score comparison */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground mb-3">Évolution des scores</h4>
                            <div className="grid grid-cols-3 text-xs text-center text-muted-foreground mb-2">
                                <span>Analyse 1</span>
                                <span>Différence</span>
                                <span>Analyse 2</span>
                            </div>
                            <ScoreDiff value1={analysis1.score_global} value2={analysis2.score_global} label="Score global" />
                            <ScoreDiff value1={analysis1.score_solvabilite} value2={analysis2.score_solvabilite} label="Solvabilité" />
                            <ScoreDiff value1={analysis1.score_rentabilite} value2={analysis2.score_rentabilite} label="Rentabilité" />
                            <ScoreDiff value1={analysis1.score_structure} value2={analysis2.score_structure} label="Structure" />
                            <ScoreDiff value1={analysis1.score_activite} value2={analysis2.score_activite} label="Activité" />
                            <ScoreDiff value1={analysis1.seuil_accordable} value2={analysis2.seuil_accordable} label="Seuil accordable" />
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
