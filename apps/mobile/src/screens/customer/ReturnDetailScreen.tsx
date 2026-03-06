import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import {
  Package, Calendar, FileText, Store, Tag, CheckCircle, XCircle,
} from 'lucide-react-native';
import { orderApi } from '../../services/api';
import { Card, Button, LoadingSpinner, EmptyState } from '../../components/shared';
import { colors } from '../../theme';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { ReturnRequest, ReturnStatus, ReturnReasonCategory, ReturnResolution, ReturnItemCondition } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type Route = RouteProp<CustomerStackParamList, 'ReturnDetail'>;

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

const RETURN_RESOLUTION_LABELS: Record<ReturnResolution, string> = {
  refund: 'Full Refund',
  replacement: 'Replacement',
  store_credit: 'Store Credit',
};

const RETURN_CONDITION_LABELS: Record<ReturnItemCondition, string> = {
  unopened: 'Unopened',
  opened: 'Opened',
  damaged: 'Damaged',
  defective: 'Defective',
  unknown: 'Unknown',
};

const CONDITION_COLORS: Record<ReturnItemCondition, { bg: string; text: string }> = {
  unopened: { bg: '#D1FAE5', text: '#065F46' },
  opened: { bg: '#DBEAFE', text: '#1E40AF' },
  damaged: { bg: '#FEE2E2', text: '#991B1B' },
  defective: { bg: '#FEE2E2', text: '#991B1B' },
  unknown: { bg: '#F3F4F6', text: '#6B7280' },
};

function InfoRow({ icon, label, value, onPress }: { icon: React.ReactNode; label: string; value: string; onPress?: () => void }) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.text.muted, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: onPress ? colors.primary[500] : colors.text.primary }}>
          {value}
        </Text>
      </View>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  return content;
}

export function ReturnDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { returnId } = route.params;

  const [returnReq, setReturnReq] = useState<ReturnRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadReturn = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const { data } = await orderApi.get(`/returns/${returnId}`);
      setReturnReq(data.data ?? data);
    } catch {
      setReturnReq(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [returnId]);

  useEffect(() => {
    loadReturn();
  }, [loadReturn]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Return Request?',
      'Are you sure you want to cancel this return request? This action cannot be undone.',
      [
        { text: 'Keep Return', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await orderApi.patch(`/returns/${returnId}/cancel`);
              loadReturn(false);
            } catch {
              Alert.alert('Error', 'Failed to cancel return request. Please try again.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading || !returnReq) {
    if (isLoading) return <LoadingSpinner fullScreen />;
    return (
      <EmptyState
        icon={<Package size={48} color={colors.text.muted} />}
        title="Return not found"
        description="The return request you're looking for doesn't exist."
      />
    );
  }

  const statusColor = RETURN_STATUS_COLORS[returnReq.status];
  const canCancel = returnReq.status === 'pending';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadReturn(false); }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <View style={{ backgroundColor: colors.surface, padding: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
              {returnReq.request_number}
            </Text>
            <View style={{ backgroundColor: statusColor.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor.text }}>
                {RETURN_STATUS_LABELS[returnReq.status]}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>
            Submitted {new Date(returnReq.created_at).toLocaleDateString('en-PH', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </View>

        {/* Return Details */}
        <View style={{ paddingHorizontal: 16 }}>
          <Card style={{ padding: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
              Return Details
            </Text>
            <InfoRow
              icon={<Tag size={16} color={colors.text.muted} />}
              label="Reason"
              value={RETURN_REASON_LABELS[returnReq.reason_category]}
            />
            <InfoRow
              icon={<CheckCircle size={16} color={colors.text.muted} />}
              label="Resolution Requested"
              value={RETURN_RESOLUTION_LABELS[returnReq.requested_resolution]}
            />
            <InfoRow
              icon={<FileText size={16} color={colors.text.muted} />}
              label="Refund Amount"
              value={`\u20B1${returnReq.refund_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
            />
            <InfoRow
              icon={<Calendar size={16} color={colors.text.muted} />}
              label="Submitted"
              value={new Date(returnReq.created_at).toLocaleString('en-PH', {
                month: 'long', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            />
            <InfoRow
              icon={<Store size={16} color={colors.text.muted} />}
              label="Order ID"
              value={returnReq.order_id.slice(0, 8) + '...'}
              onPress={() => navigation.navigate('OrderDetail', { orderId: returnReq.order_id })}
            />
          </Card>

          {/* Reason Details */}
          {returnReq.reason_details && (
            <Card style={{ padding: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
                Additional Details
              </Text>
              <Text style={{ fontSize: 14, color: colors.text.secondary, lineHeight: 20 }}>
                {returnReq.reason_details}
              </Text>
            </Card>
          )}

          {/* Evidence Photos */}
          {returnReq.evidence_urls.length > 0 && (
            <Card style={{ padding: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
                Evidence Photos
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {returnReq.evidence_urls.map((url, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={{ width: 120, height: 90, borderRadius: 8, backgroundColor: colors.background }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </Card>
          )}

          {/* Return Items */}
          <Card style={{ padding: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
              Items ({returnReq.items.length})
            </Text>
            {returnReq.items.map((item, index) => {
              const condColor = CONDITION_COLORS[item.condition];
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.text.muted }}>
                        Qty: {item.quantity}
                      </Text>
                      <View style={{ backgroundColor: condColor.bg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: condColor.text }}>
                          {RETURN_CONDITION_LABELS[item.condition]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                      {'\u20B1'}{item.refund_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text.muted }}>
                      {'\u20B1'}{item.unit_price.toFixed(2)} x {item.quantity}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>

          {/* Vendor Response */}
          {returnReq.vendor_response && (
            <Card style={{ padding: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
                Vendor Response
              </Text>
              <Text style={{ fontSize: 14, color: colors.text.secondary, lineHeight: 20 }}>
                {returnReq.vendor_response}
              </Text>
              {returnReq.vendor_responded_at && (
                <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 8 }}>
                  Responded on {new Date(returnReq.vendor_responded_at).toLocaleString('en-PH', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </Text>
              )}
            </Card>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <Button
              title={isCancelling ? 'Cancelling...' : 'Cancel Return Request'}
              variant="danger"
              onPress={handleCancel}
              disabled={isCancelling}
              icon={<XCircle size={18} color="#FFFFFF" />}
              fullWidth
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
