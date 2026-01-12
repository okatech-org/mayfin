import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import DossiersPage from "./pages/DossiersPage";
import DossierDetailPage from "./pages/DossierDetailPage";
import NewDossierPage from "./pages/NewDossierPage";
import SmartImportPage from "./pages/SmartImportPage";
import LoginPage from "./pages/LoginPage";
import ProfilPage from "./pages/ProfilPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
// System Admin Pages
import SystemDashboardPage from "./pages/admin-system/SystemDashboardPage";
import UsersManagementPage from "./pages/admin-system/UsersManagementPage";
import SystemSettingsPage from "./pages/admin-system/SystemSettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/dossiers" element={<ProtectedRoute><DossiersPage /></ProtectedRoute>} />
            <Route path="/dossiers/nouveau-ia" element={<ProtectedRoute><SmartImportPage /></ProtectedRoute>} />
            <Route path="/dossiers/nouveau" element={<ProtectedRoute><NewDossierPage /></ProtectedRoute>} />
            <Route path="/dossiers/:id" element={<ProtectedRoute><DossierDetailPage /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfilPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
            {/* System Admin Routes */}
            <Route path="/system-admin" element={<ProtectedRoute requiredRole="admin"><SystemDashboardPage /></ProtectedRoute>} />
            <Route path="/system-admin/users" element={<ProtectedRoute requiredRole="admin"><UsersManagementPage /></ProtectedRoute>} />
            <Route path="/system-admin/settings" element={<ProtectedRoute requiredRole="admin"><SystemSettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

