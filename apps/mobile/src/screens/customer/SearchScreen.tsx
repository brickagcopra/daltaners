import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Star, SlidersHorizontal } from 'lucide-react-native';
import { SearchBar, Card, PriceTag, LoadingSpinner, EmptyState } from '../../components/shared';
import { catalogApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency } from '../../utils/format';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Product } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const { data } = await catalogApi.get('/catalog/search', {
        params: { q: query.trim(), size: 20 },
      });
      setProducts(data.data?.items ?? data.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const renderProduct = ({ item }: { item: Product }) => {
    const primaryImage = item.images?.find((img) => img.is_primary)?.url ?? item.images?.[0]?.url;

    return (
      <Card
        onPress={() => navigation.navigate('Product', { productId: item.slug, productName: item.name })}
        style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 8 }}
        padding={12}
      >
        {primaryImage && (
          <Image
            source={{ uri: primaryImage }}
            style={{ width: 80, height: 80, borderRadius: 8 }}
            contentFit="cover"
          />
        )}
        <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
            {item.name}
          </Text>
          {item.store?.name && (
            <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>{item.store.name}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            <PriceTag price={item.base_price} salePrice={item.sale_price} size="sm" />
            {item.rating_average > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Star size={12} color={colors.accent[500]} fill={colors.accent[500]} />
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                  {item.rating_average.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search products..." onSubmit={doSearch} autoFocus />
        </View>
        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SlidersHorizontal size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Searching..." />
      ) : !hasSearched ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, color: colors.text.secondary }}>Search for products, stores...</Text>
        </View>
      ) : products.length === 0 ? (
        <EmptyState title="No results found" description={`No products matching "${query}"`} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  );
}
