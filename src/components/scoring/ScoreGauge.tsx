import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreGauge({ score, size = 'lg' }: ScoreGaugeProps) {
  const radius = size === 'lg' ? 80 : size === 'md' ? 60 : 40;
  const strokeWidth = size === 'lg' ? 12 : size === 'md' ? 10 : 8;
  const center = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  const getColor = () => {
    if (score >= 80) return 'stroke-success';
    if (score >= 60) return 'stroke-warning';
    if (score >= 40) return 'stroke-amber-500';
    return 'stroke-destructive';
  };

  const getGradientColors = () => {
    if (score >= 80) return { start: '#22c55e', end: '#16a34a' };
    if (score >= 60) return { start: '#f59e0b', end: '#d97706' };
    if (score >= 40) return { start: '#fb923c', end: '#ea580c' };
    return { start: '#ef4444', end: '#dc2626' };
  };

  const colors = getGradientColors();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={(radius + strokeWidth) * 2}
        height={(radius + strokeWidth) * 2}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={`scoreGradient-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#scoreGradient-${score})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          "font-bold",
          size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-lg'
        )}>
          {score}
        </span>
        <span className={cn(
          "text-muted-foreground",
          size === 'lg' ? 'text-sm' : 'text-xs'
        )}>
          / 100
        </span>
      </div>
    </div>
  );
}
