import { useState, useEffect } from 'react';
import { 
    Upload, 
    Search, 
    FileSearch, 
    Building2, 
    BarChart3, 
    CheckCircle2, 
    XCircle,
    Brain,
    Globe,
    FileText,
    Sparkles,
    Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { AnalysisStep } from '@/hooks/useDocumentAnalysis';

interface AIAnalysisProgressProps {
    step: AnalysisStep;
    progress: number;
    error?: string | null;
}

// Main pipeline steps
const PIPELINE_STEPS = [
    { 
        id: 'uploading', 
        label: 'Upload des documents', 
        icon: Upload,
        description: 'Préparation des fichiers...',
        duration: 10
    },
    { 
        id: 'analyzing', 
        label: 'Analyse OCR (Gemini)', 
        icon: Search,
        description: 'Extraction visuelle des documents',
        model: 'Gemini 2.0 Flash',
        modelColor: 'bg-blue-500',
        duration: 30
    },
    { 
        id: 'extracting', 
        label: 'Analyse financière (GPT-4)', 
        icon: Brain,
        description: 'Évaluation approfondie des données',
        model: 'GPT-4o',
        modelColor: 'bg-green-500',
        duration: 25
    },
    { 
        id: 'validating', 
        label: 'Recherche sectorielle (Perplexity)', 
        icon: Globe,
        description: 'Analyse du contexte de marché',
        model: 'Perplexity Sonar Pro',
        modelColor: 'bg-purple-500',
        duration: 20
    },
    { 
        id: 'scoring', 
        label: 'Synthèse narrative (Cohere)', 
        icon: FileText,
        description: 'Génération du rapport',
        model: 'Cohere Command R+',
        modelColor: 'bg-orange-500',
        duration: 15
    },
    { 
        id: 'complete', 
        label: 'Analyse terminée', 
        icon: CheckCircle2,
        description: 'Tous les modèles ont terminé',
        duration: 0
    },
];

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
        <div className="relative h-16 overflow-hidden">
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
            {/* Connection lines */}
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

export function AIAnalysisProgress({ step, progress, error }: AIAnalysisProgressProps) {
    const currentIndex = getStepIndex(step);
    const isComplete = step === 'complete';
    const isError = step === 'error';
    const currentStepConfig = PIPELINE_STEPS[currentIndex];

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
                                    text={currentStepConfig.description} 
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
                </div>

                {/* Neural network animation when processing */}
                {!isComplete && !isError && currentIndex >= 1 && currentIndex < 5 && (
                    <NeuralAnimation />
                )}
            </div>

            {/* Main progress bar */}
            <div className="px-6 py-2 bg-muted/30">
                <Progress value={progress} className="h-2" />
            </div>

            {isError && error && (
                <div className="mx-6 my-4 flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Pipeline steps */}
            <div className="p-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Pipeline d'analyse</span>
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
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
                        
                        {!isComplete && (
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
