import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface ScoreEvolutionData {
    month: string;
    avgGlobal: number;
    avgSolvabilite: number;
    avgRentabilite: number;
    avgStructure: number;
    avgActivite: number;
    count: number;
}

export interface ScoreTrendData {
    date: string;
    global: number;
    entreprise: string;
    version: number;
}

export function useScoreEvolution(months: number = 6) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['score-evolution', months, user?.id],
        queryFn: async (): Promise<ScoreEvolutionData[]> => {
            if (!user?.id) return [];

            const now = new Date();
            const results: ScoreEvolutionData[] = [];

            for (let i = months - 1; i >= 0; i--) {
                const monthStart = startOfMonth(subMonths(now, i));
                const monthEnd = endOfMonth(subMonths(now, i));
                const monthLabel = format(monthStart, 'MMM yyyy');

                const { data: analyses, error } = await supabase
                    .from('analyse_history')
                    .select('score_global, score_solvabilite, score_rentabilite, score_structure, score_activite')
                    .eq('user_id', user.id)
                    .gte('created_at', monthStart.toISOString())
                    .lte('created_at', monthEnd.toISOString());

                if (error) throw error;

                if (analyses && analyses.length > 0) {
                    const avgGlobal = Math.round(
                        analyses.reduce((sum, a) => sum + a.score_global, 0) / analyses.length
                    );
                    const avgSolvabilite = Math.round(
                        analyses.reduce((sum, a) => sum + (a.score_solvabilite || 0), 0) / analyses.length
                    );
                    const avgRentabilite = Math.round(
                        analyses.reduce((sum, a) => sum + (a.score_rentabilite || 0), 0) / analyses.length
                    );
                    const avgStructure = Math.round(
                        analyses.reduce((sum, a) => sum + (a.score_structure || 0), 0) / analyses.length
                    );
                    const avgActivite = Math.round(
                        analyses.reduce((sum, a) => sum + (a.score_activite || 0), 0) / analyses.length
                    );

                    results.push({
                        month: monthLabel,
                        avgGlobal,
                        avgSolvabilite,
                        avgRentabilite,
                        avgStructure,
                        avgActivite,
                        count: analyses.length,
                    });
                } else {
                    results.push({
                        month: monthLabel,
                        avgGlobal: 0,
                        avgSolvabilite: 0,
                        avgRentabilite: 0,
                        avgStructure: 0,
                        avgActivite: 0,
                        count: 0,
                    });
                }
            }

            return results;
        },
        enabled: !!user?.id,
    });
}

export function useRecentScoreTrends(limit: number = 20) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['recent-score-trends', limit, user?.id],
        queryFn: async (): Promise<ScoreTrendData[]> => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('analyse_history')
                .select('created_at, score_global, version, extracted_data')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) throw error;

            return (data || []).map((item) => {
                const extractedData = item.extracted_data as { entreprise?: { raisonSociale?: string } };
                return {
                    date: format(new Date(item.created_at), 'dd/MM'),
                    global: item.score_global,
                    entreprise: extractedData?.entreprise?.raisonSociale || 'N/A',
                    version: item.version || 1,
                };
            });
        },
        enabled: !!user?.id,
    });
}

export interface ScoreDistributionResult {
    scoreDistribution: { name: string; value: number; color: string }[];
    recoDistribution: { name: string; value: number; color: string }[];
    total: number;
}

export function useScoreDistribution() {
    const { user } = useAuth();

    return useQuery<ScoreDistributionResult | null>({
        queryKey: ['score-distribution', user?.id],
        queryFn: async (): Promise<ScoreDistributionResult | null> => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('analyse_history')
                .select('score_global, recommandation')
                .eq('user_id', user.id);

            if (error) throw error;

            const distribution = {
                excellent: 0,    // 70-100
                correct: 0,     // 45-69
                risque: 0,      // 0-44
            };

            const recoDistribution = {
                FAVORABLE: 0,
                'AVEC RESERVE': 0,
                DEFAVORABLE: 0,
            };

            (data || []).forEach((item) => {
                if (item.score_global >= 70) distribution.excellent++;
                else if (item.score_global >= 45) distribution.correct++;
                else distribution.risque++;

                const reco = item.recommandation as keyof typeof recoDistribution;
                if (reco && recoDistribution[reco] !== undefined) {
                    recoDistribution[reco]++;
                }
            });

            return {
                scoreDistribution: [
                    { name: 'Excellent (70-100)', value: distribution.excellent, color: 'hsl(142, 76%, 36%)' },
                    { name: 'Correct (45-69)', value: distribution.correct, color: 'hsl(38, 92%, 50%)' },
                    { name: 'À risque (0-44)', value: distribution.risque, color: 'hsl(0, 84%, 60%)' },
                ],
                recoDistribution: [
                    { name: 'Favorable', value: recoDistribution.FAVORABLE, color: 'hsl(142, 76%, 36%)' },
                    { name: 'Avec réserve', value: recoDistribution['AVEC RESERVE'], color: 'hsl(38, 92%, 50%)' },
                    { name: 'Défavorable', value: recoDistribution.DEFAVORABLE, color: 'hsl(0, 84%, 60%)' },
                ],
                total: data?.length || 0,
            };
        },
        enabled: !!user?.id,
    });
}
