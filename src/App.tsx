import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import OrdersSuppliers from "./pages/OrdersSuppliers";
import OrdersRealEstate from "./pages/OrdersRealEstate";
import Catalogues from "./pages/Catalogues";
import CatalogueDetail from "./pages/CatalogueDetail";
import UsersPage from "./pages/UsersPage";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/orders" element={<Navigate to="/orders/suppliers" replace />} />
          <Route path="/orders/suppliers" element={<OrdersSuppliers />} />
          <Route path="/orders/real-estate" element={<OrdersRealEstate />} />
          <Route path="/catalogues" element={<Catalogues />} />
          <Route path="/catalogues/:category" element={<CatalogueDetail />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
