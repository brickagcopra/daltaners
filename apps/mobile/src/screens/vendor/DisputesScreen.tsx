import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  MessageCircle,
  X,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import { orderApi } from '../../services/api';
import { Card, LoadingSpinner, EmptyState, Button, Badge } from '../../components/shared';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { formatDate, t } from '../../utils';
import type { VendorDispute, VendorDisputeStatus, VendorDisputePriority } from '../../types';

const STATUS_TABS: Array<{ key: VendorDisputeStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'customer_reply', label: 'Customer Reply' },
  { key: 'vendor_response', label: 'Responded' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_COLORS: Record<VendorDisputeStatus, { bg: string; text: string }> = {
  open: { bg: '#DBEAFE', text: '#1D4ED8' },
  vendor_response: { bg: '#FEF3C7', text: '#D97706' },
  customer_reply: { bg: '#FFEDD5', text: '#C2410C' },
  under_review: { bg: '#EDE9FE', text: '#7C3AED' },
  escalated: { bg: '#FEE2E2', text: '#DC2626' },
  resolved: { bg: '#D1FAE5', text: '#059669' },
  closed: { bg: '#F3F4F6', text: '#6B7280' },
};

const PRIORITY_COLORS: Record<VendorDisputePriority, { bg: string; text: string }> = {
  low: { bg: '#F3F4F6', text: '#6B7280' },
  medium: { bg: '#DBEAFE', text: '#2563EB' },
  high: { bg: '#FFEDD5', text: '#C2410C' },
  urgent: { bg: '#FEE2E2', text: '#DC2626' },
};

const RESPONDABLE_STATUSES: VendorDisputeStatus[] = ['open', 'customer_reply', 'escalated'];

export function DisputesScreen() {
  const [disputes, setDisputes] = useState<VendorDispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState<VendorDisputeStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Response modal
  const [respondingTo, setRespondingTo] = useState<VendorDispute | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchDisputes = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const params: Record<string, string | number> = { page: pageNum, limit: 20 };
        if (activeStatus !== 'all') params.status = activeStatus;

        const res = await orderApi.get('/orders/vendor/disputes', { params });
        const data = res.data.data ?? [];
        if (append) {
          setDisputes((prev) => [...prev, ...data]);
        } else {
          setDisputes(data);
        }
        setHasMore(data.length >= 20);
      } catch {
        if (!append) setDisputes([]);
      }
    },
    [activeStatus],
  );

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    fetchDisputes(1).finally(() => setIsLoading(false));
  }, [fetchDisputes]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchDisputes(1);
    setIsRefreshing(false);
  };

  const loadMore = () => {
    if (!hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchDisputes(next, true);
  };

  const handleRespond = async () => {
    if (!respondingTo || !responseText.trim()) return;
    setIsSending(true);
    try {
      await orderApi.post(`/orders/vendor/disputes/${respondingTo.id}/respond`, {
        message: responseText.trim(),
      });
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === respondingTo.id ? { ...d, status: 'vendor_response' as VendorDisputeStatus } : d,
        ),
      );
      setRespondingTo(null);
      setResponseText('');
      Alert.alert(t('vendorDisputes.responseSent'), t('vendorDisputes.responseSentMessage'));
    } catch {
      Alert.alert(t('common.error'), t('vendorDisputes.responseError'));
    } finally {
      setIsSending(false);
    }
  };

  const renderDispute = ({ item }: { item: VendorDispute }) => {
    const statusConfig = STATUS_COLORS[item.status] ?? STATUS_COLORS.open;
    const priorityConfig = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.low;
    const canRespond = RESPONDABLE_STATUSES.includes(item.status);
    const isUrgent = item.vendor_response_deadline && new Date(item.vendor_response_deadline) < new Date(Date.now() + 24 * 60 * 60 * 1000);

    return (
      <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, flex: 1 }}>
            #{item.dispute_number}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ backgroundColor: priorityConfig.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: priorityConfig.text, textTransform: 'uppercase' }}>
                {item.priority}
              </Text>
            </View>
            <View style={{ backgroundColor: statusConfig.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: statusConfig.text, textTransform: 'capitalize' }}>
                {item.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Subject & Category */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 2 }} numberOfLines={2}>
          {item.subject}
        </Text>
        <Text style={{ fontSize: 12, color: colors.text.muted, textTransform: 'capitalize', marginBottom: 6 }}>
          {item.category.replace(/_/g, ' ')}
        </Text>

        {/* Deadline warning */}
        {isUrgent && canRespond && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FEF2F2',
              padding: 8,
              borderRadius: borderRadius.md,
              marginBottom: 8,
              gap: 6,
            }}
          >
            <Clock size={14} color="#DC2626" />
            <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '500' }}>
              {t('vendorDisputes.deadlineSoon')}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, color: colors.text.muted }}>{formatDate(item.created_at)}</Text>
          {canRespond && (
            <TouchableOpacity
              onPress={() => { setRespondingTo(item); setResponseText(''); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary[50],
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: borderRadius.md,
                gap: 4,
              }}
            >
              <MessageCircle size={14} color={colors.primary[500]} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary[500] }}>
                {t('vendorDisputes.respond')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 }}
        style={{ flexGrow: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        {STATUS_TABS.map((tab) => {
          const active = activeStatus === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveStatus(tab.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: active ? colors.primary[500] : colors.background,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: active ? '600' : '400',
                  color: active ? '#FFF' : colors.text.secondary,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          renderItem={renderDispute}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="shield"
              title={t('vendorDisputes.noDisputes')}
              description={t('vendorDisputes.noDisputesDesc')}
            />
          }
        />
      )}

      {/* Response Modal */}
      <Modal visible={!!respondingTo} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: spacing.lg,
              maxHeight: '80%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ ...typography.h2 }}>{t('vendorDisputes.respondToDispute')}</Text>
              <TouchableOpacity onPress={() => setRespondingTo(null)}>
                <X size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Dispute Preview */}
            {respondingTo && (
              <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>
                  #{respondingTo.dispute_number}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 2 }}>
                  {respondingTo.subject}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.muted, textTransform: 'capitalize' }}>
                  {respondingTo.category.replace(/_/g, ' ')}
                </Text>
              </View>
            )}

            {/* Response Input */}
            <TextInput
              value={responseText}
              onChangeText={setResponseText}
              placeholder={t('vendorDisputes.responsePlaceholder')}
              multiline
              numberOfLines={5}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                fontSize: 14,
                color: colors.text.primary,
                textAlignVertical: 'top',
                minHeight: 120,
              }}
              placeholderTextColor={colors.text.muted}
            />

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Button title={t('common.cancel')} variant="outline" onPress={() => setRespondingTo(null)} style={{ flex: 1 }} />
              <Button
                title={t('vendorDisputes.sendResponse')}
                onPress={handleRespond}
                loading={isSending}
                disabled={!responseText.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
