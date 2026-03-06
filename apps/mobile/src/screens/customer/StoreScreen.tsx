import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Star, Clock, MapPin, Phone } from 'lucide-react-native';
import { Card, PriceTag, StatusBadge, LoadingSpinner, EmptyState } from '../../components/shared';
import { vendorApi, catalogApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Store, Product } from '../../types';

type Props = NativeStackScreenProps<CustomerStackParamList, 'Store'>;
const { width } = Dimensions.get('window');

export function StoreScreen({ route, navigation }: Props) {
  const { storeId } = route.params;
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStore();
  }, [storeId]);

  const loadStore = async () => {
    setIsLoading(true);
    try {
      const [storeRes, productsRes] = await Promise.all([
        vendorApi.get(`/vendors/stores/${storeId}`),
        catalogApi.get('/catalog/products', { params: { store_id: storeId, limit: 50 } }),
      ]);
      setStore(storeRes.data.data);
      setProducts(productsRes.data.data?.items ?? productsRes.data.data ?? []);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!store) return <EmptyState title="Store not found" />;

  const location = store.locations?.[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Store Banner */}
      {store.banner_url && (
        <Image source={{ uri: store.banner_url }} style={{ width, height: 200 }} contentFit="cover" />
      )}

      {/* Store Info */}
      <View style={{ padding: 16, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {store.logo_url && (
            <Image source={{ uri: store.logo_url }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>{store.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <StatusBadge status={store.status === 'active' ? 'open' : 'closed'} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Star size={14} color={colors.accent[500]} fill={colors.accent[500]} />
                <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                  {store.rating_average.toFixed(1)} ({store.rating_count})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {store.description && (
          <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 12 }}>{store.description}</Text>
        )}

        {/* Store details */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={14} color={colors.text.muted} />
            <Text style={{ fontSize: 13, color: colors.text.secondary }}>
              {store.preparation_time_minutes} min prep
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, color: colors.text.secondary }}>
              Min. {formatCurrency(store.minimum_order_value)}
            </Text>
          </View>
          {location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} color={colors.text.muted} />
              <Text style={{ fontSize: 13, color: colors.text.secondary }} numberOfLines={1}>
                {location.city}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Products */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
          {t('store.allProducts')}
        </Text>

        {products.length === 0 ? (
          <EmptyState title="No products yet" description="This store hasn't added any products." />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {products.map((product) => {
              const primaryImage = product.images?.find((img) => img.is_primary)?.url ?? product.images?.[0]?.url;
              return (
                <Card
                  key={product.id}
                  onPress={() => navigation.navigate('Product', { productId: product.slug, productName: product.name })}
                  style={{ width: (width - 44) / 2 }}
                  padding={0}
                >
                  {primaryImage && (
                    <Image
                      source={{ uri: primaryImage }}
                      style={{ width: '100%', height: 120, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                      contentFit="cover"
                    />
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <PriceTag price={product.base_price} salePrice={product.sale_price} size="sm" />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
