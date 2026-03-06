import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Trophy,
  Star,
  Timer,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Package,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Target,
} from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { vendorApi } from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme';
import { formatCurrency, formatMinutes, t } from '../../utils';
import type { VendorPerformanceMetrics, VendorPerformanceHistory, PerformanceTier } from '../../types';

const TIER_COLORS: Record<PerformanceTier, { bg: string; text: string; label: string }> = {
  excellent: { bg: '#D1FAE5', text: '#065F46', label: 'Excellent' },
  good: { bg: '#DBEAFE', text: '#1E40AF', label: 'Good' },
  average: { bg: '#FEF3C7', text: '#92400E', label: 'Average' },
  poor: { bg: '#FED7AA', text: '#9A3412', label: 'Poor' },
  critical: { bg: '#FEE2E2', text: '#991B1B', label: 'Critical' },
  unrated: { bg: '#F3F4F6', text: '#6B7280', label: 'Unrated' },
};

export function PerformanceScreen() {
  const [metrics, setMetrics] = useState<VendorPerformanceMetrics | null>(null);
  const [history, setHistory] = useState<VendorPerformanceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, historyRes] = await Promise.all([
        vendorApi.get('/vendors/performance/me').catch(() => ({ data: { data: null } })),
        vendorApi.get('/vendors/performance/me/history', { params: { days: 30 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(metricsRes.data.data);
      setHistory(historyRes.data.data ?? []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!metrics) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['bottom']}>
        <BarChart3 size={48} color={colors.text.muted} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
          {t('vendorPerformance.noData')}
        </Text>
        <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 }}>
          {t('vendorPerformance.noDataDesc')}
        </Text>
      </SafeAreaView>
    );
  }

  const tier = TIER_COLORS[metrics.performance_tier] ?? TIER_COLORS.unrated;

  // Build score bar visual
  const scorePercent = Math.min(100, Math.max(0, metrics.performance_score));

  // Helper for metric rows
  const MetricRow = ({ label, value, suffix, icon, good }: {
    label: string;
    value: number | string;
    suffix?: string;
    icon: React.ReactNode;
    good?: boolean;
  }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: colors.text.secondary, marginLeft: 10 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: good === undefined ? colors.text.primary : good ? colors.success : colors.error }}>
        {typeof value === 'number' ? value.toFixed(1) : value}{suffix ?? ''}
      </Text>
    </View>
  );

  // Trend mini chart
  const maxScore = Math.max(...history.map((h) => h.performance_score), 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Score Header */}
        <Card style={{ marginBottom: 16, alignItems: 'center' }}>
          {/* Tier Badge */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: tier.bg, marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: tier.text }}>
              {tier.label}
            </Text>
          </View>

          {/* Score Circle */}
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 8,
            borderColor: tier.bg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: tier.text }}>
              {Math.round(metrics.performance_score)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.muted }}>/ 100</Text>
          </View>

          {/* Score Bar */}
          <View style={{ width: '100%', height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{
              width: `${scorePercent}%`,
              height: '100%',
              backgroundColor: tier.text,
              borderRadius: 4,
            }} />
          </View>

          <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 8 }}>
            {t('vendorPerformance.basedOn')} {metrics.period_days} {t('vendorPerformance.days')}
          </Text>
        </Card>

        {/* Key Metrics */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
          {t('vendorPerformance.keyMetrics')}
        </Text>
        <Card style={{ marginBottom: 16 }}>
          <MetricRow
            label={t('vendorPerformance.fulfillmentRate')}
            value={metrics.fulfillment_rate}
            suffix="%"
            icon={<Target size={16} color={colors.success} />}
            good={metrics.fulfillment_rate >= 95}
          />
          <MetricRow
            label={t('vendorPerformance.cancellationRate')}
            value={metrics.cancellation_rate}
            suffix="%"
            icon={<AlertTriangle size={16} color={colors.error} />}
            good={metrics.cancellation_rate < 5}
          />
          <MetricRow
            label={t('vendorPerformance.avgPrepTime')}
            value={formatMinutes(Math.round(metrics.avg_preparation_time_min))}
            icon={<Timer size={16} color={colors.warning} />}
          />
          <MetricRow
            label={t('vendorPerformance.onTimeDelivery')}
            value={metrics.on_time_delivery_rate}
            suffix="%"
            icon={<Package size={16} color={colors.primary[500]} />}
            good={metrics.on_time_delivery_rate >= 90}
          />
          <MetricRow
            label={t('vendorPerformance.avgRating')}
            value={metrics.avg_rating}
            suffix={` (${metrics.review_count})`}
            icon={<Star size={16} color="#D97706" />}
            good={metrics.avg_rating >= 4.0}
          />
          <MetricRow
            label={t('vendorPerformance.reviewResponseRate')}
            value={metrics.review_response_rate}
            suffix="%"
            icon={<MessageSquare size={16} color="#7C3AED" />}
            good={metrics.review_response_rate >= 80}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} color="#1E40AF" />
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: colors.text.secondary, marginLeft: 10 }}>
              {t('vendorPerformance.disputeRate')}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: metrics.dispute_rate < 3 ? colors.success : colors.error }}>
              {metrics.dispute_rate.toFixed(1)}%
            </Text>
          </View>
        </Card>

        {/* Order Stats */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
          {t('vendorPerformance.orderStats')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{metrics.total_orders}</Text>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>{t('vendorPerformance.totalOrders')}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.success }}>{metrics.fulfilled_orders}</Text>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>{t('vendorPerformance.fulfilled')}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.error }}>{metrics.cancelled_orders}</Text>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>{t('vendorPerformance.cancelled')}</Text>
          </Card>
        </View>

        {/* Revenue */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TrendingUp size={18} color={colors.success} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginLeft: 6 }}>
              {t('vendorPerformance.totalRevenue')}
            </Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.success }}>
            {formatCurrency(metrics.total_revenue)}
          </Text>
        </Card>

        {/* Returns & Disputes */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
          {t('vendorPerformance.issueMetrics')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>{t('vendorPerformance.returns')}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>{metrics.total_returns}</Text>
            <Text style={{ fontSize: 12, color: metrics.return_rate < 5 ? colors.success : colors.error, marginTop: 2 }}>
              {metrics.return_rate.toFixed(1)}% rate
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>{t('vendorPerformance.disputes')}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>{metrics.total_disputes}</Text>
            <Text style={{ fontSize: 12, color: metrics.dispute_rate < 3 ? colors.success : colors.error, marginTop: 2 }}>
              {metrics.dispute_rate.toFixed(1)}% rate
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>{t('vendorPerformance.avgResponse')}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>
              {metrics.avg_dispute_response_hours.toFixed(0)}h
            </Text>
            <Text style={{ fontSize: 12, color: metrics.avg_dispute_response_hours < 24 ? colors.success : colors.error, marginTop: 2 }}>
              {metrics.avg_dispute_response_hours < 24 ? 'Good' : 'Slow'}
            </Text>
          </Card>
        </View>

        {/* Score Trend */}
        {history.length > 0 && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
              {t('vendorPerformance.scoreTrend')}
            </Text>
            <Card style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 2 }}>
                {history.slice(-14).map((h, i) => {
                  const barHeight = Math.max(4, (h.performance_score / maxScore) * 70);
                  const barTier = TIER_COLORS[h.performance_tier] ?? TIER_COLORS.unrated;
                  return (
                    <View key={h.id ?? i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <View style={{ width: '80%', height: barHeight, backgroundColor: barTier.text, borderRadius: 2 }} />
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontSize: 10, color: colors.text.muted }}>
                  {history.length > 0 ? history[Math.max(0, history.length - 14)]?.snapshot_date?.slice(5) : ''}
                </Text>
                <Text style={{ fontSize: 10, color: colors.text.muted }}>
                  {history[history.length - 1]?.snapshot_date?.slice(5) ?? ''}
                </Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
