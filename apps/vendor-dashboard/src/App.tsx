import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { ProductFormPage } from '@/pages/ProductFormPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { StoreSettingsPage } from '@/pages/StoreSettingsPage';
import { StaffPage } from '@/pages/StaffPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { FinancialsPage } from '@/pages/FinancialsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { PromotionsPage } from '@/pages/PromotionsPage';
import { ReturnsPage as VendorReturnsPage } from '@/pages/ReturnsPage';
import { ReturnDetailPage as VendorReturnDetailPage } from '@/pages/ReturnDetailPage';
import { DisputesPage as VendorDisputesPage } from '@/pages/DisputesPage';
import { DisputeDetailPage as VendorDisputeDetailPage } from '@/pages/DisputeDetailPage';
import { PerformancePage } from '@/pages/PerformancePage';
import { ViolationsPage } from '@/pages/ViolationsPage';
import { ViolationDetailPage } from '@/pages/ViolationDetailPage';
import { PolicyRulesPage } from '@/pages/PolicyRulesPage';
import ShippingPage from '@/pages/ShippingPage';
import TaxPage from '@/pages/TaxPage';
import PricingPage from '@/pages/PricingPage';
import AdvertisingPage from '@/pages/AdvertisingPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute requiredRole="vendor_owner" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/returns" element={<VendorReturnsPage />} />
          <Route path="/returns/:id" element={<VendorReturnDetailPage />} />
          <Route path="/disputes" element={<VendorDisputesPage />} />
          <Route path="/disputes/:id" element={<VendorDisputeDetailPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/financials" element={<FinancialsPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/store/settings" element={<StoreSettingsPage />} />
          <Route path="/violations" element={<ViolationsPage />} />
          <Route path="/violations/:id" element={<ViolationDetailPage />} />
          <Route path="/policy/rules" element={<PolicyRulesPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/tax" element={<TaxPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/advertising" element={<AdvertisingPage />} />
          <Route path="/staff" element={<StaffPage />} />
        </Route>
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}

export default App;
