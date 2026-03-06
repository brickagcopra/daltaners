import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle,
  BarChart3,
  Trophy,
} from 'lucide-react-native';
import { orderApi } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { Card, LoadingSpinner } from '../../components/shared';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { VendorAnalytics } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#FBBF24',
  confirmed: '#60A5FA',
  preparing: '#A78BFA',
  ready: '#34D399',
  picked_up: '#2DD4BF',
  in_transit: '#818CF8',
  delivered: '#10B981',
  cancelled: '#F87171',
  returned: '#FB923C',
  refunded: '#94A3B8',
};

export function AnalyticsScreen() {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await orderApi.get('/orders/vendor/analytics');
      setAnalytics(res.data.data ?? null);
    } catch {
      setAnalytics(null);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchAnalytics().finally(() => setIsLoading(false));
  }, [fetchAnalytics]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalytics();
    setIsRefreshing(false);
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!analytics) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['bottom']}>
        <BarChart3 size={48} color={colors.text.muted} />
        <Text style={{ ...typography.body, color: colors.text.muted, marginTop: spacing.md }}>
          {t('vendorAnalytics.noData')}
        </Text>
      </SafeAreaView>
    );
  }

  const maxRevByDay = Math.max(...analytics.revenue_by_day.map((d) => d.revenue), 1);
  const maxPeakHour = Math.max(...analytics.peak_hours.map((h) => h.count), 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: spacing.lg, gap: spacing.md }}>
          <StatCard
            icon={<ShoppingCart size={20} color={colors.primary[500]} />}
            label={t('vendorAnalytics.ordersToday')}
            value={String(analytics.orders.today)}
            bgColor={colors.primary[50]}
          />
          <StatCard
            icon={<DollarSign size={20} color="#059669" />}
            label={t('vendorAnalytics.revenueToday')}
            value={formatCurrency(analytics.revenue.today)}
            bgColor="#D1FAE5"
          />
          <StatCard
            icon={<TrendingUp size={20} color="#D97706" />}
            label={t('vendorAnalytics.avgOrder')}
            value={formatCurrency(analytics.average_order_value)}
            bgColor="#FEF3C7"
          />
          <StatCard
            icon={<CheckCircle size={20} color="#7C3AED" />}
            label={t('vendorAnalytics.fulfillment')}
            value={`${analytics.fulfillment_rate.toFixed(1)}%`}
            bgColor="#EDE9FE"
          />
        </View>

        {/* Revenue Trend (Mini Bar Chart) */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Card>
            <Text style={{ ...typography.h3, marginBottom: spacing.md }}>
              {t('vendorAnalytics.revenueTrend')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 }}>
              {analytics.revenue_by_day.slice(-14).map((day, i) => {
                const h = Math.max((day.revenue / maxRevByDay) * 100, 2);
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: h,
                      backgroundColor: colors.primary[400],
                      borderTopLeftRadius: 2,
                      borderTopRightRadius: 2,
                    }}
                  />
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: colors.text.muted }}>14 days ago</Text>
              <Text style={{ fontSize: 10, color: colors.text.muted }}>Today</Text>
            </View>
          </Card>
        </View>

        {/* Orders by Status */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Card>
            <Text style={{ ...typography.h3, marginBottom: spacing.md }}>
              {t('vendorAnalytics.ordersByStatus')}
            </Text>
            {analytics.orders_by_status.map((s) => {
              const total = analytics.orders_by_status.reduce((sum, st) => sum + st.count, 0) || 1;
              const pct = (s.count / total) * 100;
              const barColor = STATUS_COLORS[s.status] ?? colors.text.muted;
              return (
                <View key={s.status} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <Text style={{ width: 80, fontSize: 12, color: colors.text.secondary, textTransform: 'capitalize' }}>
                    {s.status.replace(/_/g, ' ')}
                  </Text>
                  <View style={{ flex: 1, height: 16, backgroundColor: colors.background, borderRadius: 4 }}>
                    <View
                      style={{
                        width: `${Math.max(pct, 1)}%`,
                        height: '100%',
                        backgroundColor: barColor,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  <Text style={{ width: 30, fontSize: 12, fontWeight: '600', color: colors.text.primary, textAlign: 'right' }}>
                    {s.count}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Top Products */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md }}>
              <Trophy size={18} color={colors.accent[500]} />
              <Text style={{ ...typography.h3 }}>{t('vendorAnalytics.topProducts')}</Text>
            </View>
            {analytics.top_products.slice(0, 5).map((p, i) => (
              <View
                key={p.product_id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: i < 4 ? 1 : 0,
                  borderBottomColor: colors.border,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: i < 3 ? colors.accent[100] : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: i < 3 ? colors.accent[700] : colors.text.muted }}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: colors.text.primary }} numberOfLines={1}>
                  {p.product_name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.muted }}>
                  {p.quantity} sold
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.primary }}>
                  {formatCurrency(p.revenue)}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Peak Hours */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md }}>
              <Clock size={18} color={colors.primary[500]} />
              <Text style={{ ...typography.h3 }}>{t('vendorAnalytics.peakHours')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 1 }}>
              {analytics.peak_hours.map((h) => {
                const barH = Math.max((h.count / maxPeakHour) * 60, 1);
                const isPeak = h.count > maxPeakHour * 0.7;
                return (
                  <View
                    key={h.hour}
                    style={{
                      flex: 1,
                      height: barH,
                      backgroundColor: isPeak ? colors.primary[500] : colors.primary[200],
                      borderTopLeftRadius: 1,
                      borderTopRightRadius: 1,
                    }}
                  />
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 9, color: colors.text.muted }}>12AM</Text>
              <Text style={{ fontSize: 9, color: colors.text.muted }}>6AM</Text>
              <Text style={{ fontSize: 9, color: colors.text.muted }}>12PM</Text>
              <Text style={{ fontSize: 9, color: colors.text.muted }}>6PM</Text>
              <Text style={{ fontSize: 9, color: colors.text.muted }}>11PM</Text>
            </View>
          </Card>
        </View>

        {/* Period Summary */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Card>
            <Text style={{ ...typography.h3, marginBottom: spacing.md }}>
              {t('vendorAnalytics.periodSummary')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              <SummaryItem label={t('vendorAnalytics.weekRevenue')} value={formatCurrency(analytics.revenue.week)} />
              <SummaryItem label={t('vendorAnalytics.monthRevenue')} value={formatCurrency(analytics.revenue.month)} />
              <SummaryItem label={t('vendorAnalytics.weekOrders')} value={String(analytics.orders.week)} />
              <SummaryItem label={t('vendorAnalytics.monthOrders')} value={String(analytics.orders.month)} />
              <SummaryItem label={t('vendorAnalytics.avgPrepTime')} value={`${analytics.avg_preparation_time_minutes} min`} />
              <SummaryItem label={t('vendorAnalytics.allTimeRevenue')} value={formatCurrency(analytics.revenue.all_time)} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) {
  return (
    <View
      style={{
        width: '47%',
        backgroundColor: bgColor,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
      }}
    >
      <View style={{ marginBottom: 8 }}>{icon}</View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '47%' }}>
      <Text style={{ fontSize: 11, color: colors.text.muted }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>{value}</Text>
    </View>
  );
}
