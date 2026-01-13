import { Link } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const getInitials = () => {
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {children}
        
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un dossier..." 
            className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            3
          </span>
        </Button>

        {/* User Avatar */}
        <Link to="/profil">
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
            <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
