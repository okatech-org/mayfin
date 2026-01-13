import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { RapportAnalyseRow } from '@/hooks/useRapportAnalyse';
import { DECISION_LABELS, SYNTHESE_LABELS, CONDITIONS_PARTICULIERES_OPTIONS } from '@/data/questionnaire-structure';

interface SyntheseSectionProps {
    values: RapportAnalyseRow;
    onChange: (field: string, value: unknown) => void;
    disabled?: boolean;
    completion: number;
}

export const SyntheseSection: React.FC<SyntheseSectionProps> = ({
    values,
    onChange,
    disabled = false,
    completion
}) => {
    const conditions = Array.isArray(values.conditions_particulieres)
        ? values.conditions_particulieres as string[]
        : [];

    const toggleCondition = (conditionValue: string) => {
        if (conditions.includes(conditionValue)) {
            onChange('conditions_particulieres', conditions.filter(c => c !== conditionValue));
        } else {
            onChange('conditions_particulieres', [...conditions, conditionValue]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Completion status */}
            <Card className={completion === 100 ? 'border-green-500' : 'border-yellow-500'}>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        {completion === 100 ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        )}
                        <div>
                            <p className="font-medium">
                                {completion === 100
                                    ? 'Questionnaire complet'
                                    : `Questionnaire incomplet (${completion}%)`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {completion === 100
                                    ? 'Vous pouvez finaliser le rapport'
                                    : 'Complétez toutes les questions obligatoires pour finaliser'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Synthèse collaborateur */}
            <Card>
                <CardHeader>
                    <CardTitle>Synthèse du collaborateur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-base font-medium">
                            Synthèse collaborateur <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={values.synthese_collaborateur || undefined}
                            onValueChange={(v) => onChange('synthese_collaborateur', v)}
                            disabled={disabled}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(SYNTHESE_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Motif if non concluante */}
                    {values.synthese_collaborateur === 'non_concluante' && (
                        <div className="space-y-2 ml-4 pl-4 border-l-2 border-destructive/30">
                            <Label className="text-base font-medium">
                                Motif <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                value={values.synthese_motif_non_concluant || ''}
                                onChange={(e) => onChange('synthese_motif_non_concluant', e.target.value)}
                                placeholder="Expliquer le motif de la synthèse non concluante..."
                                rows={4}
                                disabled={disabled}
                            />
                            <p className="text-xs text-muted-foreground">
                                {(values.synthese_motif_non_concluant || '').length} / 1000 caractères
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-base font-medium">Point d'attention</Label>
                        <Textarea
                            value={values.point_attention || ''}
                            onChange={(e) => onChange('point_attention', e.target.value)}
                            placeholder="Lister les points de vigilance particuliers..."
                            rows={4}
                            disabled={disabled}
                        />
                        <p className="text-xs text-muted-foreground">
                            {(values.point_attention || '').length} / 1000 caractères
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-base font-medium">Commentaires additionnels</Label>
                        <Textarea
                            value={values.ajout_point_texte || ''}
                            onChange={(e) => onChange('ajout_point_texte', e.target.value)}
                            placeholder="Ajouter tout commentaire complémentaire..."
                            rows={4}
                            disabled={disabled}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Décision finale */}
            <Card>
                <CardHeader>
                    <CardTitle>Décision finale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-base font-medium">
                            Décision <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={values.decision_finale || undefined}
                            onValueChange={(v) => onChange('decision_finale', v)}
                            disabled={disabled}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner la décision..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(DECISION_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Decision preview badge */}
                    {values.decision_finale && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Décision sélectionnée :</span>
                            <Badge
                                variant={
                                    values.decision_finale === 'accord_favorable' ? 'default' :
                                        values.decision_finale === 'accord_conditionne' ? 'secondary' :
                                            values.decision_finale === 'refus' ? 'destructive' :
                                                'outline'
                                }
                                className="text-sm"
                            >
                                {DECISION_LABELS[values.decision_finale]}
                            </Badge>
                        </div>
                    )}

                    {/* Conditions particulières if accord conditionné */}
                    {values.decision_finale === 'accord_conditionne' && (
                        <div className="space-y-3 mt-4 p-4 bg-muted/50 rounded-lg">
                            <Label className="text-base font-medium">Conditions particulières</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {CONDITIONS_PARTICULIERES_OPTIONS.map(option => (
                                    <div key={option.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`condition-${option.value}`}
                                            checked={conditions.includes(option.value)}
                                            onCheckedChange={() => toggleCondition(option.value)}
                                            disabled={disabled}
                                        />
                                        <Label
                                            htmlFor={`condition-${option.value}`}
                                            className="font-normal cursor-pointer"
                                        >
                                            {option.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SyntheseSection;
