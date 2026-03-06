import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { MapPin, ChevronRight, ShoppingBag, Utensils, Pill, Cpu, Star } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { useLocationStore } from '../../stores/location.store';
import { Card, SearchBar, StarRating, LoadingSpinner } from '../../components/shared';
import { catalogApi, vendorApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, formatDistance, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Store, Category, NearbyStore } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
const { width } = Dimensions.get('window');

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  grocery: <ShoppingBag size={24} color={colors.primary[500]} />,
  restaurant: <Utensils size={24} color={colors.primary[500]} />,
  pharmacy: <Pill size={24} color={colors.primary[500]} />,
  electronics: <Cpu size={24} color={colors.primary[500]} />,
};

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { currentLocation, getCurrentLocation, selectedAddress } = useLocationStore();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const location = currentLocation ?? (await getCurrentLocation());

      const [catRes, storesRes] = await Promise.all([
        catalogApi.get('/catalog/categories').catch(() => ({ data: { data: [] } })),
        location
          ? vendorApi
              .get('/vendors/stores/nearby', {
                params: { latitude: location.latitude, longitude: location.longitude, radius: 10 },
              })
              .catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
      ]);

      setCategories(catRes.data.data ?? []);
      setNearbyStores(storesRes.data.data ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (search.trim()) {
      navigation.navigate('Main');
      // Navigate to search tab with query
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ padding: 16, backgroundColor: colors.primary[500] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <MapPin size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 14, marginLeft: 4, flex: 1 }} numberOfLines={1}>
              {selectedAddress?.address_line1 ?? 'Set your location'}
            </Text>
            <TouchableOpacity>
              <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
            {t('home.greeting', { name: user?.first_name ?? 'there' })}
          </Text>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('home.searchPlaceholder')}
            onSubmit={handleSearch}
          />
        </View>

        {/* Categories */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>
            {t('home.categories')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {categories.slice(0, 8).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={{ alignItems: 'center', width: 72 }}
                onPress={() => {
                  if (cat.slug === 'restaurant') {
                    navigation.navigate('Food');
                  } else if (cat.slug === 'pharmacy') {
                    navigation.navigate('Pharmacy');
                  } else {
                    navigation.navigate('Main');
                  }
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: colors.primary[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                  }}
                >
                  {CATEGORY_ICONS[cat.slug] ?? <ShoppingBag size={24} color={colors.primary[500]} />}
                </View>
                <Text style={{ fontSize: 11, color: colors.text.secondary, textAlign: 'center' }} numberOfLines={2}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Near You */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>
              {t('home.nearYou')}
            </Text>
            <TouchableOpacity>
              <Text style={{ color: colors.primary[500], fontSize: 14, fontWeight: '500' }}>
                {t('common.seeAll')}
              </Text>
            </TouchableOpacity>
          </View>

          {nearbyStores.length === 0 ? (
            <Card>
              <Text style={{ color: colors.text.secondary, textAlign: 'center', padding: 16 }}>
                No stores found nearby. Try expanding your location.
              </Text>
            </Card>
          ) : (
            <FlatList
              data={nearbyStores.slice(0, 10)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.store.id}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <Card
                  onPress={() => navigation.navigate('Store', { storeId: item.store.slug, storeName: item.store.name })}
                  style={{ width: width * 0.7 }}
                  padding={0}
                >
                  {item.store.banner_url && (
                    <Image
                      source={{ uri: item.store.banner_url }}
                      style={{ width: '100%', height: 120, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                      contentFit="cover"
                    />
                  )}
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>
                      {item.store.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Star size={14} color={colors.accent[500]} fill={colors.accent[500]} />
                        <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                          {item.store.rating_average.toFixed(1)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.text.muted }}>
                        {formatDistance(item.distance_meters)}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.text.muted }}>
                        Min. {formatCurrency(item.store.minimum_order_value)}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
