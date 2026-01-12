import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSectorScores } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function SectorScoreChart() {
  const { data, isLoading } = useSectorScores();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-36 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Score moyen par secteur</h3>
        <p className="text-sm text-muted-foreground mb-4">Performance par secteur d'activité</p>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  const getBarColor = (score: number) => {
    if (score >= 70) return 'hsl(142, 76%, 36%)';
    if (score >= 50) return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 84%, 60%)';
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Score moyen par secteur</h3>
        <p className="text-sm text-muted-foreground">Performance par secteur d'activité</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              type="category" 
              dataKey="sector" 
              width={100}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string, props: { payload: { count: number } }) => [
                `${value}/100 (${props.payload.count} dossier${props.payload.count > 1 ? 's' : ''})`,
                'Score moyen'
              ]}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
