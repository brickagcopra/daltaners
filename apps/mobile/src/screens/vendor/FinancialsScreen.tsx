import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Wallet,
  Receipt,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { paymentApi } from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme';
import { formatCurrency, formatDate, t } from '../../utils';
import type { VendorSettlement, VendorSettlementSummary, VendorTaxSummary, SettlementStatus } from '../../types';

type Tab = 'overview' | 'settlements' | 'tax';

const SETTLEMENT_STATUS_COLORS: Record<SettlementStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  processing: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  failed: { bg: '#FEE2E2', text: '#991B1B' },
};

export function FinancialsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Overview data
  const [summary, setSummary] = useState<VendorSettlementSummary | null>(null);
  const [taxSummary, setTaxSummary] = useState<VendorTaxSummary | null>(null);

  // Settlements list
  const [settlements, setSettlements] = useState<VendorSettlement[]>([]);
  const [settlementPage, setSettlementPage] = useState(1);
  const [hasMoreSettlements, setHasMoreSettlements] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const [summaryRes, taxRes] = await Promise.all([
        paymentApi.get('/payments/settlements/summary').catch(() => ({ data: { data: null } })),
        paymentApi.get('/payments/tax/summary').catch(() => ({ data: { data: null } })),
      ]);
      setSummary(summaryRes.data.data);
      setTaxSummary(taxRes.data.data);
    } catch {
      // silent
    }
  }, []);

  const fetchSettlements = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const { data } = await paymentApi.get('/payments/settlements', {
          params: { page: pageNum, limit: 20 },
        });
        const items = data.data ?? [];
        const meta = data.meta;

        if (append) {
          setSettlements((prev) => [...prev, ...items]);
        } else {
          setSettlements(items);
        }
        setHasMoreSettlements(meta?.page < meta?.totalPages);
      } catch {
        if (!append) setSettlements([]);
      }
    },
    [],
  );

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchOverview(), fetchSettlements(1)]);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [fetchOverview, fetchSettlements]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setSettlementPage(1);
    loadAll();
  };

  const handleLoadMoreSettlements = () => {
    if (!hasMoreSettlements) return;
    const nextPage = settlementPage + 1;
    setSettlementPage(nextPage);
    fetchSettlements(nextPage, true);
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: t('vendorFinancials.overview') },
    { key: 'settlements', label: t('vendorFinancials.settlements') },
    { key: 'tax', label: t('vendorFinancials.tax') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: isActive ? colors.primary[500] : 'transparent',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isActive ? colors.primary[500] : colors.text.muted }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'overview' && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={{ padding: 16 }}
        >
          {/* Balance Card */}
          <Card style={{ marginBottom: 16, backgroundColor: colors.primary[500] }}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              {t('vendorFinancials.currentBalance')}
            </Text>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
              {formatCurrency(summary?.current_balance ?? 0)}
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              Commission Rate: {summary?.commission_rate ?? 0}%
            </Text>
          </Card>

          {/* Stats Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {[
              { label: t('vendorFinancials.totalEarned'), value: formatCurrency(summary?.total_earned ?? 0), icon: <TrendingUp size={18} color={colors.success} />, bg: '#D1FAE5' },
              { label: t('vendorFinancials.totalPaid'), value: formatCurrency(summary?.total_paid ?? 0), icon: <CheckCircle size={18} color="#1E40AF" />, bg: '#DBEAFE' },
              { label: t('vendorFinancials.totalPending'), value: formatCurrency(summary?.total_pending ?? 0), icon: <Clock size={18} color="#92400E" />, bg: '#FEF3C7' },
            ].map((stat) => (
              <Card key={stat.label} style={{ width: '48%' }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: stat.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  {stat.icon}
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>{stat.value}</Text>
                <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>{stat.label}</Text>
              </Card>
            ))}
          </View>

          {/* Recent Settlements */}
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 10 }}>
            {t('vendorFinancials.recentSettlements')}
          </Text>
          {settlements.slice(0, 3).map((s) => {
            const statusStyle = SETTLEMENT_STATUS_COLORS[s.status];
            return (
              <Card key={s.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                      {formatCurrency(s.final_amount)}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>
                      {formatDate(s.period_start)} - {formatDate(s.period_end)}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 2 }}>
                      {s.order_count} orders
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: statusStyle.bg }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
                      {s.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
          {settlements.length === 0 && (
            <Card>
              <Text style={{ color: colors.text.muted, textAlign: 'center', padding: 16 }}>
                {t('vendorFinancials.noSettlements')}
              </Text>
            </Card>
          )}
        </ScrollView>
      )}

      {activeTab === 'settlements' && (
        <FlatList
          data={settlements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMoreSettlements}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => {
            const statusStyle = SETTLEMENT_STATUS_COLORS[item.status];
            return (
              <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>
                    {formatDate(item.period_start)} - {formatDate(item.period_end)}
                  </Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: statusStyle.bg }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Breakdown */}
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.text.secondary }}>Gross</Text>
                    <Text style={{ fontSize: 13, color: colors.text.primary }}>{formatCurrency(item.gross_amount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.text.secondary }}>Commission</Text>
                    <Text style={{ fontSize: 13, color: colors.error }}>-{formatCurrency(item.commission_amount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.text.secondary }}>Tax (EWT)</Text>
                    <Text style={{ fontSize: 13, color: colors.error }}>-{formatCurrency(item.withholding_tax)}</Text>
                  </View>
                  {item.adjustment_amount !== 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.text.secondary }}>Adjustments</Text>
                      <Text style={{ fontSize: 13, color: item.adjustment_amount > 0 ? colors.success : colors.error }}>
                        {item.adjustment_amount > 0 ? '+' : ''}{formatCurrency(item.adjustment_amount)}
                      </Text>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>Final Payout</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>{formatCurrency(item.final_amount)}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 8 }}>
                  {item.order_count} orders · {item.payment_reference ? `Ref: ${item.payment_reference}` : 'No reference yet'}
                </Text>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Wallet size={48} color={colors.text.muted} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
                {t('vendorFinancials.noSettlements')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center' }}>
                {t('vendorFinancials.noSettlementsDesc')}
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'tax' && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={{ padding: 16 }}
        >
          {taxSummary ? (
            <>
              {/* Tax Summary Card */}
              <Card style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Receipt size={20} color={colors.primary[500]} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginLeft: 8 }}>
                    {t('vendorFinancials.taxSummary')}
                  </Text>
                </View>

                <View style={{ gap: 10 }}>
                  {[
                    { label: t('vendorFinancials.totalGross'), value: formatCurrency(taxSummary.total_gross), color: colors.text.primary },
                    { label: t('vendorFinancials.totalVat'), value: formatCurrency(taxSummary.total_vat), color: colors.warning },
                    { label: t('vendorFinancials.totalEwt'), value: formatCurrency(taxSummary.total_ewt), color: colors.error },
                    { label: t('vendorFinancials.totalCommissions'), value: formatCurrency(taxSummary.total_commissions), color: '#7C3AED' },
                  ].map((row) => (
                    <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, color: colors.text.secondary }}>{row.label}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: row.color }}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: 12, padding: 8, backgroundColor: colors.background, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, color: colors.text.muted }}>
                    Period: {formatDate(taxSummary.period_start)} - {formatDate(taxSummary.period_end)}
                  </Text>
                </View>
              </Card>

              {/* Info Note */}
              <Card style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB' }}>
                <AlertCircle size={16} color="#D97706" style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 }}>
                  {t('vendorFinancials.taxNote')}
                </Text>
              </Card>
            </>
          ) : (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Receipt size={48} color={colors.text.muted} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
                {t('vendorFinancials.noTaxData')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
