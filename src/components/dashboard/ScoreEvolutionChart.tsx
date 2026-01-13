import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { useScoreEvolution } from '@/hooks/useScoreEvolution';

export function ScoreEvolutionChart() {
    const { data, isLoading } = useScoreEvolution(6);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Évolution des scores
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    const hasData = data && data.some(d => d.count > 0);

    if (!hasData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Évolution des scores
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">Aucune donnée d'analyse disponible</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Évolution des scores moyens
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }} 
                            className="text-muted-foreground"
                        />
                        <YAxis 
                            domain={[0, 100]} 
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                            formatter={(value: number, name: string) => {
                                const labels: Record<string, string> = {
                                    avgGlobal: 'Score global',
                                    avgSolvabilite: 'Solvabilité',
                                    avgRentabilite: 'Rentabilité',
                                    avgStructure: 'Structure',
                                    avgActivite: 'Activité',
                                };
                                return [value, labels[name] || name];
                            }}
                        />
                        <Legend 
                            formatter={(value) => {
                                const labels: Record<string, string> = {
                                    avgGlobal: 'Global',
                                    avgSolvabilite: 'Solvabilité',
                                    avgRentabilite: 'Rentabilité',
                                    avgStructure: 'Structure',
                                    avgActivite: 'Activité',
                                };
                                return labels[value] || value;
                            }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="avgGlobal" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="avgSolvabilite" 
                            stroke="hsl(217, 91%, 60%)" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(217, 91%, 60%)' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="avgRentabilite" 
                            stroke="hsl(142, 76%, 36%)" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(142, 76%, 36%)' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="avgStructure" 
                            stroke="hsl(38, 92%, 50%)" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(38, 92%, 50%)' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="avgActivite" 
                            stroke="hsl(280, 65%, 60%)" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(280, 65%, 60%)' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
