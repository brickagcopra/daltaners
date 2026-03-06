import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, ChevronRight } from 'lucide-react-native';
import { Card, StatusBadge, Button, LoadingSpinner, EmptyState } from '../../components/shared';
import { orderApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, formatDateTime, t } from '../../utils';
import type { Order, OrderStatus } from '../../types';

const STATUS_TABS: { label: string; status?: OrderStatus }[] = [
  { label: 'All' },
  { label: 'Pending', status: 'pending' },
  { label: 'Confirmed', status: 'confirmed' },
  { label: 'Preparing', status: 'preparing' },
  { label: 'Ready', status: 'ready' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  pending: { label: 'Accept', status: 'confirmed' },
  confirmed: { label: 'Start Preparing', status: 'preparing' },
  preparing: { label: 'Mark Ready', status: 'ready' },
};

export function OrderManagementScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderStatus | undefined>();

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async () => {
    try {
      const params: Record<string, string | number> = { limit: 20 };
      if (activeTab) params.status = activeTab;
      const { data } = await orderApi.get('/orders/vendor', { params });
      setOrders(data.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await orderApi.patch(`/orders/${orderId}/status`, { status });
      loadOrders();
    } catch {
      Alert.alert('Error', 'Failed to update order status.');
    }
  };

  const rejectOrder = async (orderId: string) => {
    Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await orderApi.patch(`/orders/${orderId}/status`, { status: 'cancelled', reason: 'Rejected by vendor' });
            loadOrders();
          } catch {
            Alert.alert('Error', 'Failed to reject order.');
          }
        },
      },
    ]);
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const nextAction = NEXT_STATUS[item.status];

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
              #{item.order_number}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Order items */}
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          {item.items.slice(0, 3).map((oi) => (
            <Text key={oi.id} style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 2 }}>
              {oi.quantity}x {oi.product_name}
            </Text>
          ))}
          {item.items.length > 3 && (
            <Text style={{ fontSize: 12, color: colors.text.muted }}>+{item.items.length - 3} more items</Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary[500] }}>
            {formatCurrency(item.total_amount)}
          </Text>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {item.status === 'pending' && (
              <TouchableOpacity
                onPress={() => rejectOrder(item.id)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={colors.error} />
              </TouchableOpacity>
            )}
            {nextAction && (
              <Button title={nextAction.label} onPress={() => updateStatus(item.id, nextAction.status)} size="sm" />
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{t('vendor.orders')}</Text>
      </View>

      {/* Status tabs */}
      <ScrollableTabBar tabs={STATUS_TABS} activeTab={activeTab} onPress={(status) => { setActiveTab(status); setIsLoading(true); }} />

      {isLoading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders" description="No orders in this status." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadOrders(); }} />}
        />
      )}
    </SafeAreaView>
  );
}

function ScrollableTabBar({
  tabs,
  activeTab,
  onPress,
}: {
  tabs: typeof STATUS_TABS;
  activeTab: OrderStatus | undefined;
  onPress: (status: OrderStatus | undefined) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.label}
          onPress={() => onPress(tab.status)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: activeTab === tab.status ? colors.primary[500] : '#F3F4F6',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: activeTab === tab.status ? '#FFFFFF' : colors.text.secondary,
            }}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
