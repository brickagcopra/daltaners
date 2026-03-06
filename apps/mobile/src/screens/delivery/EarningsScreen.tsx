import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Star, Clock, CheckCircle, Percent } from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { deliveryApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { DeliveryEarnings } from '../../types';

export function EarningsScreen() {
  const [earnings, setEarnings] = useState<DeliveryEarnings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const { data } = await deliveryApi.get('/delivery/earnings');
      setEarnings(data.data ?? {
        today: 0,
        this_week: 0,
        this_month: 0,
        total_deliveries: 0,
        average_rating: 0,
        acceptance_rate: 0,
        completion_rate: 0,
      });
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!earnings) return <LoadingSpinner fullScreen />;

  const periodAmounts = {
    today: earnings.today,
    week: earnings.this_week,
    month: earnings.this_month,
  };

  const stats = [
    { label: 'Total Deliveries', value: earnings.total_deliveries.toString(), icon: <CheckCircle size={20} color={colors.success} />, color: '#D1FAE5' },
    { label: 'Avg. Rating', value: earnings.average_rating.toFixed(1), icon: <Star size={20} color={colors.accent[500]} />, color: '#FFF9D6' },
    { label: 'Acceptance Rate', value: `${(earnings.acceptance_rate * 100).toFixed(0)}%`, icon: <Percent size={20} color={colors.primary[500]} />, color: colors.primary[50] },
    { label: 'Completion Rate', value: `${(earnings.completion_rate * 100).toFixed(0)}%`, icon: <TrendingUp size={20} color={colors.secondary[500]} />, color: colors.secondary[50] },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadEarnings(); }} />}
      >
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{t('delivery.earnings')}</Text>
        </View>

        {/* Earnings Card */}
        <View
          style={{
            margin: 16,
            marginTop: 0,
            padding: 24,
            borderRadius: 16,
            backgroundColor: colors.primary[500],
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            {period === 'today' ? t('delivery.todayEarnings') : period === 'week' ? t('delivery.weeklyEarnings') : 'This Month'}
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginTop: 4 }}>
            {formatCurrency(periodAmounts[period])}
          </Text>

          {/* Period tabs */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {(['today', 'week', 'month'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: period === p ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '500' }}>
                  {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Performance Stats */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
            Performance
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {stats.map((stat) => (
              <Card key={stat.label} style={{ width: '48%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: stat.color, alignItems: 'center', justifyContent: 'center' }}>
                    {stat.icon}
                  </View>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{stat.value}</Text>
                <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>{stat.label}</Text>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
