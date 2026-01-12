import { FolderOpen, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/dashboard/KPICard';
import { RecentDossiers } from '@/components/dashboard/RecentDossiers';
import { FinancementChart } from '@/components/dashboard/FinancementChart';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { mockDossiers, dashboardStats } from '@/data/mockData';

export default function DashboardPage() {
  return (
    <Layout>
      <Header 
        title="Dashboard" 
        subtitle="Vue d'ensemble de votre activité"
      />
      
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Dossiers total"
            value={dashboardStats.totalDossiers}
            icon={FolderOpen}
            change={{ value: 12, label: 'vs mois dernier' }}
          />
          <KPICard
            title="En cours d'analyse"
            value={dashboardStats.enCours}
            icon={Clock}
            variant="warning"
          />
          <KPICard
            title="Validés ce mois"
            value={dashboardStats.validesCeMois}
            icon={CheckCircle2}
            variant="success"
            change={{ value: 23, label: 'vs mois dernier' }}
          />
          <KPICard
            title="Taux d'acceptation"
            value={`${dashboardStats.tauxAcceptation}%`}
            icon={TrendingUp}
            variant="primary"
            change={{ value: 5, label: 'vs mois dernier' }}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MonthlyChart />
          </div>
          <FinancementChart />
        </div>

        {/* Recent Dossiers */}
        <RecentDossiers dossiers={mockDossiers.slice(0, 5)} />
      </div>
    </Layout>
  );
}
