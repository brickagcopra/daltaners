import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle, CheckCircle, ChevronDown, Package,
} from 'lucide-react-native';
import { Card, Button, LoadingSpinner } from '../../components/shared';
import { orderApi } from '../../services/api';
import { colors } from '../../theme';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { DisputeCategory, DisputeResolution, Order } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'CreateDispute'>;

interface CategoryOption {
  key: DisputeCategory;
  label: string;
  description: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'order_not_received', label: 'Order Not Received', description: 'Order was not delivered' },
  { key: 'item_missing', label: 'Item Missing', description: 'Some items were missing from the order' },
  { key: 'wrong_item', label: 'Wrong Item', description: 'Received wrong item(s)' },
  { key: 'damaged_item', label: 'Damaged Item', description: 'Item(s) arrived damaged' },
  { key: 'quality_issue', label: 'Quality Issue', description: 'Product quality is unacceptable' },
  { key: 'overcharged', label: 'Overcharged', description: 'Charged more than expected' },
  { key: 'late_delivery', label: 'Late Delivery', description: 'Delivery was significantly late' },
  { key: 'vendor_behavior', label: 'Vendor Behavior', description: 'Issue with the vendor/store' },
  { key: 'delivery_behavior', label: 'Delivery Behavior', description: 'Issue with the delivery person' },
  { key: 'unauthorized_charge', label: 'Unauthorized Charge', description: 'Was charged without consent' },
  { key: 'other', label: 'Other', description: 'Something else' },
];

interface ResolutionOption {
  key: DisputeResolution;
  label: string;
}

const RESOLUTIONS: ResolutionOption[] = [
  { key: 'refund', label: 'Full Refund' },
  { key: 'partial_refund', label: 'Partial Refund' },
  { key: 'replacement', label: 'Replacement' },
  { key: 'store_credit', label: 'Store Credit' },
  { key: 'apology', label: 'Apology' },
  { key: 'other', label: 'Other' },
];

export function CreateDisputeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId, orderNumber } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const [showResolutions, setShowResolutions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data } = await orderApi.get(`/orders/${orderId}`);
      setOrder(data.data ?? data);
    } catch {
      // Order info is nice-to-have, not critical
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const canSubmit = category && subject.trim().length >= 5 && description.trim().length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await orderApi.post('/disputes', {
        order_id: orderId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        requested_resolution: resolution,
      });
      Alert.alert(
        'Dispute Submitted',
        'Your dispute has been submitted. We will review it and get back to you shortly.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? 'Failed to submit dispute.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = CATEGORIES.find((c) => c.key === category);
  const selectedResolution = RESOLUTIONS.find((r) => r.key === resolution);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* Order Context */}
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Package size={20} color={colors.primary[500]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Order</Text>
                <Text style={styles.orderRef}>
                  #{orderNumber ?? order?.order_number ?? orderId.substring(0, 8)}
                </Text>
              </View>
              {order?.store_name && (
                <Text style={{ fontSize: 13, color: colors.text.muted }}>{order.store_name}</Text>
              )}
            </View>
          </Card>

          {/* Category Picker */}
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>Category *</Text>
            <TouchableOpacity
              onPress={() => setShowCategories(!showCategories)}
              style={styles.picker}
            >
              <Text style={selectedCategory ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedCategory?.label ?? 'Select a category'}
              </Text>
              <ChevronDown size={18} color={colors.text.muted} />
            </TouchableOpacity>

            {showCategories && (
              <View style={styles.optionsList}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => {
                      setCategory(cat.key);
                      setShowCategories(false);
                      if (!subject) setSubject(cat.label);
                    }}
                    style={[
                      styles.optionItem,
                      category === cat.key && styles.optionItemSelected,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.optionLabel,
                        category === cat.key && { color: colors.primary[500] },
                      ]}>
                        {cat.label}
                      </Text>
                      <Text style={styles.optionDescription}>{cat.description}</Text>
                    </View>
                    {category === cat.key && <CheckCircle size={18} color={colors.primary[500]} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {/* Subject */}
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>Subject *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Brief summary of the issue"
              placeholderTextColor={colors.text.muted}
              value={subject}
              onChangeText={setSubject}
              maxLength={255}
            />
            <Text style={styles.charCount}>{subject.length}/255</Text>
          </Card>

          {/* Description */}
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Please describe the issue in detail (min 20 characters)..."
              placeholderTextColor={colors.text.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <Text style={styles.charCount}>{description.length}/5000</Text>
          </Card>

          {/* Resolution Preference */}
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>Preferred Resolution</Text>
            <TouchableOpacity
              onPress={() => setShowResolutions(!showResolutions)}
              style={styles.picker}
            >
              <Text style={selectedResolution ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedResolution?.label ?? 'Select preferred resolution (optional)'}
              </Text>
              <ChevronDown size={18} color={colors.text.muted} />
            </TouchableOpacity>

            {showResolutions && (
              <View style={styles.optionsList}>
                {RESOLUTIONS.map((res) => (
                  <TouchableOpacity
                    key={res.key}
                    onPress={() => {
                      setResolution(res.key);
                      setShowResolutions(false);
                    }}
                    style={[
                      styles.optionItem,
                      resolution === res.key && styles.optionItemSelected,
                    ]}
                  >
                    <Text style={[
                      styles.optionLabel,
                      resolution === res.key && { color: colors.primary[500] },
                    ]}>
                      {res.label}
                    </Text>
                    {resolution === res.key && <CheckCircle size={18} color={colors.primary[500]} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {/* Validation Hints */}
          <View style={styles.hints}>
            <HintRow met={!!category} text="Select a category" />
            <HintRow met={subject.trim().length >= 5} text="Subject (at least 5 characters)" />
            <HintRow met={description.trim().length >= 20} text="Description (at least 20 characters)" />
          </View>

          {/* Submit */}
          <Button
            title="Submit Dispute"
            icon={<AlertTriangle size={18} color="#FFFFFF" />}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HintRow({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <CheckCircle size={14} color={met ? colors.success : colors.text.muted} />
      <Text style={{ fontSize: 12, color: met ? colors.success : colors.text.muted }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: colors.text.muted,
  },
  orderRef: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerPlaceholder: {
    fontSize: 14,
    color: colors.text.muted,
  },
  pickerValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  optionsList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: colors.primary[50],
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 11,
    color: colors.text.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  hints: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
});
