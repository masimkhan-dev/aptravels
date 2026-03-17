import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import FlightBooking from "./pages/FlightBooking";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminServices from "./pages/admin/AdminServices";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminBookingDetail from "./pages/admin/AdminBookingDetail";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminAgentLedger from "./pages/admin/AdminAgentLedger";
import ResetPassword from "./pages/admin/ResetPassword";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import ErrorBoundary from "./components/ui/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/flights" element={<FlightBooking />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              {/* Admin-only routes */}
              <Route path="dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="staff" element={<ProtectedRoute allowedRoles={['admin']}><AdminStaff /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
              <Route path="expenses" element={<ProtectedRoute allowedRoles={['admin']}><AdminExpenses /></ProtectedRoute>} />
              <Route path="agents" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminAgents /></ProtectedRoute>} />
              <Route path="agent-ledger" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminAgentLedger /></ProtectedRoute>} />

              {/* Admin + Manager routes */}
              <Route path="packages" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminPackages /></ProtectedRoute>} />
              <Route path="services" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminServices /></ProtectedRoute>} />
              <Route path="gallery" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AdminGallery /></ProtectedRoute>} />

              {/* Admin + Manager + Sales routes */}
              <Route path="inquiries" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><AdminInquiries /></ProtectedRoute>} />
              <Route path="customers" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><AdminCustomers /></ProtectedRoute>} />

              {/* All roles can access bookings */}
              <Route path="bookings" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'ops']}><AdminBookings /></ProtectedRoute>} />
              <Route path="bookings/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'ops']}><AdminBookingDetail /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
