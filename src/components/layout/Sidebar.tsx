import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  User, 
  LogOut,
  TrendingUp,
  Shield,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Dossiers', href: '/dossiers', icon: FolderOpen },
  { name: 'Mon Profil', href: '/profil', icon: User },
];

const adminNavigation = [
  { name: 'Administration', href: '/admin', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();

  const getRoleLabel = (role: string | null | undefined) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'charge_affaires':
        return 'Chargé d\'affaires';
      default:
        return 'Utilisateur';
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">FinDecision</h1>
            <p className="text-xs text-sidebar-foreground/60">Aide à la décision</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'sidebar-link',
                  isActive && 'sidebar-link-active'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Admin-only navigation */}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-sidebar-border" />
              <p className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2">
                Administration
              </p>
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'sidebar-link',
                      isActive && 'sidebar-link-active'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Stats Card */}
        <div className="mx-3 mb-4 rounded-xl bg-sidebar-accent p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary/20">
              <TrendingUp className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <p className="text-xs text-sidebar-foreground/60">Taux d'acceptation</p>
              <p className="text-lg font-bold text-sidebar-primary">78%</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-sidebar-border overflow-hidden">
            <div className="h-full w-[78%] rounded-full bg-sidebar-primary" />
          </div>
        </div>

        {/* User & Logout */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent">
              <User className="h-4 w-4 text-sidebar-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email?.split('@')[0] || 'Utilisateur'}
              </p>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={isAdmin ? "default" : "secondary"} 
                  className="text-[10px] px-1.5 py-0"
                >
                  {getRoleLabel(role)}
                </Badge>
              </div>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="sidebar-link w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
