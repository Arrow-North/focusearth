import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RegisterForm from "./pages/auth/RegisterForm";
import ConfirmEmail from "./pages/auth/ConfirmEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Dashboard pages
import Index from "./pages/Index";
import OrdersSuppliers from "./pages/OrdersSuppliers";
import OrdersRealEstate from "./pages/OrdersRealEstate";
import Catalogues from "./pages/Catalogues";
import CatalogueDetail from "./pages/CatalogueDetail";
import CatalogueItemDetail from "./pages/CatalogueItemDetail";
import CreateCatalogueItem from "./pages/CreateCatalogueItem";
import UsersPage from "./pages/UsersPage";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import CreateCompany from "./pages/CreateCompany";
import UserDetail from "./pages/UserDetail";
import UserProfile from "./pages/UserProfile";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import EditProject from "./pages/EditProject";
import CreateReport from "./pages/CreateReport";
import ReportDetail from "./pages/ReportDetail";
import EstimatesList from "./pages/estimates/EstimatesList";
import EstimateDetail from "./pages/estimates/EstimateDetail";
import CreateEstimate from "./pages/estimates/CreateEstimate";
import Analytics from "./pages/Analytics";
import LEDCatalogueImport from "./pages/LEDCatalogueImport";
import AdminDashboard from './pages/AdminDashboard';
import Upload from './pages/Upload';
import Contact from './pages/Contact';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
          <Routes>
            {/* Auth routes (public) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/:role" element={<RegisterForm />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected dashboard routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/profile/change-password" element={<ProtectedRoute><UserProfile initialTab="password" /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

            {/* Orders */}
            <Route path="/orders" element={<Navigate to="/orders/suppliers" replace />} />
            <Route path="/orders/suppliers" element={<ProtectedRoute><OrdersSuppliers /></ProtectedRoute>} />
            <Route path="/orders/suppliers/:id" element={<ProtectedRoute><EstimateDetail /></ProtectedRoute>} />
            <Route path="/orders/real-estate" element={<ProtectedRoute><OrdersRealEstate /></ProtectedRoute>} />
            <Route path="/orders/real-estate/:id" element={<ProtectedRoute><EstimateDetail /></ProtectedRoute>} />
            <Route path="/orders/create" element={<ProtectedRoute><CreateEstimate /></ProtectedRoute>} />

            {/* Catalogues */}
            <Route path="/catalogues" element={<ProtectedRoute><RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Su', 'Eu', 'Gu']}><Catalogues /></RoleGuard></ProtectedRoute>} />
            <Route path="/catalogues/companies" element={<Navigate to="/companies" replace />} />
            <Route path="/catalogues/import" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au']}>
                  <LEDCatalogueImport />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/catalogues/:category/new" element={<ProtectedRoute><RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Su', 'Eu', 'Gu']}><CreateCatalogueItem /></RoleGuard></ProtectedRoute>} />
            <Route path="/catalogues/:category/:itemId" element={<ProtectedRoute><RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Su', 'Eu', 'Gu']}><CatalogueItemDetail /></RoleGuard></ProtectedRoute>} />
            <Route path="/catalogues/:category" element={<ProtectedRoute><RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Su', 'Eu', 'Gu']}><CatalogueDetail /></RoleGuard></ProtectedRoute>} />

            {/* Users (admin only) */}
            <Route path="/users" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au']}>
                  <UsersPage />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/users/:id" element={<ProtectedRoute><UserDetail /></ProtectedRoute>} />

            {/* Companies */}
            <Route path="/companies" element={<ProtectedRoute><RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Su', 'Eu', 'Gu']}><Companies /></RoleGuard></ProtectedRoute>} />
            <Route path="/companies/create" element={<ProtectedRoute><RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Su', 'Eu', 'Gu']}><CreateCompany /></RoleGuard></ProtectedRoute>} />
            <Route path="/companies/:id" element={<ProtectedRoute><RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Su', 'Eu', 'Gu']}><CompanyDetail /></RoleGuard></ProtectedRoute>} />

            {/* Projects */}
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projects/create" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au', 'Reu', 'Su']}>
                  <CreateProject />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/projects/:id/edit" element={<ProtectedRoute><EditProject /></ProtectedRoute>} />
            <Route path="/projects/:id/reports/create" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />

            {/* Reports */}
            <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />

            {/* Analytics (admin only) */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['SUPERADMIN', 'Sa', 'Au']}>
                  <Analytics />
                </RoleGuard>
              </ProtectedRoute>
            } />

            {/* Admin Dashboard (superadmin only) */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['SUPERADMIN']}>
                  <AdminDashboard />
                </RoleGuard>
              </ProtectedRoute>
            } />

            {/* Upload & Contact (Reu/Su) */}
            <Route path="/upload" element={<ProtectedRoute><RoleGuard allowedRoles={['Reu', 'Su']}><Upload /></RoleGuard></ProtectedRoute>} />
            <Route path="/contact" element={<ProtectedRoute><RoleGuard allowedRoles={['Reu', 'Su']}><Contact /></RoleGuard></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
