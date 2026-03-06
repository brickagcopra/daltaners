import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import {
  CheckSquare, Square, ChevronDown, Send,
} from 'lucide-react-native';
import { orderApi } from '../../services/api';
import { Card, Button, LoadingSpinner, EmptyState } from '../../components/shared';
import { colors } from '../../theme';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type {
  Order, OrderItem,
  ReturnReasonCategory, ReturnResolution, ReturnItemCondition,
} from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'CreateReturn'>;

interface SelectedItem {
  order_item_id: string;
  product_name: string;
  quantity: number;
  max_quantity: number;
  unit_price: number;
  condition: ReturnItemCondition;
}

const REASON_OPTIONS: { value: ReturnReasonCategory; label: string }[] = [
  { value: 'damaged', label: 'Item arrived damaged' },
  { value: 'defective', label: 'Product is defective' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'missing_item', label: 'Missing item from order' },
  { value: 'expired', label: 'Product expired' },
  { value: 'change_of_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other reason' },
];

const RESOLUTION_OPTIONS: { value: ReturnResolution; label: string }[] = [
  { value: 'refund', label: 'Full Refund' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'store_credit', label: 'Store Credit' },
];

const CONDITION_OPTIONS: { value: ReturnItemCondition; label: string }[] = [
  { value: 'unopened', label: 'Unopened' },
  { value: 'opened', label: 'Opened' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'unknown', label: 'Unknown' },
];

