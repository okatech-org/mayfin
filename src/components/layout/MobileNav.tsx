import { useState, createContext, useContext, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

// Context for mobile sidebar state
interface MobileSidebarContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | null>(null);

export function useMobileSidebar() {
    const context = useContext(MobileSidebarContext);
    if (!context) {
        throw new Error('useMobileSidebar must be used within MobileSidebarProvider');
    }
    return context;
}

interface MobileSidebarProviderProps {
    children: ReactNode;
}

export function MobileSidebarProvider({ children }: MobileSidebarProviderProps) {
    const [isOpen, setIsOpen] = useState(false);

    const value: MobileSidebarContextType = {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
    };

    return (
        <MobileSidebarContext.Provider value={value}>
            {children}
        </MobileSidebarContext.Provider>
    );
}

// Mobile Header Component
export function MobileHeader() {
    const { toggle } = useMobileSidebar();
    const { user } = useAuth();
    const { data: profile } = useProfile();
    const location = useLocation();

    const getInitials = () => {
        const firstName = profile?.first_name || '';
        const lastName = profile?.last_name || '';
        if (firstName || lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return user?.email?.charAt(0).toUpperCase() || 'U';
    };

    // Get page title based on route
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.includes('/dossiers/nouveau-ia')) return 'Nouveau dossier IA';
        if (path.includes('/dossiers/nouveau')) return 'Nouveau dossier';
        if (path.includes('/dossiers/')) return 'Détail dossier';
        if (path.includes('/dossiers')) return 'Dossiers';
        if (path.includes('/profil')) return 'Mon Profil';
        if (path.includes('/admin')) return 'Administration';
        if (path.includes('/system-admin')) return 'Admin Système';
        return 'MayFin';
    };

    return (
        <header className="sticky top-0 z-50 flex lg:hidden h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            {/* Menu button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="h-10 w-10"
                aria-label="Ouvrir le menu"
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Center: Logo + Title */}
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                    <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm truncate max-w-[150px]">
                    {getPageTitle()}
                </span>
            </div>

            {/* Right: Avatar */}
            <Link to="/profil">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials()}
                    </AvatarFallback>
                </Avatar>
            </Link>
        </header>
    );
}

// Mobile Sidebar Overlay
interface MobileSidebarOverlayProps {
    children: ReactNode;
}

export function MobileSidebarOverlay({ children }: MobileSidebarOverlayProps) {
    const { isOpen, close } = useMobileSidebar();

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in"
                    onClick={close}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar wrapper with slide animation */}
            <div
                className={`
          fixed top-0 left-0 z-50 h-screen w-72 
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-64
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Close button - mobile only */}
                {isOpen && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={close}
                        className="absolute top-3 right-3 z-50 h-8 w-8 lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
                        aria-label="Fermer le menu"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}

                {children}
            </div>
        </>
    );
}
