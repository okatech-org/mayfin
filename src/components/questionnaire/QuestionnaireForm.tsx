import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SECTIONS } from '@/types/questionnaire.types';
import {
    QUESTIONS_MVP,
    getQuestionsBySection,
    validateQuestionnaire,
    getApplicableQuestions
} from '@/lib/questionnaire-bnp';
import { QuestionField } from './QuestionField';
import { SectionProgress } from './SectionProgress';
import { ValidationAlerts, ValidationSummaryBadge } from './ValidationAlerts';

interface QuestionnaireFormProps {
    typeFinancement?: string;
    initialResponses?: Record<string, any>;
    onResponsesChange?: (responses: Record<string, any>) => void;
    onValidationChange?: (isValid: boolean, completion: number) => void;
}

export function QuestionnaireForm({
    typeFinancement,
    initialResponses = {},
    onResponsesChange,
    onValidationChange,
}: QuestionnaireFormProps) {
    const [responses, setResponses] = useState<Record<string, any>>(initialResponses);
    const [currentSection, setCurrentSection] = useState(1);

    // Get applicable sections based on financing type
    const visibleSections = useMemo(() => {
        return SECTIONS.filter(section => {
            if (!section.condition?.typeFinancement) return true;
            if (!typeFinancement) return false;
            return section.condition.typeFinancement.includes(typeFinancement as any);
        });
    }, [typeFinancement]);

    // Get questions for current section
    const currentQuestions = useMemo(() => {
        return getQuestionsBySection(currentSection).filter(q => {
            if (!q.condition?.typeFinancement) return true;
            if (!typeFinancement) return false;
            return q.condition.typeFinancement.includes(typeFinancement as any);
        });
    }, [currentSection, typeFinancement]);

    // Calculate validation
    const validation = useMemo(() => {
        return validateQuestionnaire(responses, typeFinancement);
    }, [responses, typeFinancement]);

    // Calculate completion by section
    const completionBySection = useMemo(() => {
        const result: Record<number, number> = {};

        for (const section of visibleSections) {
            const sectionQuestions = getQuestionsBySection(section.id).filter(q => {
                if (!q.condition?.typeFinancement) return true;
                if (!typeFinancement) return false;
                return q.condition.typeFinancement.includes(typeFinancement as any);
            });

            const requiredQuestions = sectionQuestions.filter(q => q.required);
            if (requiredQuestions.length === 0) {
                result[section.id] = 100;
                continue;
            }

            const answered = requiredQuestions.filter(q => {
                const value = responses[q.code];
                return value !== undefined && value !== null && value !== '';
            }).length;

            result[section.id] = Math.round((answered / requiredQuestions.length) * 100);
        }

        return result;
    }, [responses, visibleSections, typeFinancement]);

    // Errors per section
    const errorsPerSection = useMemo(() => {
        const result: Record<number, number> = {};

        for (const alert of [...validation.blocking, ...validation.errors]) {
            const question = QUESTIONS_MVP.find(q => q.code === alert.code);
            if (question) {
                result[question.section] = (result[question.section] || 0) + 1;
            }
        }

        return result;
    }, [validation]);

    // Handle response change
    const handleChange = useCallback((code: string, value: any) => {
        setResponses(prev => {
            const next = { ...prev, [code]: value };
            onResponsesChange?.(next);
            return next;
        });
    }, [onResponsesChange]);

    // Notify parent of validation changes
    useMemo(() => {
        onValidationChange?.(validation.isValid, validation.completion);
    }, [validation.isValid, validation.completion, onValidationChange]);

    // Navigation
    const currentSectionIndex = visibleSections.findIndex(s => s.id === currentSection);
    const canGoBack = currentSectionIndex > 0;
    const canGoForward = currentSectionIndex < visibleSections.length - 1;

    const goBack = () => {
        if (canGoBack) {
            setCurrentSection(visibleSections[currentSectionIndex - 1].id);
        }
    };

    const goForward = () => {
        if (canGoForward) {
            setCurrentSection(visibleSections[currentSectionIndex + 1].id);
        }
    };

    const currentSectionData = visibleSections.find(s => s.id === currentSection);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Section navigation */}
            <div className="lg:col-span-1">
                <Card>
                    <CardContent className="p-4">
                        <SectionProgress
                            currentSection={currentSection}
                            completionBySection={completionBySection}
                            errorsPerSection={errorsPerSection}
                            onNavigate={setCurrentSection}
                            typeFinancement={typeFinancement}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Main content */}
            <div className="lg:col-span-3 space-y-6">
                {/* Current section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Section {currentSection}: {currentSectionData?.label}
                                </CardTitle>
                                {currentSectionData?.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {currentSectionData.description}
                                    </p>
                                )}
                            </div>
                            <ValidationSummaryBadge validation={validation} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Questions */}
                        <div className="space-y-2">
                            {currentQuestions.length === 0 ? (
                                <p className="text-muted-foreground py-8 text-center">
                                    Aucune question dans cette section pour ce type de financement.
                                </p>
                            ) : (
                                currentQuestions.map((question) => (
                                    <div key={question.code}>
                                        <QuestionField
                                            question={question}
                                            value={responses[question.code]}
                                            onChange={handleChange}
                                            allResponses={responses}
                                        />

                                        {/* Sub-questions */}
                                        {question.subQuestions?.map((sq) => (
                                            <div key={sq.code} className="ml-6 border-l-2 border-primary/20 pl-4">
                                                <QuestionField
                                                    question={sq}
                                                    value={responses[sq.code]}
                                                    onChange={handleChange}
                                                    allResponses={responses}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={goBack}
                                disabled={!canGoBack}
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Section précédente
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                {currentSectionIndex + 1} / {visibleSections.length}
                            </span>

                            <Button
                                onClick={goForward}
                                disabled={!canGoForward}
                            >
                                Section suivante
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Validation alerts */}
                {(validation.blocking.length > 0 || validation.warnings.length > 0) && (
                    <ValidationAlerts validation={validation} />
                )}
            </div>
        </div>
    );
}

export { QuestionField } from './QuestionField';
export { SectionProgress } from './SectionProgress';
export { ValidationAlerts, ValidationSummaryBadge } from './ValidationAlerts';
