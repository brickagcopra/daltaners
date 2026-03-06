import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SearchPage } from '@/pages/SearchPage';
import { FoodPage } from '@/pages/FoodPage';
import { PharmacyPage } from '@/pages/PharmacyPage';
import { StorePage } from '@/pages/StorePage';
import { ProductPage } from '@/pages/ProductPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { WalletPage } from '@/pages/WalletPage';
import { RewardsPage } from '@/pages/RewardsPage';
import { ReturnsPage } from '@/pages/ReturnsPage';
import { ReturnDetailPage } from '@/pages/ReturnDetailPage';
import { CreateReturnPage } from '@/pages/CreateReturnPage';
import { DisputesPage } from '@/pages/DisputesPage';
import { DisputeDetailPage } from '@/pages/DisputeDetailPage';
import { CreateDisputePage } from '@/pages/CreateDisputePage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/food" element={<FoodPage />} />
        <Route path="/pharmacy" element={<PharmacyPage />} />
        <Route path="/stores/:slug" element={<StorePage />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/orders/:orderId/return" element={<CreateReturnPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/returns/:id" element={<ReturnDetailPage />} />
          <Route path="/orders/:orderId/dispute" element={<CreateDisputePage />} />
          <Route path="/disputes" element={<DisputesPage />} />
          <Route path="/disputes/:id" element={<DisputeDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
        </Route>
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
