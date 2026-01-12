import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfMonth, subMonths, format, startOfYear } from 'date-fns';

export interface DashboardStats {
  totalDossiers: number;
  enCours: number;
  validesCeMois: number;
  tauxAcceptation: number;
  totalMontant: number;
  scoreMoyen: number;
  changeVsLastMonth: {
    total: number;
    valides: number;
    taux: number;
  };
}

export interface MonthlyData {
  month: string;
  valides: number;
  refuses: number;
  enCours: number;
}

export interface FinancementData {
  name: string;
  value: number;
  color: string;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface SectorScoreData {
  sector: string;
  score: number;
  count: number;
}

const financementColors: Record<string, string> = {
  investissement: 'hsl(156, 100%, 28%)',
  tresorerie: 'hsl(217, 91%, 60%)',
  credit_bail: 'hsl(38, 92%, 50%)',
  affacturage: 'hsl(280, 65%, 60%)',
};

const statusColors: Record<string, string> = {
  brouillon: 'hsl(var(--muted))',
  en_analyse: 'hsl(217, 91%, 60%)',
  valide: 'hsl(142, 76%, 36%)',
  refuse: 'hsl(0, 84%, 60%)',
  attente_documents: 'hsl(38, 92%, 50%)',
};

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));

      // Fetch all dossiers
      const { data: allDossiers, error } = await supabase
        .from('dossiers')
        .select('id, status, score_global, montant_demande, created_at')
        .is('deleted_at', null);

      if (error) throw error;

      const dossiers = allDossiers || [];
      
      // Calculate stats
      const totalDossiers = dossiers.length;
      const enCours = dossiers.filter(d => d.status === 'en_analyse').length;
      
      // This month validated
      const validesCeMois = dossiers.filter(d => 
        d.status === 'valide' && 
        new Date(d.created_at) >= startOfCurrentMonth
      ).length;

      // Last month validated
      const validesLastMonth = dossiers.filter(d => 
        d.status === 'valide' && 
        new Date(d.created_at) >= startOfLastMonth &&
        new Date(d.created_at) < startOfCurrentMonth
      ).length;

      // Total dossiers last month
      const totalLastMonth = dossiers.filter(d =>
        new Date(d.created_at) < startOfCurrentMonth
      ).length;

      // Acceptance rate
      const completed = dossiers.filter(d => d.status === 'valide' || d.status === 'refuse');
      const validated = dossiers.filter(d => d.status === 'valide');
      const tauxAcceptation = completed.length > 0 
        ? Math.round((validated.length / completed.length) * 100) 
        : 0;

      // Total amount
      const totalMontant = dossiers.reduce((sum, d) => sum + (d.montant_demande || 0), 0);

      // Average score
      const dossiersWithScore = dossiers.filter(d => d.score_global !== null);
      const scoreMoyen = dossiersWithScore.length > 0
        ? Math.round(dossiersWithScore.reduce((sum, d) => sum + (d.score_global || 0), 0) / dossiersWithScore.length)
        : 0;

      // Changes vs last month
      const changeTotal = totalLastMonth > 0 
        ? Math.round(((totalDossiers - totalLastMonth) / totalLastMonth) * 100)
        : 0;
      
      const changeValides = validesLastMonth > 0
        ? Math.round(((validesCeMois - validesLastMonth) / validesLastMonth) * 100)
        : 0;

      return {
        totalDossiers,
        enCours,
        validesCeMois,
        tauxAcceptation,
        totalMontant,
        scoreMoyen,
        changeVsLastMonth: {
          total: changeTotal,
          valides: changeValides,
          taux: 0,
        },
      };
    },
    enabled: !!user,
  });
}

export function useMonthlyData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-data'],
    queryFn: async (): Promise<MonthlyData[]> => {
      const now = new Date();
      const months: MonthlyData[] = [];

      // Get last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        const monthName = format(monthStart, 'MMM');

        const { data: monthDossiers } = await supabase
          .from('dossiers')
          .select('status')
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString())
          .is('deleted_at', null);

        const dossiers = monthDossiers || [];
        
        months.push({
          month: monthName,
          valides: dossiers.filter(d => d.status === 'valide').length,
          refuses: dossiers.filter(d => d.status === 'refuse').length,
          enCours: dossiers.filter(d => d.status === 'en_analyse' || d.status === 'attente_documents').length,
        });
      }

      return months;
    },
    enabled: !!user,
  });
}

export function useFinancementData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['financement-data'],
    queryFn: async (): Promise<FinancementData[]> => {
      const { data: dossiers, error } = await supabase
        .from('dossiers')
        .select('type_financement')
        .is('deleted_at', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      const total = dossiers?.length || 0;

      dossiers?.forEach(d => {
        counts[d.type_financement] = (counts[d.type_financement] || 0) + 1;
      });

      return Object.entries(counts).map(([name, count]) => ({
        name: name.replace('_', ' ').charAt(0).toUpperCase() + name.replace('_', ' ').slice(1),
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        color: financementColors[name] || 'hsl(var(--muted))',
      }));
    },
    enabled: !!user,
  });
}

export function useStatusData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['status-data'],
    queryFn: async (): Promise<StatusData[]> => {
      const { data: dossiers, error } = await supabase
        .from('dossiers')
        .select('status')
        .is('deleted_at', null);

      if (error) throw error;

      const counts: Record<string, number> = {};

      dossiers?.forEach(d => {
        counts[d.status] = (counts[d.status] || 0) + 1;
      });

      const statusLabels: Record<string, string> = {
        brouillon: 'Brouillon',
        en_analyse: 'En analyse',
        valide: 'Validé',
        refuse: 'Refusé',
        attente_documents: 'Attente docs',
      };

      return Object.entries(counts).map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
        color: statusColors[status] || 'hsl(var(--muted))',
      }));
    },
    enabled: !!user,
  });
}

export function useSectorScores() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sector-scores'],
    queryFn: async (): Promise<SectorScoreData[]> => {
      const { data: dossiers, error } = await supabase
        .from('dossiers')
        .select('secteur_activite, score_global')
        .not('secteur_activite', 'is', null)
        .not('score_global', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;

      const sectorData: Record<string, { total: number; count: number }> = {};

      dossiers?.forEach(d => {
        const sector = d.secteur_activite || 'Autre';
        if (!sectorData[sector]) {
          sectorData[sector] = { total: 0, count: 0 };
        }
        sectorData[sector].total += d.score_global || 0;
        sectorData[sector].count += 1;
      });

      return Object.entries(sectorData)
        .map(([sector, data]) => ({
          sector,
          score: Math.round(data.total / data.count),
          count: data.count,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    },
    enabled: !!user,
  });
}

export function useRecentDossiers(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-dossiers', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossiers')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
