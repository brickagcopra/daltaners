import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShoppingCart, TrendingUp, Clock, AlertTriangle, BarChart3, Star, Shield, ChevronRight, RotateCcw, Wallet, Gauge, Users, Ticket, Megaphone, ShieldAlert } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { Card, LoadingSpinner } from '../../components/shared';
import { vendorApi, orderApi } from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { VendorStackParamList } from '../../navigation/VendorNavigator';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
}

export function DashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await orderApi.get('/orders/vendor/stats').catch(() => ({ data: { data: {} } }));
      setStats({
        todayOrders: data.data?.today_orders ?? 0,
        todayRevenue: data.data?.today_revenue ?? 0,
        pendingOrders: data.data?.pending_orders ?? 0,
        lowStockItems: data.data?.low_stock_items ?? 0,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const statCards = [
    { label: "Today's Orders", value: stats.todayOrders.toString(), icon: <ShoppingCart size={20} color={colors.primary[500]} />, color: colors.primary[50] },
    { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), icon: <TrendingUp size={20} color={colors.success} />, color: '#D1FAE5' },
    { label: 'Pending Orders', value: stats.pendingOrders.toString(), icon: <Clock size={20} color={colors.warning} />, color: '#FEF3C7' },
    { label: 'Low Stock Items', value: stats.lowStockItems.toString(), icon: <AlertTriangle size={20} color={colors.error} />, color: '#FEE2E2' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadDashboard(); }} />}
      >
        {/* Header */}
        <View style={{ padding: 16, backgroundColor: colors.surface }}>
          <Text style={{ fontSize: 14, color: colors.text.secondary }}>Welcome back,</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>
            {user?.first_name ?? 'Vendor'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 }}>
          {statCards.map((stat) => (
            <Card key={stat.label} style={{ width: '48%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: stat.color, alignItems: 'center', justifyContent: 'center' }}>
                  {stat.icon}
                </View>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>{stat.value}</Text>
              <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        {/* Quick Links */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
            Quick Links
          </Text>
          {[
            { label: 'Analytics', icon: <BarChart3 size={20} color={colors.primary[500]} />, route: 'Analytics' as const },
            { label: 'Reviews', icon: <Star size={20} color="#D97706" />, route: 'Reviews' as const },
            { label: 'Disputes', icon: <Shield size={20} color="#DC2626" />, route: 'VendorDisputes' as const },
            { label: 'Returns', icon: <RotateCcw size={20} color="#7C3AED" />, route: 'VendorReturns' as const },
            { label: 'Financials', icon: <Wallet size={20} color="#059669" />, route: 'VendorFinancials' as const },
            { label: 'Performance', icon: <Gauge size={20} color="#0284C7" />, route: 'VendorPerformance' as const },
            { label: 'Staff', icon: <Users size={20} color="#6366F1" />, route: 'VendorStaff' as const },
            { label: 'Coupons', icon: <Ticket size={20} color="#E11D48" />, route: 'VendorCoupons' as const },
            { label: 'Advertising', icon: <Megaphone size={20} color="#EA580C" />, route: 'VendorAdvertising' as const },
            { label: 'Policy Violations', icon: <ShieldAlert size={20} color="#DC2626" />, route: 'VendorViolations' as const },
          ].map((link) => (
            <TouchableOpacity
              key={link.route}
              onPress={() => navigation.navigate(link.route)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: borderRadius.md, marginBottom: 8 }}
            >
              {link.icon}
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.text.primary, marginLeft: 12 }}>
                {link.label}
              </Text>
              <ChevronRight size={18} color={colors.text.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Orders section placeholder */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
            Recent Orders
          </Text>
          <Card>
            <Text style={{ color: colors.text.muted, textAlign: 'center', padding: 16 }}>
              Order list will appear here when orders arrive.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
