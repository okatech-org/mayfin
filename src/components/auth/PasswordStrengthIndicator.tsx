import { useMemo } from 'react';
import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordCriteria {
  label: string;
  test: (password: string) => boolean;
  required?: boolean;
}

const criteria: PasswordCriteria[] = [
  { label: 'Au moins 8 caractères', test: (p) => p.length >= 8, required: true },
  { label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p), required: true },
  { label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p), required: true },
  { label: 'Un chiffre', test: (p) => /[0-9]/.test(p), required: true },
  { label: 'Un caractère spécial (!@#$%...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Export for programmatic validation
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  missingRequirements: string[];
} {
  const passed = criteria.map((c) => c.test(password));
  const score = passed.filter(Boolean).length;
  const requiredPassed = criteria
    .filter((c) => c.required)
    .every((c) => c.test(password));
  
  const missingRequirements = criteria
    .filter((c, i) => c.required && !passed[i])
    .map((c) => c.label);

  return {
    isValid: requiredPassed,
    score,
    missingRequirements,
  };
}

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const { score, passedCriteria, strengthLabel, strengthColor, strengthIcon, allRequiredPassed } = useMemo(() => {
    const passed = criteria.map((c) => c.test(password));
    const score = passed.filter(Boolean).length;
    const requiredPassed = criteria
      .filter((c) => c.required)
      .every((c) => c.test(password));
    
    let label = 'Très faible';
    let color = 'bg-destructive';
    let icon = ShieldAlert;
    
    if (score === 5) {
      label = 'Excellent';
      color = 'bg-green-500';
      icon = ShieldCheck;
    } else if (score === 4) {
      label = 'Fort';
      color = 'bg-green-400';
      icon = ShieldCheck;
    } else if (score === 3) {
      label = 'Moyen';
      color = 'bg-yellow-500';
      icon = Shield;
    } else if (score === 2) {
      label = 'Faible';
      color = 'bg-orange-500';
      icon = ShieldAlert;
    }
    
    return {
      score,
      passedCriteria: passed,
      strengthLabel: label,
      strengthColor: color,
      strengthIcon: icon,
      allRequiredPassed: requiredPassed,
    };
  }, [password]);

  if (!password) return null;

  const IconComponent = strengthIcon;

  return (
    <div className="space-y-3 mt-2 p-3 rounded-lg bg-muted/50 border border-border/50">
      {/* Strength bar with icon */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconComponent className={cn(
              "h-4 w-4",
              score >= 4 ? "text-green-600" : score >= 3 ? "text-yellow-600" : "text-destructive"
            )} />
            <span>Force du mot de passe</span>
          </div>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            score >= 4 ? "bg-green-100 text-green-700" : 
            score >= 3 ? "bg-yellow-100 text-yellow-700" : 
            "bg-red-100 text-red-700"
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-300",
                level <= score ? strengthColor : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Criteria checklist */}
      {showRequirements && (
        <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-border/50">
          {criteria.map((c, index) => (
            <div
              key={c.label}
              className={cn(
                "flex items-center gap-2 text-xs transition-all duration-200",
                passedCriteria[index] 
                  ? "text-green-600" 
                  : c.required 
                    ? "text-destructive" 
                    : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "h-4 w-4 rounded-full flex items-center justify-center transition-colors",
                passedCriteria[index] 
                  ? "bg-green-100" 
                  : c.required 
                    ? "bg-red-50" 
                    : "bg-muted"
              )}>
                {passedCriteria[index] ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <X className="h-2.5 w-2.5" />
                )}
              </div>
              <span className={cn(c.required && !passedCriteria[index] && "font-medium")}>
                {c.label}
                {c.required && <span className="text-destructive ml-0.5">*</span>}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-1">
            * Critères obligatoires
          </p>
        </div>
      )}

      {/* Validation status message */}
      {!allRequiredPassed && password.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Tous les critères obligatoires doivent être remplis</span>
        </div>
      )}
    </div>
  );
}