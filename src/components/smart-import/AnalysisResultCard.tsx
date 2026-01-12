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
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AnalysisResult, ExtractedData } from '@/hooks/useDocumentAnalysis';

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
    defaultOpen = false
}: {
    title: string;
    icon: typeof Building2;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">{title}</span>
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
    const { data, score, recommandation, seuilAccordable } = result;

    if (!data || !score) return null;

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
            <div className="px-6 py-4 bg-muted/30 border-t flex flex-col sm:flex-row gap-3">
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
        </div>
    );
}
