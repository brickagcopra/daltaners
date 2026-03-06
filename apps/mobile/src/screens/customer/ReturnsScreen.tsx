import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  RotateCcw, Package, ChevronRight, Clock,
} from 'lucide-react-native';
import { orderApi } from '../../services/api';
import { Card, Badge, LoadingSpinner, EmptyState } from '../../components/shared';
import { colors } from '../../theme';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { ReturnRequest, ReturnStatus, ReturnReasonCategory } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  cancelled: 'Cancelled',
  received: 'Received',
  refunded: 'Refunded',
  escalated: 'Escalated',
};

const RETURN_STATUS_COLORS: Record<ReturnStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  approved: { bg: '#D1FAE5', text: '#065F46' },
  denied: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  received: { bg: '#DBEAFE', text: '#1E40AF' },
  refunded: { bg: '#D1FAE5', text: '#065F46' },
  escalated: { bg: '#FEE2E2', text: '#991B1B' },
};

const RETURN_REASON_LABELS: Record<ReturnReasonCategory, string> = {
  defective: 'Product is defective',
  wrong_item: 'Wrong item received',
  damaged: 'Item arrived damaged',
  not_as_described: 'Not as described',
  missing_item: 'Missing item from order',
  expired: 'Product expired',
  change_of_mind: 'Changed my mind',
  other: 'Other reason',
};

const FILTER_TABS: { label: string; status: ReturnStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'Pending', status: 'pending' },
  { label: 'Approved', status: 'approved' },
  { label: 'Refunded', status: 'refunded' },
  { label: 'Denied', status: 'denied' },
];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function ReturnsScreen() {
  const navigation = useNavigation<Nav>();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);

  const selectedStatus = FILTER_TABS[activeFilter].status;

  const loadReturns = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const params: Record<string, string> = { page: '1', limit: '50' };
      if (selectedStatus) params.status = selectedStatus;
      const { data } = await orderApi.get('/returns/my', { params });
      setReturns(data.data ?? data ?? []);
    } catch {
      setReturns([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadReturns(false);
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Filter Tabs */}
      <View style={{ backgroundColor: colors.surface, paddingVertical: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {FILTER_TABS.map((tab, idx) => {
            const isActive = activeFilter === idx;
            return (
              <TouchableOpacity
                key={tab.label}
                onPress={() => { setActiveFilter(idx); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isActive ? colors.primary[500] : colors.background,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isActive ? '#FFFFFF' : colors.text.secondary,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {returns.length === 0 ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ flex: 1 }}
        >
          <EmptyState
            icon={<RotateCcw size={48} color={colors.text.muted} />}
            title="No return requests"
            description={
              activeFilter === 0
                ? "You haven't submitted any return requests yet."
                : `No ${FILTER_TABS[activeFilter].label.toLowerCase()} returns.`
            }
          />
        </ScrollView>
      ) : (
        <FlatList
          data={returns}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item: ret }) => {
            const statusColor = RETURN_STATUS_COLORS[ret.status];
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('ReturnDetail', { returnId: ret.id, requestNumber: ret.request_number })}
              >
                <Card style={{ padding: 16 }}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                        {ret.request_number}
                      </Text>
                      <View style={{ backgroundColor: statusColor.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor.text }}>
                          {RETURN_STATUS_LABELS[ret.status]}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.text.muted} />
                  </View>

                  {/* Reason */}
                  <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 8 }}>
                    {RETURN_REASON_LABELS[ret.reason_category]}
                  </Text>

                  {/* Items preview */}
                  {ret.items.length > 0 && (
                    <Text style={{ fontSize: 13, color: colors.text.primary, marginBottom: 8 }} numberOfLines={1}>
                      {ret.items.map((i) => i.product_name).join(', ')}
                    </Text>
                  )}

                  {/* Footer row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Package size={12} color={colors.text.muted} />
                        <Text style={{ fontSize: 12, color: colors.text.muted }}>
                          {ret.items.length} item{ret.items.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={colors.text.muted} />
                        <Text style={{ fontSize: 12, color: colors.text.muted }}>
                          {timeAgo(ret.created_at)}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary[500] }}>
                      {'\u20B1'}{ret.refund_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
