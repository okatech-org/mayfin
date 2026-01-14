import { SECTIONS } from '@/types/questionnaire.types';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionProgressProps {
    currentSection: number;
    completionBySection: Record<number, number>;
    errorsPerSection: Record<number, number>;
    onNavigate: (sectionId: number) => void;
    typeFinancement?: string;
}

export function SectionProgress({
    currentSection,
    completionBySection,
    errorsPerSection,
    onNavigate,
    typeFinancement,
}: SectionProgressProps) {
    // Filter sections based on financing type conditions
    const visibleSections = SECTIONS.filter(section => {
        if (!section.condition?.typeFinancement) return true;
        if (!typeFinancement) return false;
        return section.condition.typeFinancement.includes(typeFinancement as any);
    });

    const getStatus = (sectionId: number) => {
        const completion = completionBySection[sectionId] || 0;
        const errors = errorsPerSection[sectionId] || 0;

        if (errors > 0) return 'error';
        if (completion === 100) return 'complete';
        if (completion > 0) return 'partial';
        return 'empty';
    };

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Progression</h4>

            <div className="space-y-1">
                {visibleSections.map((section) => {
                    const status = getStatus(section.id);
                    const isActive = currentSection === section.id;
                    const completion = completionBySection[section.id] || 0;

                    return (
                        <button
                            key={section.id}
                            onClick={() => onNavigate(section.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                                isActive && 'bg-primary/10',
                                !isActive && 'hover:bg-muted'
                            )}
                        >
                            {/* Status icon */}
                            <div className="shrink-0">
                                {status === 'complete' && (
                                    <CheckCircle2 className="h-5 w-5 text-success" />
                                )}
                                {status === 'error' && (
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                )}
                                {status === 'partial' && (
                                    <div className="relative">
                                        <Circle className="h-5 w-5 text-muted-foreground" />
                                        <div
                                            className="absolute inset-0.5 rounded-full bg-primary"
                                            style={{
                                                clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(completion / 100 * 2 * Math.PI)}% ${50 - 50 * Math.cos(completion / 100 * 2 * Math.PI)}%, 50% 50%)`
                                            }}
                                        />
                                    </div>
                                )}
                                {status === 'empty' && (
                                    <Circle className="h-5 w-5 text-muted-foreground/50" />
                                )}
                            </div>

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    'text-sm font-medium truncate',
                                    isActive && 'text-primary',
                                    !isActive && 'text-foreground'
                                )}>
                                    {section.label}
                                </p>
                                {section.description && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {section.description}
                                    </p>
                                )}
                            </div>

                            {/* Completion percentage */}
                            <span className={cn(
                                'text-xs font-medium',
                                status === 'complete' && 'text-success',
                                status === 'error' && 'text-destructive',
                                status === 'partial' && 'text-primary',
                                status === 'empty' && 'text-muted-foreground'
                            )}>
                                {completion}%
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Overall progress bar */}
            <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Progression globale</span>
                    <span>
                        {Math.round(
                            Object.values(completionBySection).reduce((a, b) => a + b, 0) /
                            visibleSections.length
                        )}%
                    </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all"
                        style={{
                            width: `${Math.round(
                                Object.values(completionBySection).reduce((a, b) => a + b, 0) /
                                visibleSections.length
                            )}%`
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
