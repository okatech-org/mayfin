import { ReactNode } from 'react';
import { AdminSystemSidebar } from './AdminSystemSidebar';

interface AdminSystemLayoutProps {
    children: ReactNode;
}

export function AdminSystemLayout({ children }: AdminSystemLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-950">
            <AdminSystemSidebar />
            <main className="ml-64 min-h-screen">
                {children}
            </main>
        </div>
    );
}
