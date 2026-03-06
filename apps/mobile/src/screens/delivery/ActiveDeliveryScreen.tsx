import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapPin, Phone, MessageCircle, Navigation, Package, CheckCircle } from 'lucide-react-native';
import { Card, Button, StatusBadge, Avatar, LoadingSpinner } from '../../components/shared';
import { deliveryApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { DeliveryStackParamList } from '../../navigation/DeliveryNavigator';
import type { DeliveryAssignment, OrderStatus } from '../../types';

type Props = NativeStackScreenProps<DeliveryStackParamList, 'ActiveDelivery'>;

const WORKFLOW_STEPS: { status: string; label: string; action: string; nextStatus: string }[] = [
  { status: 'accepted', label: 'Navigate to Store', action: 'Arrived at Store', nextStatus: 'at_store' },
  { status: 'at_store', label: 'Picking up order', action: 'Picked Up', nextStatus: 'picked_up' },
  { status: 'picked_up', label: 'Navigate to Customer', action: 'Arrived', nextStatus: 'in_transit' },
  { status: 'in_transit', label: 'At Customer Location', action: 'Delivered', nextStatus: 'delivered' },
];

export function ActiveDeliveryScreen({ route, navigation }: Props) {
  const { deliveryId } = route.params;
  const [delivery, setDelivery] = useState<DeliveryAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadDelivery();
  }, [deliveryId]);

  const loadDelivery = async () => {
    try {
      const { data } = await deliveryApi.get(`/delivery/${deliveryId}`);
      setDelivery(data.data);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      await deliveryApi.patch(`/delivery/${deliveryId}/status`, { status });
      if (status === 'delivered') {
        Alert.alert('Delivery Complete!', 'Great job! The delivery has been completed.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        loadDelivery();
      }
    } catch {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!delivery) return <LoadingSpinner fullScreen message="Delivery not found" />;

  const currentStep = WORKFLOW_STEPS.find((s) => s.status === delivery.status);
  const isPickupPhase = ['accepted', 'at_store'].includes(delivery.status);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Status Banner */}
      <View style={{ backgroundColor: colors.primary[500], padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Order</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>#{delivery.order_number}</Text>
          </View>
          <StatusBadge status={delivery.status} />
        </View>
        {currentStep && (
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 8 }}>
            {currentStep.label}
          </Text>
        )}
      </View>

      <View style={{ padding: 16 }}>
        {/* Destination Card */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
            {isPickupPhase ? 'Pickup from' : 'Deliver to'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }}>
              {isPickupPhase ? <Package size={20} color={colors.primary[500]} /> : <MapPin size={20} color={colors.primary[500]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
                {isPickupPhase ? delivery.store_name : 'Customer'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 2 }} numberOfLines={2}>
                {isPickupPhase ? delivery.store_address : delivery.customer_address}
              </Text>
            </View>
          </View>

          {/* Navigate button */}
          <Button
            title={t('delivery.navigate')}
            onPress={() =>
              navigation.navigate('Navigation', {
                deliveryId,
                lat: isPickupPhase ? delivery.store_lat : delivery.customer_lat,
                lng: isPickupPhase ? delivery.store_lng : delivery.customer_lng,
                address: isPickupPhase ? delivery.store_address : delivery.customer_address,
              })
            }
            icon={<Navigation size={16} color="#FFFFFF" />}
            fullWidth
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Contact buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Card
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => {
              const phone = isPickupPhase ? undefined : delivery.customer_phone;
              if (phone) {
                Linking.openURL(`tel:${phone}`);
              } else {
                Alert.alert(t('common.error'), t('delivery.noPhoneAvailable'));
              }
            }}
          >
            <Phone size={20} color={colors.primary[500]} />
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>{t('tracking.callRider')}</Text>
          </Card>
          <Card
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => {
              const phone = isPickupPhase ? undefined : delivery.customer_phone;
              if (phone) {
                Linking.openURL(`sms:${phone}`);
              } else {
                Alert.alert(t('common.error'), t('delivery.noPhoneAvailable'));
              }
            }}
          >
            <MessageCircle size={20} color={colors.primary[500]} />
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>{t('tracking.messageRider')}</Text>
          </Card>
        </View>

        {/* Earnings */}
        <Card style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: colors.text.secondary }}>Delivery Fee</Text>
            <Text style={{ fontSize: 14, fontWeight: '500' }}>{formatCurrency(delivery.delivery_fee)}</Text>
          </View>
          {delivery.tip_amount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>Tip</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.success }}>{formatCurrency(delivery.tip_amount)}</Text>
            </View>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Total Earnings</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary[500] }}>
              {formatCurrency(delivery.delivery_fee + (delivery.tip_amount ?? 0))}
            </Text>
          </View>
        </Card>

        {/* Workflow Steps */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
            Delivery Progress
          </Text>
          {WORKFLOW_STEPS.map((step, index) => {
            const stepIndex = WORKFLOW_STEPS.findIndex((s) => s.status === delivery.status);
            const isCompleted = index < stepIndex;
            const isCurrent = step.status === delivery.status;

            return (
              <View key={step.status} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isCompleted ? colors.success : isCurrent ? colors.primary[500] : '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCompleted && <CheckCircle size={14} color="#FFFFFF" />}
                  {isCurrent && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />}
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: isCompleted || isCurrent ? colors.text.primary : colors.text.muted,
                    fontWeight: isCurrent ? '600' : '400',
                  }}
                >
                  {step.action}
                </Text>
              </View>
            );
          })}
        </Card>
      </View>

      {/* Action Button */}
      {currentStep && (
        <View style={{ padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button
            title={currentStep.action}
            onPress={() => updateStatus(currentStep.nextStatus)}
            loading={isUpdating}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </ScrollView>
  );
}
