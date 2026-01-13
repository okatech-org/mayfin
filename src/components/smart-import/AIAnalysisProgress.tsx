import { useState, useEffect, useMemo } from 'react';
import { 
    Upload, 
    Search, 
    CheckCircle2, 
    XCircle,
    Brain,
    Globe,
    FileText,
    Sparkles,
    Cpu,
    Clock,
    Timer,
    ImageDown,
    HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { AnalysisStep, UploadProgress } from '@/hooks/useDocumentAnalysis';

interface AIAnalysisProgressProps {
    step: AnalysisStep;
    progress: number;
    error?: string | null;
    uploadProgress?: UploadProgress | null;
}

// Main pipeline steps with estimated durations in seconds
const PIPELINE_STEPS = [
    { 
        id: 'compressing', 
        label: 'Compression des images', 
        icon: ImageDown,
        description: 'Optimisation de la taille des fichiers...',
        estimatedSeconds: 3
    },
    { 
        id: 'uploading', 
        label: 'Upload des documents', 
        icon: Upload,
        description: 'Envoi des fichiers au serveur...',
        estimatedSeconds: 5
    },
    { 
        id: 'analyzing', 
        label: 'Analyse OCR (Gemini)', 
        icon: Search,
        description: 'Extraction visuelle des documents',
        model: 'Gemini 2.0 Flash',
        modelColor: 'bg-blue-500',
        estimatedSeconds: 15
    },
    { 
        id: 'extracting', 
        label: 'Analyse financière (GPT-4)', 
        icon: Brain,
        description: 'Évaluation approfondie des données',
        model: 'GPT-4o',
        modelColor: 'bg-green-500',
        estimatedSeconds: 12
    },
    { 
        id: 'validating', 
        label: 'Recherche sectorielle (Perplexity)', 
        icon: Globe,
        description: 'Analyse du contexte de marché',
        model: 'Perplexity Sonar Pro',
        modelColor: 'bg-purple-500',
        estimatedSeconds: 10
    },
    { 
        id: 'scoring', 
        label: 'Synthèse narrative (Cohere)', 
        icon: FileText,
        description: 'Génération du rapport',
        model: 'Cohere Command R+',
        modelColor: 'bg-orange-500',
        estimatedSeconds: 8
    },
    { 
        id: 'complete', 
        label: 'Analyse terminée', 
        icon: CheckCircle2,
        description: 'Tous les modèles ont terminé',
        estimatedSeconds: 0
    },
];

// Format bytes to readable size
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

// Calculate total estimated time
const TOTAL_ESTIMATED_SECONDS = PIPELINE_STEPS.reduce((acc, step) => acc + step.estimatedSeconds, 0);

function getStepIndex(step: AnalysisStep): number {
    const index = PIPELINE_STEPS.findIndex((s) => s.id === step);
    return index === -1 ? -1 : index;
}

// Animated typing effect for descriptions
function TypewriterText({ text, isActive }: { text: string; isActive: boolean }) {
    const [displayText, setDisplayText] = useState('');
    
    useEffect(() => {
        if (!isActive) {
            setDisplayText(text);
            return;
        }
        
        setDisplayText('');
        let index = 0;
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayText(text.slice(0, index + 1));
                index++;
            } else {
                clearInterval(interval);
            }
        }, 30);
        
        return () => clearInterval(interval);
    }, [text, isActive]);
    
    return (
        <span>
            {displayText}
            {isActive && displayText.length < text.length && (
                <span className="animate-pulse">|</span>
            )}
        </span>
    );
}

// Animated progress ring
function ProgressRing({ progress, size = 60 }: { progress: number; size?: number }) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={4}
                    className="text-muted/30"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={4}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-primary animate-pulse" />
            </div>
        </div>
    );
}

