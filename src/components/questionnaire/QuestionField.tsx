import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question, SubQuestion } from '@/types/questionnaire.types';

interface QuestionFieldProps {
    question: Question | SubQuestion;
    value: any;
    onChange: (code: string, value: any) => void;
    error?: string;
    allResponses?: Record<string, any>;
}

export function QuestionField({
    question,
    value,
    onChange,
    error,
    allResponses = {}
}: QuestionFieldProps) {
    const [charCount, setCharCount] = useState(typeof value === 'string' ? value.length : 0);

    const handleChange = (newValue: any) => {
        onChange(question.code, newValue);
        if (typeof newValue === 'string') {
            setCharCount(newValue.length);
        }
    };

    // Check if this question should be shown (for sub-questions with conditions)
    if ('condition' in question && question.condition?.field) {
        const parentValue = allResponses[question.condition.field];
        if (parentValue !== question.condition.value) {
            return null;
        }
    }

    const renderField = () => {
        switch (question.type) {
            case 'oui_non':
                return (
                    <div className="flex items-center gap-4">
                        <Switch
                            checked={value === true}
                            onCheckedChange={(checked) => handleChange(checked)}
                        />
                        <span className={cn(
                            'text-sm font-medium',
                            value === true && 'text-success',
                            value === false && 'text-muted-foreground'
                        )}>
                            {value === true ? 'Oui' : value === false ? 'Non' : 'Non renseigné'}
                        </span>
                    </div>
                );

            case 'textarea':
                const maxLength = question.validations?.maxLength || 4000;
                return (
                    <div className="space-y-2">
                        <Textarea
                            value={value || ''}
                            onChange={(e) => handleChange(e.target.value)}
                            placeholder={question.help || 'Saisissez votre réponse...'}
                            rows={4}
                            className={cn(error && 'border-destructive')}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{question.help}</span>
                            <span className={cn(
                                charCount > maxLength && 'text-destructive'
                            )}>
                                {charCount}/{maxLength}
                            </span>
                        </div>
                    </div>
                );

            case 'texte':
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder={question.help || ''}
                        className={cn(error && 'border-destructive')}
                    />
                );

            case 'select':
                return (
                    <Select value={value || ''} onValueChange={handleChange}>
                        <SelectTrigger className={cn(error && 'border-destructive')}>
                            <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                            {question.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            default:
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                    />
                );
        }
    };

    // Get alert for this question
    const getAlert = () => {
        if ('alertIfYes' in question && value === true && question.alertIfYes) {
            return { type: 'warning', message: question.alertIfYes };
        }
        if ('alertIfNo' in question && value === false && question.alertIfNo) {
            const isBlocking = question.alertIfNo.includes('BLOQUANT') || question.alertIfNo.includes('CRITIQUE');
            return { type: isBlocking ? 'danger' : 'warning', message: question.alertIfNo };
        }

        // Check numeric alerts
        if ('alerts' in question && question.alerts && typeof value === 'number') {
            for (const alert of question.alerts) {
                let triggered = false;
                if (alert.condition.includes('>')) {
                    const threshold = parseFloat(alert.condition.split('>')[1].trim());
                    triggered = value > threshold;
                } else if (alert.condition.includes('<')) {
                    const threshold = parseFloat(alert.condition.split('<')[1].trim());
                    triggered = value < threshold;
                }
                if (triggered) {
                    return { type: alert.level, message: alert.message };
                }
            }
        }

        return null;
    };

    const alert = getAlert();

    return (
        <div className="space-y-3 py-4 border-b border-border last:border-0">
            <div className="flex items-start gap-2">
                <Label className="text-sm font-medium leading-relaxed flex-1">
                    {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {value !== undefined && value !== null && value !== '' && !error && !alert && (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-1" />
                )}
            </div>

            {renderField()}

            {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {alert && (
                <div className={cn(
                    'flex items-start gap-2 text-sm p-3 rounded-lg',
                    alert.type === 'danger' && 'bg-destructive/10 text-destructive',
                    alert.type === 'warning' && 'bg-warning/10 text-warning',
                    alert.type === 'blocking' && 'bg-destructive/20 text-destructive',
                    alert.type === 'info' && 'bg-info/10 text-info'
                )}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{alert.message}</span>
                </div>
            )}
        </div>
    );
}
