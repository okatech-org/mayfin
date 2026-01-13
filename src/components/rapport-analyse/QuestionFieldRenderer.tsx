import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/rapport-analyse.types';
import { DECISION_LABELS, SYNTHESE_LABELS, SALARIES_REPRIS_LABELS } from '@/data/questionnaire-structure';

interface QuestionFieldRendererProps {
    question: Question;
    value: unknown;
    onChange: (value: unknown) => void;
    disabled?: boolean;
}

// Get display label for select options
function getOptionLabel(code: string, option: string): string {
    if (code === 'decision_finale') return DECISION_LABELS[option] || option;
    if (code === 'synthese_collaborateur') return SYNTHESE_LABELS[option] || option;
    if (code === 'salaries_repris') return SALARIES_REPRIS_LABELS[option] || option;
    return option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ');
}

export const QuestionFieldRenderer: React.FC<QuestionFieldRendererProps> = ({
    question,
    value,
    onChange,
    disabled = false
}) => {
    const stringValue = value as string | null | undefined;
    const boolValue = value as boolean | null | undefined;

    // Validation state
    const hasMinLength = question.validations?.minLength;
    const currentLength = typeof stringValue === 'string' ? stringValue.length : 0;
    const isUnderMinLength = hasMinLength && currentLength > 0 && currentLength < hasMinLength;

    return (
        <div className="space-y-2">
            {/* Label with required indicator and help tooltip */}
            <div className="flex items-center gap-2">
                <Label className="text-base font-medium">
                    {question.libelle}
                    {question.obligatoire && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {question.aide && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p>{question.aide}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Field by type */}
            {question.type === 'oui_non' && (
                <RadioGroup
                    value={boolValue === true ? 'true' : boolValue === false ? 'false' : undefined}
                    onValueChange={(v) => onChange(v === 'true')}
                    disabled={disabled}
                    className="flex items-center gap-6 pt-1"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id={`${question.code}-oui`} />
                        <Label htmlFor={`${question.code}-oui`} className="font-normal cursor-pointer">Oui</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id={`${question.code}-non`} />
                        <Label htmlFor={`${question.code}-non`} className="font-normal cursor-pointer">Non</Label>
                    </div>
                </RadioGroup>
            )}

            {question.type === 'texte' && (
                <Input
                    value={stringValue || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={question.aide}
                    maxLength={question.validations?.maxLength}
                    disabled={disabled}
                    className={cn(isUnderMinLength && 'border-yellow-500')}
                />
            )}

            {question.type === 'textarea' && (
                <div className="space-y-1">
                    <Textarea
                        value={stringValue || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={question.aide}
                        rows={6}
                        maxLength={question.validations?.maxLength}
                        disabled={disabled}
                        className={cn(
                            isUnderMinLength && 'border-yellow-500',
                            'resize-none'
                        )}
                    />
                    {/* Character counter and validation message */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                            {question.validations?.minLength && (
                                <span className={cn(isUnderMinLength ? 'text-yellow-600' : 'text-green-600')}>
                                    Min. {question.validations.minLength} caractères
                                </span>
                            )}
                        </span>
                        <span>
                            {currentLength}
                            {question.validations?.maxLength && ` / ${question.validations.maxLength}`}
                        </span>
                    </div>
                    {isUnderMinLength && (
                        <Alert variant="default" className="py-2 bg-yellow-50 border-yellow-200">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-700 text-sm">
                                Minimum {question.validations?.minLength} caractères requis ({question.validations!.minLength! - currentLength} restants)
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {question.type === 'select' && question.options && (
                <Select
                    value={stringValue || undefined}
                    onValueChange={(v) => onChange(v)}
                    disabled={disabled}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                        {question.options.map(option => (
                            <SelectItem key={option} value={option}>
                                {getOptionLabel(question.code, option)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {question.type === 'tableau' && (
                <TableField
                    question={question}
                    value={value as unknown[] | null}
                    onChange={onChange}
                    disabled={disabled}
                />
            )}
        </div>
    );
};

// Table field component for array data
interface TableFieldProps {
    question: Question;
    value: unknown[] | null;
    onChange: (value: unknown[]) => void;
    disabled?: boolean;
}

const TableField: React.FC<TableFieldProps> = ({ question, value, onChange, disabled }) => {
    const rows = Array.isArray(value) ? value : [];

    // Define columns based on question code
    const getColumns = () => {
        if (question.code === 'charges_previsionnelles') {
            return [
                { key: 'poste', label: 'Poste de charges', type: 'text' },
                { key: 'montant_n', label: 'N (€)', type: 'number' },
                { key: 'montant_n1', label: 'N+1 (€)', type: 'number' },
                { key: 'montant_n2', label: 'N+2 (€)', type: 'number' },
                { key: 'commentaire', label: 'Commentaire', type: 'text' }
            ];
        }
        if (question.code === 'revenus_cautions') {
            return [
                { key: 'nom', label: 'Nom', type: 'text' },
                { key: 'revenus_actuels', label: 'Revenus actuels (€)', type: 'number' },
                { key: 'revenus_futurs', label: 'Revenus futurs (€)', type: 'number' },
                { key: 'source', label: 'Source', type: 'text' }
            ];
        }
        if (question.code === 'endettement_cautions') {
            return [
                { key: 'nom', label: 'Nom', type: 'text' },
                { key: 'charges_mensuelles', label: 'Charges (€)', type: 'number' },
                { key: 'taux_endettement_actuel', label: 'Taux actuel (%)', type: 'number' },
                { key: 'reste_a_vivre_actuel', label: 'RAV actuel (€)', type: 'number' },
                { key: 'taux_endettement_futur', label: 'Taux futur (%)', type: 'number' },
                { key: 'reste_a_vivre_futur', label: 'RAV futur (€)', type: 'number' }
            ];
        }
        return [];
    };

    const columns = getColumns();

    const addRow = () => {
        const newRow = columns.reduce((acc, col) => {
            acc[col.key] = col.type === 'number' ? null : '';
            return acc;
        }, {} as Record<string, unknown>);
        onChange([...rows, newRow]);
    };

    const updateRow = (index: number, key: string, cellValue: unknown) => {
        const updated = [...rows];
        const currentRow = updated[index] as Record<string, unknown> | undefined;
        updated[index] = { ...(currentRow ?? {}), [key]: cellValue };
        onChange(updated);
    };

    const removeRow = (index: number) => {
        onChange(rows.filter((_, i) => i !== index));
    };

    if (columns.length === 0) {
        return <p className="text-muted-foreground text-sm">Type de tableau non configuré</p>;
    }

    return (
        <div className="space-y-2">
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} className="px-3 py-2 text-left font-medium">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-3 py-2 w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-muted-foreground">
                                    Aucune donnée. Cliquez sur "Ajouter une ligne" pour commencer.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t">
                                    {columns.map(col => (
                                        <td key={col.key} className="px-2 py-1">
                                            <Input
                                                type={col.type === 'number' ? 'number' : 'text'}
                                                value={(row as Record<string, unknown>)[col.key] as string || ''}
                                                onChange={(e) => updateRow(
                                                    rowIndex,
                                                    col.key,
                                                    col.type === 'number'
                                                        ? (e.target.value === '' ? null : parseFloat(e.target.value))
                                                        : e.target.value
                                                )}
                                                disabled={disabled}
                                                className="h-8"
                                            />
                                        </td>
                                    ))}
                                    <td className="px-2 py-1">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(rowIndex)}
                                            disabled={disabled}
                                            className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                                        >
                                            Suppr.
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <button
                type="button"
                onClick={addRow}
                disabled={disabled}
                className="text-sm text-primary hover:underline disabled:opacity-50"
            >
                + Ajouter une ligne
            </button>
        </div>
    );
};

export default QuestionFieldRenderer;
