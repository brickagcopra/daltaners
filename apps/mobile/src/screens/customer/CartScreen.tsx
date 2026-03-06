import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';
import { useCartStore } from '../../stores/cart.store';
import { Button, Card, EmptyState } from '../../components/shared';
import { colors } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { CartItem } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

export function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { items, storeName, subtotal, itemCount, updateQuantity, removeItem, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          icon={<ShoppingBag size={48} color={colors.text.muted} />}
          title={t('cart.empty')}
          description={t('cart.emptyDescription')}
          actionLabel={t('cart.addItems')}
          onAction={() => navigation.navigate('Main')}
        />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: CartItem }) => {
    const primaryImage = item.product.images?.find((img) => img.is_primary)?.url ?? item.product.images?.[0]?.url;
    const price = (item.product.sale_price ?? item.product.base_price) + (item.variant?.price_adjustment ?? 0);

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {primaryImage && (
            <Image source={{ uri: primaryImage }} style={{ width: 72, height: 72, borderRadius: 8 }} contentFit="cover" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
              {item.product.name}
            </Text>
            {item.variant && (
              <Text style={{ fontSize: 12, color: colors.text.muted }}>{item.variant.name}</Text>
            )}
            {item.special_instructions ? (
              <Text style={{ fontSize: 12, color: colors.text.muted, fontStyle: 'italic', marginTop: 2 }} numberOfLines={1}>
                {t('cart.specialInstructions')}: {item.special_instructions}
              </Text>
            ) : null}
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary[500], marginTop: 4 }}>
              {formatCurrency(price * item.quantity)}
            </Text>
          </View>

          {/* Quantity controls */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={14} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: '600', minWidth: 20, textAlign: 'center' }}>
                {item.quantity}
              </Text>
              <TouchableOpacity
                onPress={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: colors.primary[500],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => removeItem(item.product.id, item.variant?.id)}
              style={{ marginTop: 8, padding: 4 }}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{t('cart.title')}</Text>
          {storeName && (
            <Text style={{ fontSize: 14, color: colors.text.secondary }}>{storeName}</Text>
          )}
        </View>
        <TouchableOpacity onPress={clearCart}>
          <Text style={{ color: colors.error, fontSize: 14, fontWeight: '500' }}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.product.id}-${item.variant?.id ?? 'default'}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Summary */}
      <View style={{ padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 14, color: colors.text.secondary }}>
            {t('cart.subtotal')} ({itemCount()} items)
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
            {formatCurrency(subtotal())}
          </Text>
        </View>
        <Button
          title={t('cart.checkout')}
          onPress={() => navigation.navigate('Checkout')}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
