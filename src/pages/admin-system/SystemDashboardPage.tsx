import { AdminSystemLayout } from '@/components/admin-system/AdminSystemLayout';
import {
    Users,
    FolderOpen,
    TrendingUp,
    Activity,
    UserPlus,
    Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminStats } from '@/hooks/useAdminUsers';
import { Loader2 } from 'lucide-react';

export default function SystemDashboardPage() {
    const { data: stats, isLoading } = useAdminStats();

    return (
        <AdminSystemLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard Système</h1>
                    <p className="text-slate-400 mt-1">
                        Vue d'ensemble de la plateforme FinDecision
                    </p>
                </div>

                {/* Stats Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400">
                                    Utilisateurs totaux
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
                                        <Users className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <span className="text-2xl font-bold text-white">
                                        {stats?.totalUsers ?? 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400">
                                    Administrateurs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20">
                                        <Activity className="h-5 w-5 text-red-500" />
                                    </div>
                                    <span className="text-2xl font-bold text-white">
                                        {stats?.adminCount ?? 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400">
                                    Chargés d'affaires
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/20">
                                        <UserPlus className="h-5 w-5 text-green-500" />
                                    </div>
                                    <span className="text-2xl font-bold text-white">
                                        {stats?.chargeAffairesCount ?? 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400">
                                    Dossiers totaux
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                                        <FolderOpen className="h-5 w-5 text-purple-500" />
                                    </div>
                                    <span className="text-2xl font-bold text-white">
                                        {stats?.totalDossiers ?? 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Inscriptions récentes
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Derniers utilisateurs inscrits
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.recentUsers.map((user) => (
                                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                                                <Users className="h-4 w-4 text-slate-300" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {user.first_name} {user.last_name}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    Aucune inscription récente
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Statistiques dossiers
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Répartition par statut
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats?.dossiersByStatus?.map((stat) => (
                                    <div key={stat.status} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300 capitalize">
                                            {stat.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm font-medium text-white">
                                            {stat.count}
                                        </span>
                                    </div>
                                )) ?? (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            Aucune donnée disponible
                                        </p>
                                    )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminSystemLayout>
    );
}
