import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { useRecentScoreTrends } from '@/hooks/useScoreEvolution';

export function RecentScoreTrends() {
    const { data, isLoading } = useRecentScoreTrends(20);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Tendance récente des scores
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[200px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Tendance récente des scores
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">Aucune analyse récente</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Tendance récente des scores
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                        />
                        <YAxis 
                            domain={[0, 100]} 
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                            formatter={(value: number) => [`${value}/100`, 'Score']}
                            labelFormatter={(label, payload) => {
                                if (payload && payload[0]) {
                                    const item = payload[0].payload;
                                    return `${item.entreprise} (v${item.version})`;
                                }
                                return label;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="global" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            fill="url(#scoreGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
