import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ticket,
  Plus,
  Percent,
  DollarSign,
  Truck,
  X,
  Calendar,
  Users,
} from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { orderApi } from '../../services/api';
import { colors, borderRadius } from '../../theme';
import { formatCurrency, formatDate, t } from '../../utils';
import type { VendorCoupon, CouponDiscountType } from '../../types';

const DISCOUNT_ICONS: Record<CouponDiscountType, React.ReactNode> = {
  percentage: <Percent size={14} color="#7C3AED" />,
  fixed_amount: <DollarSign size={14} color={colors.success} />,
  free_delivery: <Truck size={14} color="#0284C7" />,
};

export function CouponsScreen() {
  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    discount_type: 'percentage' as CouponDiscountType,
    discount_value: '',
    minimum_order_value: '',
    usage_limit: '',
    is_first_order_only: false,
  });

  const fetchCoupons = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const { data } = await orderApi.get('/orders/vendor/coupons', {
          params: { page: pageNum, limit: 20 },
        });
        const items = data.data ?? [];
        const meta = data.meta;

        if (append) {
          setCoupons((prev) => [...prev, ...items]);
        } else {
          setCoupons(items);
        }
        setHasMore(meta?.page < meta?.totalPages);
      } catch {
        if (!append) setCoupons([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchCoupons(1);
  }, [fetchCoupons]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchCoupons(1);
  };

  const handleLoadMore = () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCoupons(nextPage, true);
  };

  const handleToggle = async (coupon: VendorCoupon) => {
    try {
      await orderApi.patch(`/orders/vendor/coupons/${coupon.id}`, {
        is_active: !coupon.is_active,
      });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)),
      );
    } catch {
      Alert.alert('Failed to update coupon status');
    }
  };

  const handleDelete = (coupon: VendorCoupon) => {
    Alert.alert('Delete Coupon', `Are you sure you want to delete "${coupon.code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await orderApi.delete(`/orders/vendor/coupons/${coupon.id}`);
            handleRefresh();
          } catch {
            Alert.alert('Failed to delete coupon');
          }
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!form.code.trim() || !form.discount_value) return;
    setIsSaving(true);
    try {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await orderApi.post('/orders/vendor/coupons', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim() || form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        minimum_order_value: form.minimum_order_value ? Number(form.minimum_order_value) : 0,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        is_first_order_only: form.is_first_order_only,
        valid_from: now.toISOString(),
        valid_until: validUntil.toISOString(),
      });

      Alert.alert(t('vendorCoupons.created'), t('vendorCoupons.createdMessage'));
      setShowCreate(false);
      setForm({ code: '', name: '', discount_type: 'percentage', discount_value: '', minimum_order_value: '', usage_limit: '', is_first_order_only: false });
      handleRefresh();
    } catch {
      Alert.alert(t('vendorCoupons.createError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const formatDiscount = (coupon: VendorCoupon) => {
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}% off`;
    if (coupon.discount_type === 'fixed_amount') return `${formatCurrency(coupon.discount_value)} off`;
    return 'Free Delivery';
  };

  const isExpired = (coupon: VendorCoupon) => new Date(coupon.valid_until) < new Date();

  const renderCoupon = ({ item }: { item: VendorCoupon }) => {
    const expired = isExpired(item);

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 10, opacity: expired ? 0.6 : 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Coupon Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {DISCOUNT_ICONS[item.discount_type]}
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, letterSpacing: 1 }}>
                {item.code}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary[600], marginBottom: 4 }}>
              {formatDiscount(item)}
            </Text>
            {item.minimum_order_value > 0 && (
              <Text style={{ fontSize: 12, color: colors.text.muted }}>
                Min. order: {formatCurrency(item.minimum_order_value)}
              </Text>
            )}
          </View>

          {/* Toggle */}
          <Switch
            value={item.is_active && !expired}
            onValueChange={() => handleToggle(item)}
            disabled={expired}
            trackColor={{ false: colors.border, true: colors.primary[200] }}
            thumbColor={item.is_active ? colors.primary[500] : '#F4F3F4'}
          />
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Users size={12} color={colors.text.muted} />
            <Text style={{ fontSize: 12, color: colors.text.muted, marginLeft: 4 }}>
              {item.usage_count}{item.usage_limit ? `/${item.usage_limit}` : ''} used
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={12} color={colors.text.muted} />
            <Text style={{ fontSize: 12, color: expired ? colors.error : colors.text.muted, marginLeft: 4 }}>
              {expired ? 'Expired' : `Until ${formatDate(item.valid_until)}`}
            </Text>
          </View>
        </View>

        {/* Badges */}
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 6 }}>
          {item.is_first_order_only && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#E0E7FF' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#3730A3' }}>First Order</Text>
            </View>
          )}
          {expired && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FEE2E2' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#991B1B' }}>Expired</Text>
            </View>
          )}
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={{ position: 'absolute', top: 12, right: 48 }}
        >
          <X size={16} color={colors.text.muted} />
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.surface }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
          {coupons.length} {t('vendorCoupons.coupons')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary[500],
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginLeft: 6 }}>
            {t('vendorCoupons.create')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={renderCoupon}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ticket size={48} color={colors.text.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
              {t('vendorCoupons.noCoupons')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center' }}>
              {t('vendorCoupons.noCouponsDesc')}
            </Text>
          </View>
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>
                {t('vendorCoupons.createCoupon')}
              </Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <X size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Code */}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 4 }}>Code *</Text>
              <TextInput
                value={form.code}
                onChangeText={(v) => setForm({ ...form, code: v.toUpperCase() })}
                placeholder="e.g. SAVE20"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="characters"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text.primary, marginBottom: 12 }}
              />

              {/* Name */}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 4 }}>Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. 20% Off Everything"
                placeholderTextColor={colors.text.muted}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text.primary, marginBottom: 12 }}
              />

              {/* Discount Type */}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 4 }}>Discount Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[
                  { key: 'percentage' as const, label: '%' },
                  { key: 'fixed_amount' as const, label: '₱' },
                  { key: 'free_delivery' as const, label: 'Free Del.' },
                ].map((type) => {
                  const isSelected = form.discount_type === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      onPress={() => setForm({ ...form, discount_type: type.key })}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        backgroundColor: isSelected ? colors.primary[50] : colors.background,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary[500] : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? colors.primary[600] : colors.text.muted }}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Discount Value */}
              {form.discount_type !== 'free_delivery' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 4 }}>
                    Discount Value *
                  </Text>
                  <TextInput
                    value={form.discount_value}
                    onChangeText={(v) => setForm({ ...form, discount_value: v })}
                    placeholder={form.discount_type === 'percentage' ? '20' : '100'}
                    placeholderTextColor={colors.text.muted}
                    keyboardType="numeric"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text.primary, marginBottom: 12 }}
                  />
                </>
              )}

              {/* Min Order */}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 4 }}>Minimum Order Value</Text>
              <TextInput
                value={form.minimum_order_value}
                onChangeText={(v) => setForm({ ...form, minimum_order_value: v })}
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text.primary, marginBottom: 12 }}
              />

              {/* Usage Limit */}
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 4 }}>Usage Limit (blank = unlimited)</Text>
              <TextInput
                value={form.usage_limit}
                onChangeText={(v) => setForm({ ...form, usage_limit: v })}
                placeholder="100"
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text.primary, marginBottom: 12 }}
              />

              {/* First Order Only */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>First Order Only</Text>
                <Switch
                  value={form.is_first_order_only}
                  onValueChange={(v) => setForm({ ...form, is_first_order_only: v })}
                  trackColor={{ false: colors.border, true: colors.primary[200] }}
                  thumbColor={form.is_first_order_only ? colors.primary[500] : '#F4F3F4'}
                />
              </View>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={isSaving || !form.code.trim()}
                style={{
                  backgroundColor: colors.primary[500],
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: isSaving || !form.code.trim() ? 0.6 : 1,
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                  {isSaving ? 'Creating...' : t('vendorCoupons.createCoupon')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
