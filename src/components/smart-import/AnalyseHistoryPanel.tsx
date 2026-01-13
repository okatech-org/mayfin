import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
    History, 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    Trash2, 
    ChevronDown, 
    ChevronUp,
    GitCompare,
    Clock,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useAnalyseHistory, type AnalyseHistoryEntry, type ScoreComparison } from '@/hooks/useAnalyseHistory';

interface AnalyseHistoryPanelProps {
    dossierId?: string;
    onSelectAnalysis?: (entry: AnalyseHistoryEntry) => void;
}

function ScoreChange({ change, label }: { change: number; label: string }) {
    if (change === 0) {
        return (
            <div className="flex items-center gap-1 text-muted-foreground">
                <Minus className="h-3 w-3" />
                <span className="text-xs">{label}: =</span>
            </div>
        );
    }

    const isPositive = change > 0;
    return (
        <div className={cn('flex items-center gap-1', isPositive ? 'text-success' : 'text-destructive')}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="text-xs">{label}: {isPositive ? '+' : ''}{change}</span>
        </div>
    );
}

function ComparisonCard({ comparison }: { comparison: ScoreComparison }) {
    const { current, previous, changes } = comparison;

    if (!previous || !changes) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                Pas de version précédente pour comparaison
            </div>
        );
    }

    const globalChange = changes.global;
    const globalColor = globalChange > 0 ? 'text-success' : globalChange < 0 ? 'text-destructive' : 'text-muted-foreground';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">Version {previous.version}</p>
                    <p className="text-2xl font-bold">{previous.score_global}</p>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(previous.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                </div>

                <div className="flex flex-col items-center">
                    <GitCompare className="h-5 w-5 text-primary" />
                    <span className={cn('text-lg font-bold', globalColor)}>
                        {globalChange > 0 ? '+' : ''}{globalChange}
                    </span>
                </div>

                <div className="text-center">
                    <p className="text-xs text-muted-foreground">Version {current.version}</p>
                    <p className="text-2xl font-bold">{current.score_global}</p>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(current.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
                <ScoreChange change={changes.solvabilite} label="Solvabilité" />
                <ScoreChange change={changes.rentabilite} label="Rentabilité" />
                <ScoreChange change={changes.structure} label="Structure" />
                <ScoreChange change={changes.activite} label="Activité" />
            </div>
        </div>
    );
}

function HistoryEntryCard({ 
    entry, 
    onDelete, 
    onSelect,
    isDeleting 
}: { 
    entry: AnalyseHistoryEntry; 
    onDelete: () => void;
    onSelect?: () => void;
    isDeleting: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const scoreColor = entry.score_global >= 70 ? 'text-success' : entry.score_global >= 45 ? 'text-warning' : 'text-destructive';
    const recoBadge = entry.recommandation === 'FAVORABLE' 
        ? 'bg-success/20 text-success' 
        : entry.recommandation === 'DEFAVORABLE' 
            ? 'bg-destructive/20 text-destructive' 
            : 'bg-warning/20 text-warning';

    const extractedData = entry.extracted_data as { entreprise?: { raisonSociale?: string } };

    return (
        <Card className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(entry.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                        </span>
                                        <Badge variant="outline" className="text-xs">v{entry.version}</Badge>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {extractedData?.entreprise?.raisonSociale || 'Analyse sans dossier'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn('text-lg font-bold', scoreColor)}>
                                    {entry.score_global}/100
                                </span>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge className={cn('text-xs', recoBadge)}>
                                {entry.recommandation || 'Non défini'}
                            </Badge>
                            {entry.seuil_accordable && (
                                <Badge variant="secondary" className="text-xs">
                                    Seuil: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(entry.seuil_accordable)}
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">Solvabilité</p>
                                <p className="font-bold">{entry.score_solvabilite || '-'}</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">Rentabilité</p>
                                <p className="font-bold">{entry.score_rentabilite || '-'}</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">Structure</p>
                                <p className="font-bold">{entry.score_structure || '-'}</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">Activité</p>
                                <p className="font-bold">{entry.score_activite || '-'}</p>
                            </div>
                        </div>

                        {entry.models_used && entry.models_used.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-muted-foreground">Modèles:</span>
                                {entry.models_used.map((model, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                        {model}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {entry.notes && (
                            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                {entry.notes}
                            </p>
                        )}

                        <div className="flex gap-2">
                            {onSelect && (
                                <Button variant="outline" size="sm" onClick={onSelect} className="flex-1">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Voir détails
                                </Button>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer cette analyse ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Cette action est irréversible. L'historique de cette analyse sera définitivement supprimé.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

export function AnalyseHistoryPanel({ dossierId, onSelectAnalysis }: AnalyseHistoryPanelProps) {
    const { 
        history, 
        isLoading, 
        deleteFromHistory, 
        isDeleting,
        getLatestComparison 
    } = useAnalyseHistory(dossierId);

    const latestComparison = getLatestComparison();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Historique des analyses
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Chargement...</p>
                </CardContent>
            </Card>
        );
    }

    if (!history || history.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Historique des analyses
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Aucune analyse dans l'historique</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Les analyses seront sauvegardées ici pour comparaison
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historique des analyses
                    <Badge variant="secondary">{history.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Comparison section */}
                {latestComparison && latestComparison.previous && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                            <GitCompare className="h-4 w-4" />
                            Comparaison avec la version précédente
                        </p>
                        <ComparisonCard comparison={latestComparison} />
                    </div>
                )}

                {/* History list */}
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                        {history.map((entry) => (
                            <HistoryEntryCard
                                key={entry.id}
                                entry={entry}
                                onDelete={() => deleteFromHistory(entry.id)}
                                onSelect={onSelectAnalysis ? () => onSelectAnalysis(entry) : undefined}
                                isDeleting={isDeleting}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
