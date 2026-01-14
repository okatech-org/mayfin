import { AlertTriangle, XCircle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationResult } from '@/types/questionnaire.types';

interface ValidationAlertsProps {
    validation: ValidationResult;
}

export function ValidationAlerts({ validation }: ValidationAlertsProps) {
    if (validation.isValid && validation.warnings.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Blocking alerts */}
            {validation.blocking.length > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <h4 className="font-semibold text-destructive">
                            Alertes bloquantes ({validation.blocking.length})
                        </h4>
                    </div>
                    <ul className="space-y-1">
                        {validation.blocking.map((alert, i) => (
                            <li key={i} className="text-sm text-destructive flex items-start gap-2">
                                <span className="shrink-0">•</span>
                                {alert.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <h4 className="font-semibold text-warning">
                            Points de vigilance ({validation.warnings.length})
                        </h4>
                    </div>
                    <ul className="space-y-1">
                        {validation.warnings.map((alert, i) => (
                            <li key={i} className="text-sm text-warning flex items-start gap-2">
                                <span className="shrink-0">•</span>
                                {alert.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Errors */}
            {validation.errors.length > 0 && (
                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Info className="h-5 w-5 text-destructive" />
                        <h4 className="font-semibold text-destructive">
                            Erreurs de validation ({validation.errors.length})
                        </h4>
                    </div>
                    <ul className="space-y-1">
                        {validation.errors.map((error, i) => (
                            <li key={i} className="text-sm text-destructive flex items-start gap-2">
                                <span className="shrink-0">•</span>
                                {error.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Missing required */}
            {validation.missingRequired.length > 0 && (
                <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <h4 className="font-semibold text-foreground">
                            Champs obligatoires manquants ({validation.missingRequired.length})
                        </h4>
                    </div>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {validation.missingRequired.slice(0, 5).map((field, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="shrink-0">•</span>
                                {field}
                            </li>
                        ))}
                        {validation.missingRequired.length > 5 && (
                            <li className="text-sm text-muted-foreground italic">
                                ... et {validation.missingRequired.length - 5} autres
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

/**
 * Summary badge for questionnaire validation
 */
export function ValidationSummaryBadge({ validation }: ValidationAlertsProps) {
    if (validation.isValid && validation.warnings.length === 0) {
        return (
            <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Questionnaire complet</span>
            </div>
        );
    }

    if (validation.blocking.length > 0) {
        return (
            <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                    {validation.blocking.length} alerte(s) bloquante(s)
                </span>
            </div>
        );
    }

    if (validation.warnings.length > 0) {
        return (
            <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                    {validation.warnings.length} point(s) de vigilance
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">
                {validation.completion}% complété
            </span>
        </div>
    );
}
