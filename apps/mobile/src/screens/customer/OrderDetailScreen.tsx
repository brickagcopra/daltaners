import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Package, Truck, Star, AlertTriangle, RotateCcw, ShoppingCart,
  XCircle, MapPin, CheckCircle, Clock, ChevronRight,
} from 'lucide-react-native';
import { Card, StatusBadge, Button, LoadingSpinner } from '../../components/shared';
import { orderApi } from '../../services/api';
import { useCartStore } from '../../stores/cart.store';
import { colors, spacing } from '../../theme';
import { formatCurrency, formatDateTime } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Order, OrderStatus } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'OrderDetail'>;

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready' },
  { status: 'picked_up', label: 'Picked Up' },
  { status: 'in_transit', label: 'In Transit' },
  { status: 'delivered', label: 'Delivered' },
];

function getStatusIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  return STATUS_STEPS.findIndex((s) => s.status === status);
}

export function OrderDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;
  const addItem = useCartStore((s) => s.addItem);

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data } = await orderApi.get(`/orders/${orderId}`);
      setOrder(data.data ?? data);
    } catch {
      Alert.alert('Error', 'Failed to load order details.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await orderApi.post(`/orders/${orderId}/cancel`);
              await loadOrder();
            } catch {
              Alert.alert('Error', 'Failed to cancel order.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  const handleReorder = () => {
    if (!order) return;
    order.items.forEach((item) => {
      addItem(
        {
          id: item.product_id,
          name: item.product_name,
          slug: '',
          base_price: item.unit_price,
          category_id: '',
          store_id: order.store_id,
          images: item.product_image ? [{ id: '1', url: item.product_image, is_primary: true, sort_order: 0 }] : [],
          variants: [],
          rating_average: 0,
          rating_count: 0,
          total_sold: 0,
          status: 'active',
          store: { id: order.store_id, name: order.store_name ?? '', slug: '' },
        },
        item.quantity,
      );
    });
    Alert.alert('Added to Cart', 'Items have been added to your cart.', [
      { text: 'View Cart', onPress: () => navigation.navigate('Main') },
      { text: 'OK' },
    ]);
  };

  const handleTrack = () => {
    if (!order) return;
    navigation.navigate('OrderTracking', {
      orderId: order.id,
      orderNumber: order.order_number,
    });
  };

  if (isLoading || !order) return <LoadingSpinner fullScreen />;

  const isActive = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit'].includes(order.status);
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const currentStep = getStatusIndex(order.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Order Header */}
        <Card style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.orderNumber}>#{order.order_number}</Text>
              <Text style={styles.mutedText}>{formatDateTime(order.created_at)}</Text>
            </View>
            <StatusBadge status={order.status} />
          </View>
          {order.store_name && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
              <Package size={16} color={colors.text.secondary} />
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>{order.store_name}</Text>
            </View>
          )}
          {order.delivery_address && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
              <MapPin size={16} color={colors.text.secondary} />
              <Text style={{ fontSize: 13, color: colors.text.muted, flex: 1 }} numberOfLines={2}>
                {order.delivery_address}
              </Text>
            </View>
          )}
        </Card>

        {/* Status Timeline */}
        {!isCancelled && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;
              return (
                <View key={step.status} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ alignItems: 'center', width: 28 }}>
                    <View
                      style={[
                        styles.stepDot,
                        isCompleted && styles.stepDotCompleted,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      {isCompleted && <CheckCircle size={14} color="#FFFFFF" />}
                    </View>
                    {index < STATUS_STEPS.length - 1 && (
                      <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 16, paddingLeft: 8 }}>
                    <Text
                      style={[
                        styles.stepLabel,
                        isCompleted && { color: colors.text.primary, fontWeight: '600' },
                        isCurrent && { color: colors.primary[500] },
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isCurrent && step.status === order.status && order.confirmed_at && step.status === 'confirmed' && (
                      <Text style={styles.stepTime}>{formatDateTime(order.confirmed_at)}</Text>
                    )}
                    {isCurrent && step.status === 'delivered' && order.delivered_at && (
                      <Text style={styles.stepTime}>{formatDateTime(order.delivered_at)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <Card style={[styles.section, { backgroundColor: '#FEE2E2' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <XCircle size={20} color="#991B1B" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#991B1B' }}>Order Cancelled</Text>
            </View>
            {order.cancelled_at && (
              <Text style={{ fontSize: 13, color: '#991B1B', marginTop: 4 }}>
                Cancelled on {formatDateTime(order.cancelled_at)}
              </Text>
            )}
          </Card>
        )}

        {/* Order Items */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
              ]}
            >
              <View style={styles.itemQtyBadge}>
                <Text style={styles.itemQtyText}>{item.quantity}x</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                  {item.product_name}
                </Text>
                {item.variant_name && (
                  <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                    {item.variant_name}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                {formatCurrency(item.total_price)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Payment Breakdown */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Subtotal</Text>
            <Text style={styles.paymentValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Delivery Fee</Text>
            <Text style={styles.paymentValue}>
              {order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : 'Free'}
            </Text>
          </View>
          {order.discount_amount > 0 && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.success }]}>Discount</Text>
              <Text style={[styles.paymentValue, { color: colors.success }]}>
                -{formatCurrency(order.discount_amount)}
              </Text>
            </View>
          )}
          {order.coupon_code && (
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { color: colors.success }]}>Coupon</Text>
              <Text style={[styles.paymentValue, { color: colors.success }]}>{order.coupon_code}</Text>
            </View>
          )}
          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
          </View>
          <View style={[styles.paymentRow, { marginTop: 4 }]}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>{order.payment_method}</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isActive && (
            <Button
              title="Track Order"
              icon={<Truck size={18} color="#FFFFFF" />}
              onPress={handleTrack}
              fullWidth
            />
          )}

          {canCancel && (
            <Button
              title="Cancel Order"
              variant="danger"
              icon={<XCircle size={18} color="#FFFFFF" />}
              onPress={handleCancel}
              loading={isCancelling}
              fullWidth
            />
          )}

          {isDelivered && (
            <>
              <Button
                title="Leave a Review"
                icon={<Star size={18} color="#FFFFFF" />}
                onPress={() =>
                  navigation.navigate('Review', {
                    reviewableType: 'store',
                    reviewableId: order.store_id,
                    reviewableName: order.store_name ?? 'Store',
                    orderId: order.id,
                  })
                }
                fullWidth
              />
              <Button
                title="Reorder"
                variant="outline"
                icon={<ShoppingCart size={18} color={colors.primary[500]} />}
                onPress={handleReorder}
                fullWidth
              />
              <Button
                title="Report an Issue"
                variant="outline"
                icon={<AlertTriangle size={18} color={colors.primary[500]} />}
                onPress={() => navigation.navigate('CreateDispute', { orderId: order.id, orderNumber: order.order_number })}
                fullWidth
              />
              <Button
                title="Request Return"
                variant="ghost"
                icon={<RotateCcw size={18} color={colors.primary[500]} />}
                onPress={() => navigation.navigate('CreateReturn', { orderId: order.id })}
                fullWidth
              />
            </>
          )}
        </View>

        {/* Order Notes */}
        {order.notes && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Order Notes</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary }}>{order.notes}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  mutedText: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary[500],
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 2,
  },
  stepTime: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  itemQtyBadge: {
    backgroundColor: colors.primary[50],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemQtyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  paymentValue: {
    fontSize: 14,
    color: colors.text.primary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[500],
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
});
