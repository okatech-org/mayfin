import { Sidebar } from './Sidebar';
import {
  MobileSidebarProvider,
  MobileHeader,
  MobileSidebarOverlay,
  useMobileSidebar
} from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { close } = useMobileSidebar();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - visible only on mobile */}
      <MobileHeader />

      {/* Sidebar with mobile overlay */}
      <MobileSidebarOverlay>
        <Sidebar onNavigate={close} />
      </MobileSidebarOverlay>

      {/* Main content - no left padding on mobile, pl-64 on desktop */}
      <main className="lg:pl-64">
        {children}
      </main>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <MobileSidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </MobileSidebarProvider>
  );
}
