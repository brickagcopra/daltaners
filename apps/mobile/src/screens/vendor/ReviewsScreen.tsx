import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
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
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react-native';
import { catalogApi } from '../../services/api';
import { Card, LoadingSpinner, EmptyState, Button, Avatar, StarRating } from '../../components/shared';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { formatDate, t } from '../../utils';
import type { VendorReview } from '../../types';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  store: { bg: '#EFF6FF', text: '#1D4ED8' },
  product: { bg: '#F5F3FF', text: '#6D28D9' },
  delivery_personnel: { bg: '#ECFDF5', text: '#059669' },
};

export function ReviewsScreen() {
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Response modal
  const [respondingTo, setRespondingTo] = useState<VendorReview | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchReviews = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await catalogApi.get('/catalog/reviews/vendor/my-reviews', {
        params: { page: pageNum, limit: 20 },
      });
      const data = res.data.data ?? [];
      if (append) {
        setReviews((prev) => [...prev, ...data]);
      } else {
        setReviews(data);
      }
      setHasMore(data.length >= 20);
    } catch {
      if (!append) setReviews([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchReviews(1).finally(() => setIsLoading(false));
  }, [fetchReviews]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchReviews(1);
    setIsRefreshing(false);
  };

  const loadMore = () => {
    if (!hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchReviews(next, true);
  };

  const handleRespond = async () => {
    if (!respondingTo || !responseText.trim()) return;
    setIsSending(true);
    try {
      await catalogApi.post(`/catalog/reviews/${respondingTo.id}/response`, {
        response: responseText.trim(),
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === respondingTo.id
            ? { ...r, vendor_response: responseText.trim(), vendor_response_at: new Date().toISOString() }
            : r,
        ),
      );
      setRespondingTo(null);
      setResponseText('');
      Alert.alert(t('vendorReviews.responseSent'), t('vendorReviews.responseSentMessage'));
    } catch {
      Alert.alert(t('common.error'), t('vendorReviews.responseError'));
    } finally {
      setIsSending(false);
    }
  };

  const renderReview = ({ item }: { item: VendorReview }) => {
    const typeConfig = TYPE_COLORS[item.reviewable_type] ?? TYPE_COLORS.store;
    const hasResponse = !!item.vendor_response;
    return (
      <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Avatar
            source={item.user_avatar ? { uri: item.user_avatar } : undefined}
            initials={item.user_name?.charAt(0) ?? '?'}
            size={36}
          />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
              {item.user_name}
            </Text>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={{ backgroundColor: typeConfig.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: typeConfig.text, textTransform: 'capitalize' }}>
              {item.reviewable_type.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        {/* Stars */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
          <StarRating rating={item.rating} size={16} />
          {item.is_verified_purchase && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <CheckCircle size={12} color="#059669" />
              <Text style={{ fontSize: 10, color: '#059669' }}>{t('vendorReviews.verified')}</Text>
            </View>
          )}
        </View>

        {/* Review Content */}
        {item.title && (
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 2 }}>
            {item.title}
          </Text>
        )}
        {item.body && (
          <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 8 }} numberOfLines={3}>
            {item.body}
          </Text>
        )}

        {/* Vendor Response */}
        {hasResponse ? (
          <View style={{ backgroundColor: colors.primary[50], padding: spacing.sm, borderRadius: borderRadius.md, marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary[600], marginBottom: 2 }}>
              {t('vendorReviews.yourResponse')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary }} numberOfLines={3}>
              {item.vendor_response}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => { setRespondingTo(item); setResponseText(''); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4,
              gap: 4,
            }}
          >
            <MessageSquare size={14} color={colors.primary[500]} />
            <Text style={{ fontSize: 13, color: colors.primary[500], fontWeight: '500' }}>
              {t('vendorReviews.respond')}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState
            icon="star"
            title={t('vendorReviews.noReviews')}
            description={t('vendorReviews.noReviewsDesc')}
          />
        }
      />

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
              <Text style={{ ...typography.h2 }}>{t('vendorReviews.respondToReview')}</Text>
              <TouchableOpacity onPress={() => setRespondingTo(null)}>
                <X size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Review Preview */}
            {respondingTo && (
              <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                    {respondingTo.user_name}
                  </Text>
                  <StarRating rating={respondingTo.rating} size={14} />
                </View>
                {respondingTo.title && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary, marginBottom: 2 }}>
                    {respondingTo.title}
                  </Text>
                )}
                {respondingTo.body && (
                  <Text style={{ fontSize: 12, color: colors.text.secondary }} numberOfLines={3}>
                    {respondingTo.body}
                  </Text>
                )}
              </View>
            )}

            {/* Response Input */}
            <TextInput
              value={responseText}
              onChangeText={setResponseText}
              placeholder={t('vendorReviews.responsePlaceholder')}
              multiline
              numberOfLines={4}
              maxLength={2000}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                fontSize: 14,
                color: colors.text.primary,
                textAlignVertical: 'top',
                minHeight: 100,
              }}
              placeholderTextColor={colors.text.muted}
            />
            <Text style={{ fontSize: 11, color: colors.text.muted, textAlign: 'right', marginTop: 4 }}>
              {responseText.length}/2000
            </Text>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <Button title={t('common.cancel')} variant="outline" onPress={() => setRespondingTo(null)} style={{ flex: 1 }} />
              <Button
                title={t('vendorReviews.sendResponse')}
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
