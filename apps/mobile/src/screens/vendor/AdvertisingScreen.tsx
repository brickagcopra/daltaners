import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Megaphone,
  Eye,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  Pause,
  Play,
  XCircle,
  Send,
} from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { vendorApi } from '../../services/api';
import { colors, borderRadius } from '../../theme';
import { formatCurrency, formatDate, t } from '../../utils';
import type { VendorCampaign, VendorCampaignStats, CampaignStatus } from '../../types';

// advertising-service at port 3019
const advertisingApi = vendorApi; // Uses same auth — will route via gateway in prod

const STATUS_COLORS: Record<CampaignStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#374151' },
  pending_review: { bg: '#FEF3C7', text: '#92400E' },
  active: { bg: '#D1FAE5', text: '#065F46' },
  paused: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#E0E7FF', text: '#3730A3' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  suspended: { bg: '#FED7AA', text: '#9A3412' },
};

const TYPE_LABELS: Record<string, string> = {
  sponsored_product: 'Sponsored Product',
  banner: 'Banner Ad',
  featured_store: 'Featured Store',
};

export function AdvertisingScreen() {
  const [campaigns, setCampaigns] = useState<VendorCampaign[]>([]);
  const [stats, setStats] = useState<VendorCampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [campaignsRes, statsRes] = await Promise.all([
        advertisingApi.get('/advertising/campaigns', { params: { page: 1, limit: 20 } }).catch(() => ({ data: { data: [], meta: {} } })),
        advertisingApi.get('/advertising/campaigns/stats').catch(() => ({ data: { data: null } })),
      ]);
      setCampaigns(campaignsRes.data.data ?? []);
      setStats(statsRes.data.data);
      setHasMore((campaignsRes.data.meta?.page ?? 1) < (campaignsRes.data.meta?.totalPages ?? 1));
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchData();
  };

  const handleLoadMore = async () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    try {
      const { data } = await advertisingApi.get('/advertising/campaigns', { params: { page: nextPage, limit: 20 } });
      setCampaigns((prev) => [...prev, ...(data.data ?? [])]);
      setHasMore((data.meta?.page ?? 1) < (data.meta?.totalPages ?? 1));
    } catch {
      // silent
    }
  };

  const handleAction = async (campaign: VendorCampaign, action: 'pause' | 'resume' | 'cancel' | 'submit') => {
    try {
      await advertisingApi.patch(`/advertising/campaigns/${campaign.id}/${action}`);
      handleRefresh();
    } catch {
      // silent
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const formatCtr = (impressions: number, clicks: number) => {
    if (impressions === 0) return '0%';
    return ((clicks / impressions) * 100).toFixed(1) + '%';
  };

  const renderCampaign = ({ item }: { item: VendorCampaign }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    const ctr = formatCtr(item.impressions, item.clicks);
    const budgetUsedPct = item.budget > 0 ? Math.min(100, (item.spent / item.budget) * 100) : 0;

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
              {TYPE_LABELS[item.type] ?? item.type}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: statusStyle.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
              {item.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{item.impressions.toLocaleString()}</Text>
            <Text style={{ fontSize: 10, color: colors.text.muted }}>Impressions</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{item.clicks.toLocaleString()}</Text>
            <Text style={{ fontSize: 10, color: colors.text.muted }}>Clicks</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary[600] }}>{ctr}</Text>
            <Text style={{ fontSize: 10, color: colors.text.muted }}>CTR</Text>
          </View>
        </View>

        {/* Budget Bar */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>
              Spent: {formatCurrency(item.spent)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.text.muted }}>
              Budget: {formatCurrency(item.budget)}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
            <View style={{ width: `${budgetUsedPct}%`, height: '100%', backgroundColor: budgetUsedPct > 90 ? colors.error : colors.primary[500], borderRadius: 3 }} />
          </View>
        </View>

        {/* Date Range */}
        <Text style={{ fontSize: 11, color: colors.text.muted, marginBottom: 8 }}>
          {formatDate(item.valid_from)} - {formatDate(item.valid_until)}
        </Text>

        {/* Actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          {item.status === 'draft' && (
            <TouchableOpacity
              onPress={() => handleAction(item, 'submit')}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
            >
              <Send size={12} color="#065F46" />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#065F46', marginLeft: 4 }}>Submit</Text>
            </TouchableOpacity>
          )}
          {item.status === 'active' && (
            <TouchableOpacity
              onPress={() => handleAction(item, 'pause')}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
            >
              <Pause size={12} color="#1E40AF" />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#1E40AF', marginLeft: 4 }}>Pause</Text>
            </TouchableOpacity>
          )}
          {item.status === 'paused' && (
            <TouchableOpacity
              onPress={() => handleAction(item, 'resume')}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
            >
              <Play size={12} color="#065F46" />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#065F46', marginLeft: 4 }}>Resume</Text>
            </TouchableOpacity>
          )}
          {['draft', 'active', 'paused'].includes(item.status) && (
            <TouchableOpacity
              onPress={() => handleAction(item, 'cancel')}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
            >
              <XCircle size={12} color="#991B1B" />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#991B1B', marginLeft: 4 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Stats Overview */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 80, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
          {[
            { label: 'Active', value: stats.active_campaigns.toString(), icon: <Megaphone size={14} color={colors.primary[500]} /> },
            { label: 'Impressions', value: stats.total_impressions.toLocaleString(), icon: <Eye size={14} color="#7C3AED" /> },
            { label: 'Clicks', value: stats.total_clicks.toLocaleString(), icon: <MousePointerClick size={14} color="#0284C7" /> },
            { label: 'Spend', value: formatCurrency(stats.total_spend), icon: <DollarSign size={14} color={colors.warning} /> },
            { label: 'ROI', value: `${stats.avg_roi.toFixed(1)}x`, icon: <TrendingUp size={14} color={colors.success} /> },
          ].map((s) => (
            <View key={s.label} style={{ backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 80, alignItems: 'center' }}>
              {s.icon}
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginTop: 2 }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: colors.text.muted }}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={renderCampaign}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Megaphone size={48} color={colors.text.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
              {t('vendorAdvertising.noCampaigns')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center' }}>
              {t('vendorAdvertising.noCampaignsDesc')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
