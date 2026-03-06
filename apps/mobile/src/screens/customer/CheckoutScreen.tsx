import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapPin, CreditCard, Truck, Tag, ChevronRight, X } from 'lucide-react-native';
import { useCartStore } from '../../stores/cart.store';
import { useLocationStore } from '../../stores/location.store';
import { orderApi } from '../../services/api';
import { Button, Card, Input } from '../../components/shared';
import { colors } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { CouponValidationResult } from '../../types';

type Props = NativeStackScreenProps<CustomerStackParamList, 'Checkout'>;

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
  { id: 'gcash', label: 'GCash', icon: '📱' },
  { id: 'maya', label: 'Maya', icon: '📱' },
  { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { id: 'wallet', label: 'Daltaners Wallet', icon: '👛' },
];

export function CheckoutScreen({ navigation }: Props) {
  const { items, subtotal, storeId, clearCart } = useCartStore();
  const { selectedAddress } = useLocationStore();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [notes, setNotes] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  const deliveryFee = orderType === 'delivery' ? 49 : 0;
  const total = subtotal() - discount + deliveryFee;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const { data } = await orderApi.post('/orders/coupons/validate', {
        coupon_code: couponCode.trim(),
        store_id: storeId,
        order_total: subtotal(),
      });
      const result: CouponValidationResult = data.data;
      if (result.valid) {
        setAppliedCoupon(result);
        setDiscount(result.discount_amount);
      } else {
        Alert.alert(t('checkout.couponInvalid'), result.message ?? t('checkout.couponInvalidMessage'));
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || t('checkout.couponError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode('');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress && orderType === 'delivery') {
      Alert.alert('Address Required', 'Please select a delivery address.');
      return;
    }

    setIsPlacing(true);
    try {
      const payload = {
        store_id: storeId,
        order_type: orderType,
        payment_method: paymentMethod,
        delivery_address: selectedAddress?.address_line1,
        delivery_lat: selectedAddress?.latitude,
        delivery_lng: selectedAddress?.longitude,
        notes,
        coupon_code: couponCode || undefined,
        items: items.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant?.id,
          quantity: item.quantity,
          special_instructions: item.special_instructions,
        })),
      };

      const { data } = await orderApi.post('/orders', payload);
      clearCart();
      Alert.alert('Order Placed!', `Order #${data.data.order_number} has been placed successfully.`, [
        {
          text: 'Track Order',
          onPress: () =>
            navigation.replace('OrderTracking', {
              orderId: data.data.id,
              orderNumber: data.data.order_number,
            }),
        },
      ]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to place order';
      Alert.alert('Error', msg);
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Delivery Address */}
        <Card style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MapPin size={20} color={colors.primary[500]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                {t('checkout.deliveryAddress')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 2 }} numberOfLines={2}>
                {selectedAddress?.address_line1 ?? 'No address selected'}
              </Text>
            </View>
            <TouchableOpacity>
              <ChevronRight size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Order Type */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
            {t('checkout.deliveryType')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['delivery', 'pickup'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setOrderType(type)}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderColor: orderType === type ? colors.primary[500] : colors.border,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                  backgroundColor: orderType === type ? colors.primary[50] : colors.surface,
                }}
              >
                <Truck size={20} color={orderType === type ? colors.primary[500] : colors.text.muted} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: orderType === type ? colors.primary[600] : colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  {type === 'delivery' ? t('checkout.standard') : 'Pickup'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Payment Method */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
            {t('checkout.paymentMethod')}
          </Text>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => setPaymentMethod(method.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                borderRadius: 8,
                backgroundColor: paymentMethod === method.id ? colors.primary[50] : 'transparent',
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>{method.icon}</Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: paymentMethod === method.id ? colors.primary[600] : colors.text.primary,
                  fontWeight: paymentMethod === method.id ? '600' : '400',
                }}
              >
                {method.label}
              </Text>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: paymentMethod === method.id ? colors.primary[500] : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {paymentMethod === method.id && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[500] }} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Coupon */}
        <Card style={{ marginBottom: 12 }}>
          {appliedCoupon ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag size={18} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                  {appliedCoupon.coupon_code}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                  -{formatCurrency(appliedCoupon.discount_amount)} {t('checkout.couponApplied')}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon} style={{ padding: 4 }}>
                <X size={18} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag size={18} color={colors.primary[500]} />
              <Input
                placeholder={t('checkout.couponPlaceholder')}
                value={couponCode}
                onChangeText={setCouponCode}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <Button
                title={t('checkout.apply')}
                onPress={handleApplyCoupon}
                variant="outline"
                size="sm"
                loading={isValidatingCoupon}
              />
            </View>
          )}
        </Card>

        {/* Notes */}
        <Input label="Delivery Notes" placeholder="Any special instructions..." value={notes} onChangeText={setNotes} multiline />

        {/* Order Summary */}
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
            {t('checkout.orderSummary')}
          </Text>
          {items.map((item) => {
            const price = (item.product.sale_price ?? item.product.base_price) + (item.variant?.price_adjustment ?? 0);
            return (
              <View key={`${item.product.id}-${item.variant?.id}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, color: colors.text.secondary, flex: 1 }}>
                  {item.quantity}x {item.product.name}
                </Text>
                <Text style={{ fontSize: 14, color: colors.text.primary }}>{formatCurrency(price * item.quantity)}</Text>
              </View>
            );
          })}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>{t('cart.subtotal')}</Text>
              <Text style={{ fontSize: 14, color: colors.text.primary }}>{formatCurrency(subtotal())}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>{t('cart.deliveryFee')}</Text>
              <Text style={{ fontSize: 14, color: colors.text.primary }}>{formatCurrency(deliveryFee)}</Text>
            </View>
            {discount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, color: colors.success }}>{t('cart.discount')}</Text>
                <Text style={{ fontSize: 14, color: colors.success }}>-{formatCurrency(discount)}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>{t('cart.total')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary[500] }}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={{ padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button title={t('checkout.placeOrder')} onPress={handlePlaceOrder} loading={isPlacing} fullWidth size="lg" />
      </View>
    </View>
  );
}
