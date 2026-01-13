import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  test: (password: string) => boolean;
}

const criteria: PasswordCriteria[] = [
  { label: 'Au moins 6 caractères', test: (p) => p.length >= 6 },
  { label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, passedCriteria, strengthLabel, strengthColor } = useMemo(() => {
    const passed = criteria.map((c) => c.test(password));
    const score = passed.filter(Boolean).length;
    
    let label = 'Très faible';
    let color = 'bg-destructive';
    
    if (score === 5) {
      label = 'Excellent';
      color = 'bg-green-500';
    } else if (score === 4) {
      label = 'Fort';
      color = 'bg-green-400';
    } else if (score === 3) {
      label = 'Moyen';
      color = 'bg-yellow-500';
    } else if (score === 2) {
      label = 'Faible';
      color = 'bg-orange-500';
    }
    
    return {
      score,
      passedCriteria: passed,
      strengthLabel: label,
      strengthColor: color,
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Force du mot de passe</span>
          <span className={cn(
            "font-medium",
            score >= 4 ? "text-green-600" : score >= 3 ? "text-yellow-600" : "text-destructive"
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                level <= score ? strengthColor : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-1 gap-1">
        {criteria.map((c, index) => (
          <div
            key={c.label}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              passedCriteria[index] ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {passedCriteria[index] ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}