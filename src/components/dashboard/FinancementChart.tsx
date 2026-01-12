import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const data = [
  { name: 'Investissement', value: 45, color: 'hsl(156, 100%, 28%)' },
  { name: 'Trésorerie', value: 25, color: 'hsl(217, 91%, 60%)' },
  { name: 'Crédit-bail', value: 20, color: 'hsl(38, 92%, 50%)' },
  { name: 'Affacturage', value: 10, color: 'hsl(280, 65%, 60%)' },
];

export function FinancementChart() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Répartition financements</h3>
        <p className="text-sm text-muted-foreground">Par type de produit</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value}%`, '']}
            />
            <Legend 
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
