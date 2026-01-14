import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  User,
  LogOut,
  TrendingUp,
  Settings,
  Sparkles,
  ServerCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logoMayfin from '@/assets/logo-mayfin.png';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Nouveau dossier IA', href: '/dossiers/nouveau-ia', icon: Sparkles },
  { name: 'Dossiers', href: '/dossiers', icon: FolderOpen },
  { name: 'Mon Profil', href: '/profil', icon: User },
];

const adminNavigation = [
  { name: 'Administration', href: '/admin', icon: Settings },
  { name: 'Admin Système', href: '/system-admin', icon: ServerCog },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();
  const { data: profile } = useProfile();

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

  const getInitials = () => {
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Utilisateur';
  };

  const handleLinkClick = () => {
    // Close mobile sidebar on navigation
    onNavigate?.();
  };

  return (
    <aside className="h-full w-full bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center justify-center px-4 border-b border-sidebar-border">
          <img 
            src={logoMayfin} 
            alt="MayFin" 
            className="h-12 w-auto object-contain"
          />
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
                onClick={handleLinkClick}
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
                    onClick={handleLinkClick}
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
          <Link
            to="/profil"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
              <AvatarFallback className="text-sm bg-sidebar-accent text-sidebar-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {getDisplayName()}
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
          </Link>
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
