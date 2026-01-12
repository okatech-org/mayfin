import { Upload, Search, FileSearch, Building2, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { AnalysisStep } from '@/hooks/useDocumentAnalysis';

interface AIAnalysisProgressProps {
    step: AnalysisStep;
    progress: number;
    error?: string | null;
}

const STEPS_CONFIG = [
    { id: 'uploading', label: 'Upload des documents', icon: Upload },
    { id: 'analyzing', label: 'Analyse OCR en cours', icon: Search },
    { id: 'extracting', label: 'Extraction des données', icon: FileSearch },
    { id: 'validating', label: 'Vérification INSEE', icon: Building2 },
    { id: 'scoring', label: 'Calcul du score', icon: BarChart3 },
    { id: 'complete', label: 'Analyse terminée', icon: CheckCircle2 },
];

function getStepIndex(step: AnalysisStep): number {
    const index = STEPS_CONFIG.findIndex((s) => s.id === step);
    return index === -1 ? -1 : index;
}

export function AIAnalysisProgress({ step, progress, error }: AIAnalysisProgressProps) {
    const currentIndex = getStepIndex(step);
    const isComplete = step === 'complete';
    const isError = step === 'error';

    if (step === 'idle') return null;

    return (
        <div className="rounded-xl border bg-card p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    {isComplete ? 'Analyse terminée' : isError ? 'Erreur d\'analyse' : 'Analyse en cours...'}
                </h3>
                <span className="text-sm font-medium text-muted-foreground">
                    {Math.round(progress)}%
                </span>
            </div>

            <Progress value={progress} className="h-2" />

            {isError && error && (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="grid gap-3">
                {STEPS_CONFIG.map((stepConfig, index) => {
                    const StepIcon = stepConfig.icon;
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex || isComplete;
                    const isPending = index > currentIndex;

                    return (
                        <div
                            key={stepConfig.id}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-4 py-3 transition-all',
                                isActive && 'bg-primary/10 border border-primary/30',
                                isCompleted && 'bg-success/10',
                                isPending && 'opacity-50'
                            )}
                        >
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                                    isActive && 'bg-primary text-primary-foreground',
                                    isCompleted && 'bg-success text-success-foreground',
                                    isPending && 'bg-muted text-muted-foreground'
                                )}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <StepIcon className={cn('h-4 w-4', isActive && 'animate-pulse')} />
                                )}
                            </div>
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    isActive && 'text-primary',
                                    isCompleted && 'text-success',
                                    isPending && 'text-muted-foreground'
                                )}
                            >
                                {stepConfig.label}
                            </span>
                            {isActive && !isComplete && (
                                <div className="ml-auto flex gap-1">
                                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
