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
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Eye,
  X,
} from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { vendorApi } from '../../services/api';
import { colors, borderRadius } from '../../theme';
import { formatDate, t } from '../../utils';
import type { PolicyViolation, ViolationSeverity, ViolationStatus, ViolationSummary } from '../../types';

const STATUS_TABS: Array<{ key: 'all' | ViolationStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'appealed', label: 'Appealed' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_COLORS: Record<ViolationStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  acknowledged: { bg: '#DBEAFE', text: '#1E40AF' },
  appealed: { bg: '#E0E7FF', text: '#3730A3' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
};

const SEVERITY_COLORS: Record<ViolationSeverity, { bg: string; text: string; icon: string }> = {
  warning: { bg: '#FEF3C7', text: '#92400E', icon: '#D97706' },
  minor: { bg: '#DBEAFE', text: '#1E40AF', icon: '#3B82F6' },
  major: { bg: '#FED7AA', text: '#9A3412', icon: '#EA580C' },
  critical: { bg: '#FEE2E2', text: '#991B1B', icon: '#DC2626' },
};

export function ViolationsScreen() {
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [summary, setSummary] = useState<ViolationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'all' | ViolationStatus>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Appeal modal
  const [appealTarget, setAppealTarget] = useState<PolicyViolation | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchData = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const params: Record<string, string | number> = { page: pageNum, limit: 20 };
        if (activeStatus !== 'all') params.status = activeStatus;

        const [violationsRes, summaryRes] = await Promise.all([
          vendorApi.get('/vendors/policy/violations', { params }),
          append ? Promise.resolve(null) : vendorApi.get('/vendors/policy/summary').catch(() => ({ data: { data: null } })),
        ]);

        const items = violationsRes.data.data ?? [];
        const meta = violationsRes.data.meta;

        if (append) {
          setViolations((prev) => [...prev, ...items]);
        } else {
          setViolations(items);
        }
        setHasMore(meta?.page < meta?.totalPages);

        if (summaryRes) {
          setSummary(summaryRes.data.data);
        }
      } catch {
        if (!append) setViolations([]);
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
    fetchData(1);
  }, [activeStatus, fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchData(1);
  };

  const handleLoadMore = () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, true);
  };

  const handleAcknowledge = async (violation: PolicyViolation) => {
    try {
      await vendorApi.patch(`/vendors/policy/violations/${violation.id}/acknowledge`);
      handleRefresh();
    } catch {
      Alert.alert(t('vendorViolations.actionError'));
    }
  };

  const handleAppeal = async () => {
    if (!appealTarget || !appealReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for your appeal.');
      return;
    }
    setIsSending(true);
    try {
      await vendorApi.post(`/vendors/policy/violations/${appealTarget.id}/appeal`, {
        reason: appealReason.trim(),
      });
      Alert.alert(t('vendorViolations.appealSubmitted'), t('vendorViolations.appealSubmittedMessage'));
      setAppealTarget(null);
      setAppealReason('');
      handleRefresh();
    } catch {
      Alert.alert(t('vendorViolations.appealError'));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const renderViolation = ({ item }: { item: PolicyViolation }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
    const severityStyle = SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.warning;
    const canAcknowledge = item.status === 'pending';
    const canAppeal = item.status === 'pending' || item.status === 'acknowledged';

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: severityStyle.bg }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: severityStyle.text }}>
                {item.severity.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: statusStyle.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Rule Name */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 }}>
          {item.rule_name}
        </Text>

        {/* Description */}
        <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 6 }} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Penalty */}
        {item.penalty_description && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', padding: 8, borderRadius: 6, marginBottom: 8 }}>
            <AlertTriangle size={14} color={colors.error} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#991B1B', marginLeft: 6 }}>
              {item.penalty_description}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: colors.text.muted }}>{formatDate(item.created_at)}</Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canAcknowledge && (
              <TouchableOpacity
                onPress={() => handleAcknowledge(item)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
              >
                <CheckCircle size={12} color="#1E40AF" />
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#1E40AF', marginLeft: 4 }}>Acknowledge</Text>
              </TouchableOpacity>
            )}
            {canAppeal && (
              <TouchableOpacity
                onPress={() => { setAppealTarget(item); setAppealReason(''); }}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
              >
                <MessageSquare size={12} color="#3730A3" />
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#3730A3', marginLeft: 4 }}>Appeal</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Summary Bar */}
      {summary && (
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}>
          {[
            { label: 'Total', value: summary.total, color: colors.text.primary },
            { label: 'Pending', value: summary.pending, color: '#D97706' },
            { label: 'Ack.', value: summary.acknowledged, color: '#1E40AF' },
            { label: 'Appealed', value: summary.appealed, color: '#7C3AED' },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: colors.text.muted }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

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

      {/* Violations List */}
      <FlatList
        data={violations}
        keyExtractor={(item) => item.id}
        renderItem={renderViolation}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <ShieldAlert size={48} color={colors.text.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
              {t('vendorViolations.noViolations')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center' }}>
              {t('vendorViolations.noViolationsDesc')}
            </Text>
          </View>
        }
      />

      {/* Appeal Modal */}
      <Modal visible={!!appealTarget} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>
                  {t('vendorViolations.submitAppeal')}
                </Text>
                <TouchableOpacity onPress={() => setAppealTarget(null)}>
                  <X size={24} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              {appealTarget && (
                <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                    {appealTarget.rule_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }} numberOfLines={2}>
                    {appealTarget.description}
                  </Text>
                </View>
              )}

              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 6 }}>
                {t('vendorViolations.appealReason')} *
              </Text>
              <TextInput
                value={appealReason}
                onChangeText={setAppealReason}
                placeholder={t('vendorViolations.appealPlaceholder')}
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
                {appealReason.length}/2000
              </Text>

              <TouchableOpacity
                onPress={handleAppeal}
                disabled={isSending || !appealReason.trim()}
                style={{
                  backgroundColor: colors.primary[500],
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: isSending || !appealReason.trim() ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                  {isSending ? 'Submitting...' : t('vendorViolations.submitAppeal')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
