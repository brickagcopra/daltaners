import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Phone, MessageCircle, Navigation } from 'lucide-react-native';
import { useOrderTrackingStore } from '../../stores/orderTracking.store';
import { orderApi } from '../../services/api';
import { Card, StatusBadge, Avatar, LoadingSpinner } from '../../components/shared';
import { colors } from '../../theme';
import { formatCurrency, formatDateTime, formatMinutes, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Order, OrderStatus } from '../../types';

type Props = NativeStackScreenProps<CustomerStackParamList, 'OrderTracking'>;

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready' },
  { status: 'picked_up', label: 'Picked Up' },
  { status: 'in_transit', label: 'On the Way' },
  { status: 'delivered', label: 'Delivered' },
];

const TRACKABLE = ['picked_up', 'in_transit'];

export function OrderTrackingScreen({ route }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { startTracking, stopTracking, getTracking } = useOrderTrackingStore();

  const tracking = getTracking(orderId);

  useEffect(() => {
    loadOrder();
    return () => stopTracking(orderId);
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data } = await orderApi.get(`/orders/${orderId}`);
      setOrder(data.data);
      if (TRACKABLE.includes(data.data.status)) {
        startTracking(orderId);
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!order) return <LoadingSpinner fullScreen message="Order not found" />;

  const currentStatusIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Live Tracking Banner */}
      {tracking?.isLive && (
        <View style={{ backgroundColor: colors.success, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>{t('tracking.live')}</Text>
          {tracking.eta && (
            <Text style={{ color: '#FFFFFF', fontSize: 13, marginLeft: 'auto' }}>
              ETA: {formatMinutes(tracking.eta)}
            </Text>
          )}
        </View>
      )}

      <View style={{ padding: 16 }}>
        {/* Order Info */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
                #{order.order_number}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 2 }}>
                {formatDateTime(order.created_at)}
              </Text>
            </View>
            <StatusBadge status={order.status} />
          </View>
        </Card>

        {/* Status Timeline */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 16 }}>
            Order Status
          </Text>
          {isCancelled ? (
            <View style={{ alignItems: 'center', padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.error }}>Order Cancelled</Text>
              {order.cancelled_at && (
                <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4 }}>
                  {formatDateTime(order.cancelled_at)}
                </Text>
              )}
            </View>
          ) : (
            STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <View key={step.status} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isCompleted ? colors.primary[500] : '#E5E7EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isCompleted && <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                    </View>
                    {index < STATUS_STEPS.length - 1 && (
                      <View
                        style={{
                          width: 2,
                          height: 32,
                          backgroundColor: isCompleted ? colors.primary[500] : '#E5E7EB',
                        }}
                      />
                    )}
                  </View>
                  <View style={{ paddingBottom: 24 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isCurrent ? '600' : '400',
                        color: isCompleted ? colors.text.primary : colors.text.muted,
                      }}
                    >
                      {step.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Rider Info */}
        {order.delivery_person && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
              {t('tracking.riderInfo')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={order.delivery_person.name} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
                  {order.delivery_person.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.text.muted }}>
                  {order.delivery_person.vehicle_type}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${order.delivery_person!.phone}`)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Phone size={18} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL(`sms:${order.delivery_person!.phone}`)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={18} color={colors.primary[500]} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Order Items */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
            Order Items
          </Text>
          {order.items.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary, flex: 1 }}>
                {item.quantity}x {item.product_name}
              </Text>
              <Text style={{ fontSize: 14, color: colors.text.primary }}>{formatCurrency(item.total_price)}</Text>
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>Subtotal</Text>
              <Text style={{ fontSize: 14 }}>{formatCurrency(order.subtotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>Delivery Fee</Text>
              <Text style={{ fontSize: 14 }}>{formatCurrency(order.delivery_fee)}</Text>
            </View>
            {order.discount_amount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, color: colors.success }}>Discount</Text>
                <Text style={{ fontSize: 14, color: colors.success }}>-{formatCurrency(order.discount_amount)}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary[500] }}>
                {formatCurrency(order.total_amount)}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
