import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QuestionFieldRenderer } from './QuestionFieldRenderer';
import type { Question } from '@/types/rapport-analyse.types';
import type { RapportAnalyseRow } from '@/hooks/useRapportAnalyse';
import { getSectionByCode } from '@/data/questionnaire-structure';

interface QuestionnaireSectionProps {
    sectionCode: string;
    questions: Question[];
    values: RapportAnalyseRow;
    onChange: (field: string, value: unknown) => void;
    disabled?: boolean;
}

export const QuestionnaireSection: React.FC<QuestionnaireSectionProps> = ({
    sectionCode,
    questions,
    values,
    onChange,
    disabled = false
}) => {
    const section = getSectionByCode(sectionCode);

    // Check if a question should be displayed based on its dependencies
    const shouldShowQuestion = (question: Question): boolean => {
        if (!question.dependances || question.dependances.length === 0) {
            return true;
        }

        // Show if ANY dependency condition is met
        return question.dependances.some(dep => {
            const parentValue = values[dep.questionCode as keyof RapportAnalyseRow];
            return parentValue === dep.valeurCondition;
        });
    };

    // Render a question and its sub-questions
    const renderQuestion = (question: Question, depth = 0) => {
        const value = values[question.code as keyof RapportAnalyseRow];

        return (
            <div key={question.code} className={depth > 0 ? 'ml-6 mt-4 pl-4 border-l-2 border-primary/30' : ''}>
                <QuestionFieldRenderer
                    question={question}
                    value={value}
                    onChange={(newValue) => onChange(question.code, newValue)}
                    disabled={disabled}
                />

                {/* Render sub-questions if they should be shown */}
                {question.sousQuestions?.map(sq => {
                    if (shouldShowQuestion(sq)) {
                        return renderQuestion(sq, depth + 1);
                    }
                    return null;
                })}
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">
                    {section?.label || sectionCode}
                </CardTitle>
                {section?.description && (
                    <CardDescription>{section.description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-8">
                {questions.map(question => renderQuestion(question))}

                {questions.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                        Aucune question dans cette section
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default QuestionnaireSection;
