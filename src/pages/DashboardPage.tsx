import { FolderOpen, Clock, CheckCircle2, TrendingUp, Euro, Target } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/dashboard/KPICard';
import { RecentDossiers } from '@/components/dashboard/RecentDossiers';
import { FinancementChart } from '@/components/dashboard/FinancementChart';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { SectorScoreChart } from '@/components/dashboard/SectorScoreChart';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <Layout>
      <Header 
        title="Dashboard" 
        subtitle="Vue d'ensemble de votre activité"
      />
      
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="kpi-card">
                <div className="flex items-start justify-between">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </div>
            ))
          ) : (
            <>
              <KPICard
                title="Dossiers total"
                value={stats?.totalDossiers || 0}
                icon={FolderOpen}
                change={stats?.changeVsLastMonth.total ? { value: stats.changeVsLastMonth.total, label: 'vs mois dernier' } : undefined}
              />
              <KPICard
                title="En cours"
                value={stats?.enCours || 0}
                icon={Clock}
                variant="warning"
              />
              <KPICard
                title="Validés ce mois"
                value={stats?.validesCeMois || 0}
                icon={CheckCircle2}
                variant="success"
                change={stats?.changeVsLastMonth.valides ? { value: stats.changeVsLastMonth.valides, label: 'vs mois dernier' } : undefined}
              />
              <KPICard
                title="Taux d'acceptation"
                value={`${stats?.tauxAcceptation || 0}%`}
                icon={TrendingUp}
                variant="primary"
              />
              <KPICard
                title="Montant total"
                value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(stats?.totalMontant || 0)}
                icon={Euro}
              />
              <KPICard
                title="Score moyen"
                value={`${stats?.scoreMoyen || 0}/100`}
                icon={Target}
                variant="primary"
              />
            </>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MonthlyChart />
          </div>
          <FinancementChart />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusChart />
          <SectorScoreChart />
        </div>

        {/* Recent Dossiers */}
        <RecentDossiers />
      </div>
    </Layout>
  );
}
