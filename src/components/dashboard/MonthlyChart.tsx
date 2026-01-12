import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', valides: 12, refuses: 3, enCours: 5 },
  { month: 'Fév', valides: 15, refuses: 2, enCours: 8 },
  { month: 'Mar', valides: 18, refuses: 4, enCours: 6 },
  { month: 'Avr', valides: 14, refuses: 5, enCours: 9 },
  { month: 'Mai', valides: 20, refuses: 3, enCours: 7 },
  { month: 'Juin', valides: 22, refuses: 2, enCours: 4 },
];

export function MonthlyChart() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Évolution mensuelle</h3>
        <p className="text-sm text-muted-foreground">Dossiers traités par mois</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="valides" name="Validés" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="refuses" name="Refusés" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="enCours" name="En cours" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">Validés</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Refusés</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-info" />
          <span className="text-sm text-muted-foreground">En cours</span>
        </div>
      </div>
    </div>
  );
}