export function CreateReturnScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [reasonCategory, setReasonCategory] = useState<ReturnReasonCategory>('damaged');
  const [reasonDetails, setReasonDetails] = useState('');
  const [requestedResolution, setRequestedResolution] = useState<ReturnResolution>('refund');
  const [showReasonPicker, setShowReasonPicker] = useState(false);

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

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!order) {
    return (
      <EmptyState
        icon={<Square size={48} color={colors.text.muted} />}
        title="Order not found"
        description="The order you're trying to create a return for doesn't exist."
      />
    );
  }

  if (order.status !== 'delivered') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }} edges={['bottom']}>
        <EmptyState
          icon={<Square size={48} color={colors.text.muted} />}
          title="Cannot create return"
          description="Returns can only be created for delivered orders."
        />
      </SafeAreaView>
    );
  }

  const orderItems: OrderItem[] = order.items ?? [];

  const toggleItem = (item: OrderItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((s) => s.order_item_id === item.id);
      if (exists) {
        return prev.filter((s) => s.order_item_id !== item.id);
      }
      return [
        ...prev,
        {
          order_item_id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          max_quantity: item.quantity,
          unit_price: item.unit_price,
          condition: 'unknown' as ReturnItemCondition,
        },
      ];
    });
  };

  const updateItemQuantity = (itemId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((s) =>
        s.order_item_id === itemId
          ? { ...s, quantity: Math.max(1, Math.min(s.max_quantity, qty)) }
          : s,
      ),
    );
  };

  const updateItemCondition = (itemId: string, condition: ReturnItemCondition) => {
    setSelectedItems((prev) =>
      prev.map((s) => (s.order_item_id === itemId ? { ...s, condition } : s)),
    );
  };

  const totalRefund = selectedItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to return.');
      return;
    }
    if (!reasonDetails.trim() && reasonCategory !== 'change_of_mind') {
      Alert.alert('Error', 'Please provide details about your return reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await orderApi.post('/returns', {
        order_id: orderId,
        reason_category: reasonCategory,
        reason_details: reasonDetails || undefined,
        requested_resolution: requestedResolution,
        items: selectedItems.map((s) => ({
          order_item_id: s.order_item_id,
          quantity: s.quantity,
          condition: s.condition,
        })),
      });
      const result = data.data ?? data;
      Alert.alert('Success', 'Your return request has been submitted.', [
        {
          text: 'View Return',
          onPress: () => navigation.replace('ReturnDetail', {
            returnId: result.id,
            requestNumber: result.request_number,
          }),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit return request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* Order Context */}
          <Card style={{ padding: 14, marginBottom: 16, backgroundColor: colors.primary[50] }}>
            <Text style={{ fontSize: 13, color: colors.primary[700], fontWeight: '600' }}>
              Order #{order.order_number}
            </Text>
            {order.store_name && (
              <Text style={{ fontSize: 12, color: colors.primary[600], marginTop: 2 }}>
                {order.store_name}
              </Text>
            )}
          </Card>

          {/* Step 1: Select Items */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
            1. Select Items to Return
          </Text>
          <Card style={{ padding: 0, marginBottom: 20 }}>
            {orderItems.map((item, index) => {
              const selected = selectedItems.find((s) => s.order_item_id === item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleItem(item)}
                  style={{
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                    backgroundColor: selected ? `${colors.primary[500]}08` : 'transparent',
                  }}
                >
                  {selected ? (
                    <CheckSquare size={20} color={colors.primary[500]} style={{ marginTop: 2 }} />
                  ) : (
                    <Square size={20} color={colors.text.muted} style={{ marginTop: 2 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                      {'\u20B1'}{item.unit_price.toFixed(2)} x {item.quantity}
                    </Text>

                    {selected && (
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                        {/* Quantity Selector */}
                        <View>
                          <Text style={{ fontSize: 11, color: colors.text.muted, marginBottom: 4 }}>
                            Qty to return
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden' }}>
                            <TouchableOpacity
                              onPress={() => updateItemQuantity(item.id, selected.quantity - 1)}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.background }}
                            >
                              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>-</Text>
                            </TouchableOpacity>
                            <Text style={{ paddingHorizontal: 12, fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                              {selected.quantity}
                            </Text>
                            <TouchableOpacity
                              onPress={() => updateItemQuantity(item.id, selected.quantity + 1)}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.background }}
                            >
                              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Condition Selector */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.text.muted, marginBottom: 4 }}>
                            Condition
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            {CONDITION_OPTIONS.map((opt) => (
                              <TouchableOpacity
                                key={opt.value}
                                onPress={() => updateItemCondition(item.id, opt.value)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 14,
                                  borderWidth: 1,
                                  borderColor: selected.condition === opt.value ? colors.primary[500] : colors.border,
                                  backgroundColor: selected.condition === opt.value ? `${colors.primary[500]}10` : 'transparent',
                                }}
                              >
                                <Text style={{
                                  fontSize: 11,
                                  fontWeight: '500',
                                  color: selected.condition === opt.value ? colors.primary[500] : colors.text.secondary,
                                }}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>

          {/* Step 2: Reason */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
            2. Reason for Return
          </Text>
          <Card style={{ padding: 16, marginBottom: 20 }}>
            {/* Category Picker */}
            <Text style={{ fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>Category</Text>
            <TouchableOpacity
              onPress={() => setShowReasonPicker(!showReasonPicker)}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: showReasonPicker ? 0 : 16,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.text.primary }}>
                {REASON_OPTIONS.find((o) => o.value === reasonCategory)?.label}
              </Text>
              <ChevronDown size={16} color={colors.text.muted} />
            </TouchableOpacity>

            {showReasonPicker && (
              <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginBottom: 16 }}>
                {REASON_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setReasonCategory(opt.value);
                      setShowReasonPicker(false);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: reasonCategory === opt.value ? `${colors.primary[500]}08` : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      color: reasonCategory === opt.value ? colors.primary[500] : colors.text.primary,
                      fontWeight: reasonCategory === opt.value ? '600' : '400',
                    }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Details */}
            <Text style={{ fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>
              Details {reasonCategory !== 'change_of_mind' && (
                <Text style={{ color: colors.error }}>*</Text>
              )}
            </Text>
            <TextInput
              value={reasonDetails}
              onChangeText={setReasonDetails}
              placeholder="Please describe the issue in detail..."
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={3}
              maxLength={2000}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: colors.text.primary,
                textAlignVertical: 'top',
                minHeight: 80,
              }}
            />
            <Text style={{ fontSize: 11, color: colors.text.muted, marginTop: 4, textAlign: 'right' }}>
              {reasonDetails.length}/2000
            </Text>
          </Card>

          {/* Step 3: Preferred Resolution */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
            3. Preferred Resolution
          </Text>
          <Card style={{ padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {RESOLUTION_OPTIONS.map((opt) => {
                const isActive = requestedResolution === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setRequestedResolution(opt.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary[500] : colors.border,
                      backgroundColor: isActive ? `${colors.primary[500]}10` : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: isActive ? colors.primary[500] : colors.text.secondary,
                    }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Summary */}
          <Card style={{ padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>Items selected</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                {selectedItems.length}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>Estimated refund</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary[500] }}>
                {'\u20B1'}{totalRefund.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <Button
              title={isSubmitting ? 'Submitting...' : 'Submit Return Request'}
              onPress={handleSubmit}
              disabled={isSubmitting || selectedItems.length === 0}
              icon={<Send size={16} color="#FFFFFF" />}
              fullWidth
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
