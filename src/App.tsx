import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Eagerly loaded pages (critical path)
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

// Lazy loaded pages (code-splitting for bundle optimization)
const DossiersPage = lazy(() => import("./pages/DossiersPage"));
const DossierDetailPage = lazy(() => import("./pages/DossierDetailPage"));
const NewDossierPage = lazy(() => import("./pages/NewDossierPage"));
const SmartImportPage = lazy(() => import("./pages/SmartImportPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ProfilPage = lazy(() => import("./pages/ProfilPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

// System Admin Pages (lazy loaded)
const SystemDashboardPage = lazy(() => import("./pages/admin-system/SystemDashboardPage"));
const UsersManagementPage = lazy(() => import("./pages/admin-system/UsersManagementPage"));
const AuditLogsPage = lazy(() => import("./pages/admin-system/AuditLogsPage"));
const SystemSettingsPage = lazy(() => import("./pages/admin-system/SystemSettingsPage"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/dossiers" element={<ProtectedRoute><DossiersPage /></ProtectedRoute>} />
              <Route path="/dossiers/nouveau-ia" element={<ProtectedRoute><SmartImportPage /></ProtectedRoute>} />
              <Route path="/dossiers/nouveau" element={<ProtectedRoute><NewDossierPage /></ProtectedRoute>} />
              <Route path="/nouveau-dossier" element={<ProtectedRoute><NewDossierPage /></ProtectedRoute>} />
              <Route path="/dossiers/:id" element={<ProtectedRoute><DossierDetailPage /></ProtectedRoute>} />
              <Route path="/profil" element={<ProtectedRoute><ProfilPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
              {/* System Admin Routes */}
              <Route path="/system-admin" element={<ProtectedRoute requiredRole="admin"><SystemDashboardPage /></ProtectedRoute>} />
              <Route path="/system-admin/users" element={<ProtectedRoute requiredRole="admin"><UsersManagementPage /></ProtectedRoute>} />
              <Route path="/system-admin/audit-logs" element={<ProtectedRoute requiredRole="admin"><AuditLogsPage /></ProtectedRoute>} />
              <Route path="/system-admin/settings" element={<ProtectedRoute requiredRole="admin"><SystemSettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
