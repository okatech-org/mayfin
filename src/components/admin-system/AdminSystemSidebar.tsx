import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    ArrowLeft,
    Shield,
    LogOut,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
    { name: 'Dashboard Système', href: '/system-admin', icon: LayoutDashboard },
    { name: 'Gestion des utilisateurs', href: '/system-admin/users', icon: Users },
    { name: 'Paramètres système', href: '/system-admin/settings', icon: Settings },
];

export function AdminSystemSidebar() {
    const location = useLocation();
    const { user, signOut } = useAuth();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800">
            <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Admin Système</h1>
                        <p className="text-xs text-slate-400">FinDecision</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-red-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                )}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* System Status */}
                <div className="mx-3 mb-4 rounded-xl bg-slate-800 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/20">
                            <Activity className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">État du système</p>
                            <p className="text-sm font-bold text-green-500">Opérationnel</p>
                        </div>
                    </div>
                </div>

                {/* Back to app & Logout */}
                <div className="border-t border-slate-800 p-3 space-y-1">
                    <Link
                        to="/"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>Retour à l'application</span>
                    </Link>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
