import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClipboardList, ChevronRight } from 'lucide-react-native';
import { Card, StatusBadge, LoadingSpinner, EmptyState } from '../../components/shared';
import { orderApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, formatDateTime, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Order } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

export function OrderHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data } = await orderApi.get('/orders/my');
      setOrders(data.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit'];
  const filteredOrders = orders.filter((o) =>
    activeTab === 'active' ? activeStatuses.includes(o.status) : !activeStatuses.includes(o.status),
  );

  const activeStatuses2 = new Set(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit']);

  const renderOrder = ({ item }: { item: Order }) => (
    <Card
      onPress={() => {
        if (activeStatuses2.has(item.status)) {
          navigation.navigate('OrderTracking', { orderId: item.id, orderNumber: item.order_number });
        } else {
          navigation.navigate('OrderDetail', { orderId: item.id, orderNumber: item.order_number });
        }
      }}
      style={{ marginHorizontal: 16, marginBottom: 8 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
            #{item.order_number}
          </Text>
          <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 2 }}>
            {item.store_name ?? 'Store'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
            {formatDateTime(item.created_at)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={item.status} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
            {formatCurrency(item.total_amount)}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.text.muted} style={{ marginLeft: 8 }} />
      </View>
      {item.items.length > 0 && (
        <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 8 }} numberOfLines={1}>
          {item.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
        </Text>
      )}
    </Card>
  );

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{t('orders.title')}</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
        {(['active', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: activeTab === tab ? colors.primary[500] : '#F3F4F6',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: activeTab === tab ? '#FFFFFF' : colors.text.secondary,
              }}
            >
              {tab === 'active' ? t('orders.active') : t('orders.completed')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} color={colors.text.muted} />}
          title={t('orders.empty')}
          description={t('orders.emptyDescription')}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadOrders(); }} />
          }
        />
      )}
    </SafeAreaView>
  );
}
