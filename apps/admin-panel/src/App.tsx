import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { VendorsPage } from '@/pages/VendorsPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { ZonesPage } from '@/pages/ZonesPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { AccountingPage } from '@/pages/AccountingPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { LoyaltyPage } from '@/pages/LoyaltyPage';
import { ReturnsPage } from '@/pages/ReturnsPage';
import { ReturnDetailPage } from '@/pages/ReturnDetailPage';
import { DisputesPage } from '@/pages/DisputesPage';
import { DisputeDetailPage } from '@/pages/DisputeDetailPage';
import { VendorPerformancePage } from '@/pages/VendorPerformancePage';
import { PolicyViolationsPage } from '@/pages/PolicyViolationsPage';
import { PolicyAppealsPage } from '@/pages/PolicyAppealsPage';
import { PolicyRulesPage } from '@/pages/PolicyRulesPage';
import ShippingPage from '@/pages/ShippingPage';
import { BrandsPage } from '@/pages/BrandsPage';
import TaxPage from '@/pages/TaxPage';
import PricingPage from '@/pages/PricingPage';
import AdvertisingPage from '@/pages/AdvertisingPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { RolesPage } from '@/pages/RolesPage';
import { FinancialReportsPage } from '@/pages/FinancialReportsPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import RidersPage from '@/pages/RidersPage';
import SearchManagementPage from '@/pages/SearchManagementPage';
import CustomerAnalyticsPage from '@/pages/CustomerAnalyticsPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/returns/:id" element={<ReturnDetailPage />} />
          <Route path="/disputes" element={<DisputesPage />} />
          <Route path="/disputes/:id" element={<DisputeDetailPage />} />
          <Route path="/performance" element={<VendorPerformancePage />} />
          <Route path="/zones" element={<ZonesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/accounting" element={<AccountingPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/loyalty" element={<LoyaltyPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/policy/violations" element={<PolicyViolationsPage />} />
          <Route path="/policy/appeals" element={<PolicyAppealsPage />} />
          <Route path="/policy/rules" element={<PolicyRulesPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/tax" element={<TaxPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/advertising" element={<AdvertisingPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/reports" element={<FinancialReportsPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/riders" element={<RidersPage />} />
          <Route path="/search-management" element={<SearchManagementPage />} />
          <Route path="/customer-analytics" element={<CustomerAnalyticsPage />} />
        </Route>
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}

export default App;