// Neural network animation
function NeuralAnimation() {
    return (
        <div className="relative h-16 overflow-hidden mt-4">
            <div className="absolute inset-0 flex items-center justify-center gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        {[...Array(3)].map((_, j) => (
                            <div 
                                key={j}
                                className="h-2 w-2 rounded-full bg-primary/60 animate-pulse"
                                style={{ 
                                    animationDelay: `${(i * 100) + (j * 150)}ms`,
                                    animationDuration: '1.5s'
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
                {[...Array(8)].map((_, i) => (
                    <line
                        key={i}
                        x1={`${15 + (i % 4) * 20}%`}
                        y1={`${20 + Math.floor(i / 4) * 30}%`}
                        x2={`${25 + ((i + 1) % 4) * 20}%`}
                        y2={`${50 + Math.floor((i + 1) / 4) * 30}%`}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-primary/20"
                        strokeDasharray="4 4"
                    >
                        <animate
                            attributeName="stroke-dashoffset"
                            from="8"
                            to="0"
                            dur="1s"
                            repeatCount="indefinite"
                        />
                    </line>
                ))}
            </svg>
        </div>
    );
}

// Time estimation hook
function useTimeEstimation(step: AnalysisStep, startTime: number | null) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const currentIndex = getStepIndex(step);
    
    useEffect(() => {
        if (!startTime || step === 'complete' || step === 'error' || step === 'idle') {
            return;
        }
        
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        
        return () => clearInterval(interval);
    }, [startTime, step]);
    
    const estimatedRemaining = useMemo(() => {
        if (currentIndex < 0 || step === 'complete') return 0;
        
        // Sum up remaining steps
        let remaining = 0;
        for (let i = currentIndex; i < PIPELINE_STEPS.length; i++) {
            remaining += PIPELINE_STEPS[i].estimatedSeconds;
        }
        
        // Adjust based on current step progress
        const currentStepDuration = PIPELINE_STEPS[currentIndex]?.estimatedSeconds || 0;
        const stepProgress = Math.min(elapsedSeconds, currentStepDuration);
        remaining -= stepProgress;
        
        return Math.max(0, remaining);
    }, [currentIndex, elapsedSeconds, step]);
    
    return { elapsedSeconds, estimatedRemaining };
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Time display component
function TimeDisplay({ 
    elapsedSeconds, 
    estimatedRemaining, 
    isComplete 
}: { 
    elapsedSeconds: number; 
    estimatedRemaining: number;
    isComplete: boolean;
}) {
    if (isComplete) {
        return (
            <div className="flex items-center gap-2 text-success">
                <Timer className="h-4 w-4" />
                <span className="text-sm font-medium">
                    Terminé en {formatTime(elapsedSeconds)}
                </span>
            </div>
        );
    }
    
    return (
        <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>Écoulé: {formatTime(elapsedSeconds)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
                <Clock className="h-4 w-4 animate-pulse" />
                <span className="font-medium">~{formatTime(estimatedRemaining)} restant</span>
            </div>
        </div>
    );
}

export function AIAnalysisProgress({ step, progress, error, uploadProgress }: AIAnalysisProgressProps) {
    const currentIndex = getStepIndex(step);
    const isComplete = step === 'complete';
    const isError = step === 'error';
    const currentStepConfig = PIPELINE_STEPS[currentIndex];
    
    // Track start time
    const [startTime, setStartTime] = useState<number | null>(null);
    
    useEffect(() => {
        if (step !== 'idle' && step !== 'complete' && step !== 'error' && !startTime) {
            setStartTime(Date.now());
        }
        if (step === 'idle') {
            setStartTime(null);
        }
    }, [step, startTime]);
    
    const { elapsedSeconds, estimatedRemaining } = useTimeEstimation(step, startTime);

    // Generate detailed description based on upload progress
    const getDetailedDescription = () => {
        if (!uploadProgress) return currentStepConfig?.description || '';
        
        if (uploadProgress.phase === 'compressing') {
            return `Compression de ${uploadProgress.fileName || 'image'}... (${uploadProgress.current}/${uploadProgress.total})`;
        }
        
        if (uploadProgress.phase === 'uploading') {
            const bytesInfo = uploadProgress.bytesTotal 
                ? ` • ${formatBytes(uploadProgress.bytesUploaded || 0)} / ${formatBytes(uploadProgress.bytesTotal)}`
                : '';
            return `Envoi de ${uploadProgress.fileName || 'fichier'}... (${uploadProgress.current}/${uploadProgress.total})${bytesInfo}`;
        }
        
        if (uploadProgress.phase === 'analyzing') {
            const phases = ['OCR', 'Analyse financière', 'Recherche sectorielle', 'Synthèse'];
            return phases[uploadProgress.current - 1] || currentStepConfig?.description || '';
        }
        
        return currentStepConfig?.description || '';
    };

    if (step === 'idle') return null;

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Header with animation */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                <div className="flex items-center gap-4">
                    <ProgressRing progress={progress} />
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-foreground">
                                {isComplete ? '✨ Analyse terminée' : isError ? '❌ Erreur d\'analyse' : '🧠 Analyse Multi-LLM en cours'}
                            </h3>
                            {!isComplete && !isError && (
                                <Badge variant="outline" className="animate-pulse">
                                    {Math.round(progress)}%
                                </Badge>
                            )}
                        </div>
                        
                        {currentStepConfig && !isComplete && !isError && (
                            <p className="text-sm text-muted-foreground">
                                <TypewriterText 
                                    text={getDetailedDescription()} 
                                    isActive={true}
                                />
                            </p>
                        )}
                        
                        {isComplete && (
                            <p className="text-sm text-success">
                                Tous les modèles IA ont terminé leur analyse avec succès
                            </p>
                        )}
                    </div>
                    
                    {/* Time estimation - desktop */}
                    <div className="hidden sm:block">
                        <TimeDisplay 
                            elapsedSeconds={elapsedSeconds} 
                            estimatedRemaining={estimatedRemaining}
                            isComplete={isComplete}
                        />
                    </div>
                </div>
                
                {/* Mobile time display */}
                <div className="sm:hidden mt-3">
                    <TimeDisplay 
                        elapsedSeconds={elapsedSeconds} 
                        estimatedRemaining={estimatedRemaining}
                        isComplete={isComplete}
                    />
                </div>

                {/* Neural network animation when processing */}
                {!isComplete && !isError && currentIndex >= 1 && currentIndex < 5 && (
                    <NeuralAnimation />
                )}
            </div>

            {/* Main progress bar with time markers */}
            <div className="px-6 py-3 bg-muted/30">
                <div className="flex items-center gap-3">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {Math.round(progress)}%
                    </span>
                </div>
                
                {/* File upload progress details */}
                {uploadProgress && (uploadProgress.phase === 'compressing' || uploadProgress.phase === 'uploading') && (
                    <div className="mt-3 p-3 rounded-lg bg-background/50 border">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm">
                                {uploadProgress.phase === 'compressing' ? (
                                    <ImageDown className="h-4 w-4 text-primary animate-pulse" />
                                ) : (
                                    <HardDrive className="h-4 w-4 text-primary animate-pulse" />
                                )}
                                <span className="font-medium truncate max-w-[200px]">
                                    {uploadProgress.fileName || 'Fichier'}
                                </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {uploadProgress.current}/{uploadProgress.total}
                            </Badge>
                        </div>
                        <Progress 
                            value={(uploadProgress.current / uploadProgress.total) * 100} 
                            className="h-1.5" 
                        />
                        {uploadProgress.bytesTotal && (
                            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                                <span>{formatBytes(uploadProgress.bytesUploaded || 0)}</span>
                                <span>{formatBytes(uploadProgress.bytesTotal)}</span>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Step time indicators */}
                {!isComplete && !isError && !uploadProgress && (
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Étape {currentIndex + 1}/{PIPELINE_STEPS.length - 1}</span>
                        <span>~{PIPELINE_STEPS[currentIndex]?.estimatedSeconds || 0}s cette étape</span>
                    </div>
                )}
            </div>

            {isError && error && (
                <div className="mx-6 my-4 flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Pipeline steps */}
            <div className="p-6 space-y-3">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Pipeline d'analyse</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        Total estimé: ~{TOTAL_ESTIMATED_SECONDS}s
                    </span>
                </div>

                {PIPELINE_STEPS.map((stepConfig, index) => {
                    const StepIcon = stepConfig.icon;
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex || isComplete;
                    const isPending = index > currentIndex;

                    return (
                        <div
                            key={stepConfig.id}
                            className={cn(
                                'relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300',
                                isActive && 'bg-primary/10 border-2 border-primary/30 shadow-lg shadow-primary/10',
                                isCompleted && 'bg-success/5 border border-success/20',
                                isPending && 'opacity-40 border border-transparent'
                            )}
                        >
                            {/* Step indicator */}
                            <div
                                className={cn(
                                    'relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300',
                                    isActive && 'bg-primary text-primary-foreground scale-110',
                                    isCompleted && 'bg-success text-success-foreground',
                                    isPending && 'bg-muted text-muted-foreground'
                                )}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                    <StepIcon className={cn('h-5 w-5', isActive && 'animate-pulse')} />
                                )}
                                
                                {/* Active ring animation */}
                                {isActive && (
                                    <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
                                )}
                            </div>

                            {/* Step content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={cn(
                                            'font-medium transition-colors',
                                            isActive && 'text-primary',
                                            isCompleted && 'text-success',
                                            isPending && 'text-muted-foreground'
                                        )}
                                    >
                                        {stepConfig.label}
                                    </span>
                                    
                                    {stepConfig.model && (
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                'text-xs transition-all',
                                                isActive && `${stepConfig.modelColor} text-white border-transparent`,
                                                isCompleted && 'bg-success/20 text-success border-success/30',
                                                isPending && 'opacity-50'
                                            )}
                                        >
                                            {stepConfig.model}
                                        </Badge>
                                    )}
                                    
                                    {/* Duration badge */}
                                    {stepConfig.estimatedSeconds > 0 && (
                                        <span className={cn(
                                            'text-xs',
                                            isActive ? 'text-primary' : 'text-muted-foreground'
                                        )}>
                                            ~{stepConfig.estimatedSeconds}s
                                        </span>
                                    )}
                                </div>
                                
                                {isActive && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                        {stepConfig.description}
                                    </p>
                                )}
                            </div>

                            {/* Status indicator */}
                            <div className="flex items-center gap-2">
                                {isActive && !isComplete && (
                                    <div className="flex gap-1">
                                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                )}
                                
                                {isCompleted && (
                                    <span className="text-xs text-success font-medium">✓</span>
                                )}
                            </div>

                            {/* Connection line to next step */}
                            {index < PIPELINE_STEPS.length - 1 && (
                                <div 
                                    className={cn(
                                        'absolute left-[2.25rem] top-[3.25rem] w-0.5 h-6 -mb-3',
                                        isCompleted ? 'bg-success/50' : 'bg-muted'
                                    )} 
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer with model info */}
            {!isError && (
                <div className="px-6 py-4 bg-muted/20 border-t">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                Gemini (OCR)
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                GPT-4 (Analyse)
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-purple-500" />
                                Perplexity (Marché)
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-orange-500" />
                                Cohere (Synthèse)
                            </span>
                        </div>
                        
                        {isComplete ? (
                            <span className="text-success font-medium">
                                ✓ 4 modèles exécutés
                            </span>
                        ) : (
                            <span className="text-primary animate-pulse">
                                Traitement en cours...
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
