import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RotateCcw,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { orderApi } from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme';
import { formatCurrency, formatDate, t } from '../../utils';
import type { ReturnRequest, ReturnStatus } from '../../types';

const STATUS_TABS: Array<{ key: 'all' | ReturnStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'received', label: 'Received' },
  { key: 'denied', label: 'Denied' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'escalated', label: 'Escalated' },
];

const STATUS_COLORS: Record<ReturnStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  approved: { bg: '#DBEAFE', text: '#1E40AF' },
  denied: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#374151' },
  received: { bg: '#E0E7FF', text: '#3730A3' },
  refunded: { bg: '#D1FAE5', text: '#065F46' },
  escalated: { bg: '#FDE68A', text: '#92400E' },
};

const REASON_LABELS: Record<string, string> = {
  defective: 'Defective',
  wrong_item: 'Wrong Item',
  damaged: 'Damaged',
  not_as_described: 'Not as Described',
  missing_item: 'Missing Item',
  expired: 'Expired',
  change_of_mind: 'Change of Mind',
  other: 'Other',
};

export function ReturnsScreen() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'all' | ReturnStatus>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Action modal state
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'deny' | 'received' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchReturns = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const params: Record<string, string | number> = { page: pageNum, limit: 20 };
        if (activeStatus !== 'all') params.status = activeStatus;

        const { data } = await orderApi.get('/orders/vendor/returns', { params });
        const items = data.data ?? [];
        const meta = data.meta;

        if (append) {
          setReturns((prev) => [...prev, ...items]);
        } else {
          setReturns(items);
        }
        setHasMore(meta?.page < meta?.totalPages);
      } catch {
        if (!append) setReturns([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeStatus],
  );

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    fetchReturns(1);
  }, [activeStatus, fetchReturns]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchReturns(1);
  };

  const handleLoadMore = () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReturns(nextPage, true);
  };

  const openAction = (item: ReturnRequest, type: 'approve' | 'deny' | 'received') => {
    setSelectedReturn(item);
    setActionType(type);
    setResponseText('');
  };

  const handleAction = async () => {
    if (!selectedReturn || !actionType) return;
    if (actionType === 'deny' && !responseText.trim()) {
      Alert.alert('Required', 'Please provide a reason for denial.');
      return;
    }

    setIsSending(true);
    try {
      const body: Record<string, unknown> = {};
      if (responseText.trim()) body.vendor_response = responseText.trim();
      if (actionType === 'received') body.restockable = true;

      await orderApi.patch(`/orders/vendor/returns/${selectedReturn.id}/${actionType}`, body);

      Alert.alert(
        t('vendorReturns.actionSuccess'),
        t('vendorReturns.actionSuccessMessage'),
      );
      setSelectedReturn(null);
      setActionType(null);
      setResponseText('');
      handleRefresh();
    } catch {
      Alert.alert(t('vendorReturns.actionError'));
    } finally {
      setIsSending(false);
    }
  };

  const canApprove = (status: ReturnStatus) => status === 'pending';
  const canDeny = (status: ReturnStatus) => status === 'pending';
  const canMarkReceived = (status: ReturnStatus) => status === 'approved';

  const renderReturn = ({ item }: { item: ReturnRequest }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
    const itemCount = item.items?.length ?? 0;

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>
            {item.request_number}
          </Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: statusStyle.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
              {item.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Reason */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginLeft: 6 }}>
            {REASON_LABELS[item.reason_category] ?? item.reason_category}
          </Text>
        </View>

        {/* Items summary */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Package size={14} color={colors.text.muted} />
          <Text style={{ fontSize: 13, color: colors.text.secondary, marginLeft: 6 }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''} · Refund: {formatCurrency(item.refund_amount)}
          </Text>
        </View>

        {/* Resolution */}
        <Text style={{ fontSize: 12, color: colors.text.muted, marginBottom: 4 }}>
          Requested: {item.requested_resolution?.replace(/_/g, ' ')}
        </Text>

        {/* Reason details */}
        {item.reason_details && (
          <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 6 }} numberOfLines={2}>
            "{item.reason_details}"
          </Text>
        )}

        {/* Vendor response */}
        {item.vendor_response && (
          <View style={{ backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, marginBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#065F46', marginBottom: 2 }}>
              Your Response
            </Text>
            <Text style={{ fontSize: 12, color: '#065F46' }} numberOfLines={2}>
              {item.vendor_response}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ fontSize: 11, color: colors.text.muted }}>
            {formatDate(item.created_at)}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canApprove(item.status) && (
              <TouchableOpacity
                onPress={() => openAction(item, 'approve')}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
              >
                <CheckCircle size={14} color="#065F46" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46', marginLeft: 4 }}>Approve</Text>
              </TouchableOpacity>
            )}
            {canDeny(item.status) && (
              <TouchableOpacity
                onPress={() => openAction(item, 'deny')}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
              >
                <XCircle size={14} color="#991B1B" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#991B1B', marginLeft: 4 }}>Deny</Text>
              </TouchableOpacity>
            )}
            {canMarkReceived(item.status) && (
              <TouchableOpacity
                onPress={() => openAction(item, 'received')}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
              >
                <Package size={14} color="#3730A3" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#3730A3', marginLeft: 4 }}>Received</Text>
              </TouchableOpacity>
            )}
            {!canApprove(item.status) && !canDeny(item.status) && !canMarkReceived(item.status) && (
              <ChevronRight size={16} color={colors.text.muted} />
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 48, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center', gap: 6 }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveStatus(tab.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 16,
                backgroundColor: isActive ? colors.primary[500] : 'transparent',
                borderWidth: isActive ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: isActive ? '#FFFFFF' : colors.text.secondary }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Return List */}
      <FlatList
        data={returns}
        keyExtractor={(item) => item.id}
        renderItem={renderReturn}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <RotateCcw size={48} color={colors.text.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
              {t('vendorReturns.noReturns')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center' }}>
              {t('vendorReturns.noReturnsDesc')}
            </Text>
          </View>
        }
      />

      {/* Action Modal */}
      <Modal visible={!!selectedReturn && !!actionType} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' }}>
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>
                  {actionType === 'approve' && 'Approve Return'}
                  {actionType === 'deny' && 'Deny Return'}
                  {actionType === 'received' && 'Mark as Received'}
                </Text>
                <TouchableOpacity onPress={() => { setSelectedReturn(null); setActionType(null); }}>
                  <X size={24} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              {/* Return Info */}
              {selectedReturn && (
                <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                    {selectedReturn.request_number}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>
                    {REASON_LABELS[selectedReturn.reason_category]} · {formatCurrency(selectedReturn.refund_amount)}
                  </Text>
                </View>
              )}

              {/* Response Input */}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 6 }}>
                {actionType === 'deny' ? 'Reason for denial *' : 'Notes (optional)'}
              </Text>
              <TextInput
                value={responseText}
                onChangeText={setResponseText}
                placeholder={
                  actionType === 'deny'
                    ? 'Explain why this return is being denied...'
                    : 'Add any notes about this return...'
                }
                placeholderTextColor={colors.text.muted}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  height: 100,
                  textAlignVertical: 'top',
                  fontSize: 14,
                  color: colors.text.primary,
                  marginBottom: 16,
                }}
                maxLength={2000}
              />
              <Text style={{ fontSize: 11, color: colors.text.muted, textAlign: 'right', marginTop: -12, marginBottom: 16 }}>
                {responseText.length}/2000
              </Text>

              {/* Action Button */}
              <TouchableOpacity
                onPress={handleAction}
                disabled={isSending}
                style={{
                  backgroundColor:
                    actionType === 'deny' ? colors.error
                      : actionType === 'approve' ? colors.success
                        : colors.primary[500],
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: isSending ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                  {isSending ? 'Processing...' :
                    actionType === 'approve' ? 'Approve Return' :
                      actionType === 'deny' ? 'Deny Return' :
                        'Confirm Received'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
