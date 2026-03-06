import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Star, Gift, TrendingUp, Award } from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { loyaltyApi } from '../../services/api';
import { colors, tierColors } from '../../theme';
import { formatDateTime, t } from '../../utils';
import type { LoyaltyAccount, LoyaltyTransaction, LoyaltyTier } from '../../types';

const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  Bronze: 0,
  Silver: 1000,
  Gold: 5000,
  Platinum: 20000,
};

const TIER_ORDER: LoyaltyTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export function RewardsScreen() {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        loyaltyApi.get('/loyalty/account'),
        loyaltyApi.get('/loyalty/transactions', { params: { limit: 20 } }),
      ]);
      setAccount(accRes.data.data);
      setTransactions(txRes.data.data ?? []);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!account) return <LoadingSpinner fullScreen message="Loading rewards..." />;

  const currentTierIndex = TIER_ORDER.indexOf(account.tier);
  const nextTier = currentTierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIndex + 1] : null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const progress = nextThreshold ? Math.min(account.lifetime_points / nextThreshold, 1) : 1;

  const filteredTxns = filterType
    ? transactions.filter((tx) => tx.type === filterType)
    : transactions;

  const tColor = tierColors[account.tier];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tier Card */}
      <View
        style={{
          margin: 16,
          padding: 24,
          borderRadius: 16,
          backgroundColor: tColor.bg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Award size={24} color={tColor.text} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: tColor.text }}>{account.tier} Member</Text>
        </View>
        <Text style={{ fontSize: 36, fontWeight: '800', color: tColor.text }}>{account.points_balance.toLocaleString()}</Text>
        <Text style={{ fontSize: 14, color: tColor.text, opacity: 0.8 }}>{t('rewards.points')}</Text>

        {/* Progress to next tier */}
        {nextTier && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: tColor.text, opacity: 0.8 }}>{account.tier}</Text>
              <Text style={{ fontSize: 12, color: tColor.text, opacity: 0.8 }}>{nextTier}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: tColor.text,
                  width: `${progress * 100}%`,
                }}
              />
            </View>
            <Text style={{ fontSize: 11, color: tColor.text, opacity: 0.7, marginTop: 4 }}>
              {(nextThreshold! - account.lifetime_points).toLocaleString()} points to {nextTier}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Star size={20} color={colors.accent[500]} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>
            {account.lifetime_points.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: colors.text.muted }}>Lifetime Points</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Gift size={20} color={colors.primary[500]} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>
            {account.points_balance.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: colors.text.muted }}>Available</Text>
        </Card>
      </View>

      {/* Filters */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
          {t('rewards.history')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[null, 'earned', 'redeemed', 'bonus'].map((type) => (
            <TouchableOpacity
              key={type ?? 'all'}
              onPress={() => setFilterType(type)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: filterType === type ? colors.primary[500] : '#F3F4F6',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '500', color: filterType === type ? '#FFFFFF' : colors.text.secondary }}>
                {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {filteredTxns.map((tx) => (
          <Card key={tx.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TrendingUp
                size={20}
                color={tx.type === 'redeemed' ? colors.error : colors.success}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                  {tx.description ?? tx.type}
                </Text>
                <Text style={{ fontSize: 11, color: colors.text.muted }}>{formatDateTime(tx.created_at)}</Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: tx.type === 'redeemed' ? colors.error : colors.success,
                }}
              >
                {tx.type === 'redeemed' ? '-' : '+'}{tx.points}
              </Text>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
