import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const variants = {
  default: {
    icon: 'bg-secondary text-secondary-foreground',
    change: 'text-muted-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    change: 'text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
    change: 'text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    change: 'text-warning',
  },
};

export function KPICard({ title, value, change, icon: Icon, variant = 'default' }: KPICardProps) {
  const styles = variants[variant];

  return (
    <div className="kpi-card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110', styles.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {change && (
        <div className="mt-4 flex items-center gap-2">
          <span className={cn('text-sm font-medium', change.value >= 0 ? 'text-success' : 'text-destructive')}>
            {change.value >= 0 ? '+' : ''}{change.value}%
          </span>
          <span className="text-sm text-muted-foreground">{change.label}</span>
        </div>
      )}
    </div>
  );
}
