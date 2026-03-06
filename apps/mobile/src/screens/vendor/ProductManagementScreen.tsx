import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Plus, Edit, Trash2 } from 'lucide-react-native';
import { Card, PriceTag, StatusBadge, SearchBar, LoadingSpinner, EmptyState, Button } from '../../components/shared';
import { catalogApi } from '../../services/api';
import { colors } from '../../theme';
import { t } from '../../utils';
import type { Product } from '../../types';

export function ProductManagementScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (search.trim()) params.search = search.trim();
      const { data } = await catalogApi.get('/catalog/products', { params });
      setProducts(data.data?.items ?? data.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const deleteProduct = async (productId: string, productName: string) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${productName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await catalogApi.delete(`/catalog/products/${productId}`);
            loadProducts();
          } catch {
            Alert.alert('Error', 'Failed to delete product.');
          }
        },
      },
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const primaryImage = item.images?.find((img) => img.is_primary)?.url ?? item.images?.[0]?.url;

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {primaryImage && (
            <Image source={{ uri: primaryImage }} style={{ width: 64, height: 64, borderRadius: 8 }} contentFit="cover" />
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                  {item.category?.name ?? 'Uncategorized'}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <PriceTag price={item.base_price} salePrice={item.sale_price} size="sm" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: colors.primary[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit size={16} color={colors.primary[500]} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteProduct(item.id, item.name)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: '#FEE2E2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{t('vendor.products')}</Text>
        <Button title="Add" onPress={() => {}} icon={<Plus size={16} color="#FFFFFF" />} size="sm" />
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search products..." onSubmit={loadProducts} />
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState title="No products" description="Add your first product to get started." actionLabel="Add Product" onAction={() => {}} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadProducts(); }} />}
        />
      )}
    </SafeAreaView>
  );
}
