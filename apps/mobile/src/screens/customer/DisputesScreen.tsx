import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, ChevronRight, Clock, MessageSquare } from 'lucide-react-native';
import { Card, Badge, EmptyState, LoadingSpinner } from '../../components/shared';
import { orderApi } from '../../services/api';
import { colors } from '../../theme';
import { formatDate, getTimeAgo } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Dispute, DisputeStatus } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

const STATUS_TABS: { key: 'all' | DisputeStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
];

const DISPUTE_STATUS_COLORS: Record<DisputeStatus, { bg: string; text: string }> = {
  open: { bg: '#FEF3C7', text: '#92400E' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  pending_vendor: { bg: '#E0E7FF', text: '#3730A3' },
  pending_customer: { bg: '#FFF3ED', text: '#C24018' },
  escalated: { bg: '#FEE2E2', text: '#991B1B' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
};

const CATEGORY_LABELS: Record<string, string> = {
  order_not_received: 'Order Not Received',
  item_missing: 'Item Missing',
  wrong_item: 'Wrong Item',
  damaged_item: 'Damaged Item',
  quality_issue: 'Quality Issue',
  overcharged: 'Overcharged',
  late_delivery: 'Late Delivery',
  vendor_behavior: 'Vendor Behavior',
  delivery_behavior: 'Delivery Behavior',
  unauthorized_charge: 'Unauthorized Charge',
  other: 'Other',
};

export function DisputesScreen() {
  const navigation = useNavigation<Nav>();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | DisputeStatus>('all');

  const loadDisputes = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const params: Record<string, string> = {};
      if (activeTab !== 'all') params.status = activeTab;
      const { data } = await orderApi.get('/disputes', { params });
      setDisputes(data.data ?? data ?? []);
    } catch {
      setDisputes([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setIsLoading(true);
    loadDisputes();
  }, [loadDisputes]);

  const renderDispute = ({ item }: { item: Dispute }) => {
    const statusColor = DISPUTE_STATUS_COLORS[item.status] ?? DISPUTE_STATUS_COLORS.open;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('DisputeDetail', { disputeId: item.id, disputeNumber: item.dispute_number })}
        activeOpacity={0.7}
      >
        <Card style={styles.disputeCard}>
          <View style={styles.disputeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.disputeNumber}>#{item.dispute_number}</Text>
              <Text style={styles.disputeSubject} numberOfLines={1}>{item.subject}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={item.status.replace(/_/g, ' ')} backgroundColor={statusColor.bg} color={statusColor.text} />
              <Text style={styles.timeAgo}>{getTimeAgo(item.created_at)}</Text>
            </View>
          </View>

          <View style={styles.disputeMeta}>
            <View style={styles.metaItem}>
              <AlertTriangle size={14} color={colors.text.muted} />
              <Text style={styles.metaText}>{CATEGORY_LABELS[item.category] ?? item.category}</Text>
            </View>
            {item.store_name && (
              <View style={styles.metaItem}>
                <Text style={styles.metaText}>{item.store_name}</Text>
              </View>
            )}
          </View>

          <View style={styles.disputeFooter}>
            {item.order_number && (
              <Text style={styles.orderRef}>Order: #{item.order_number}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={14} color={colors.text.muted} />
              <Text style={styles.metaText}>{item.messages?.length ?? 0}</Text>
              <ChevronRight size={16} color={colors.text.muted} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Status Filter Tabs */}
      <View style={styles.tabContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(item.key)}
              style={[styles.tab, activeTab === item.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={disputes}
        keyExtractor={(item) => item.id}
        renderItem={renderDispute}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadDisputes(true)} colors={[colors.primary[500]]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<AlertTriangle size={48} color={colors.text.muted} />}
            title="No Disputes"
            description={activeTab === 'all' ? 'You have no disputes yet.' : `No ${activeTab.replace(/_/g, ' ')} disputes.`}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  disputeCard: {
    padding: 0,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  disputeNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  disputeSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.text.muted,
  },
  disputeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderRef: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
