import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import {
  Star,
  Clock,
  MapPin,
  UtensilsCrossed,
  Leaf,
  X,
} from 'lucide-react-native';
import { vendorApi } from '../../services/api';
import { Card, LoadingSpinner, EmptyState, Badge } from '../../components/shared';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { formatCurrency, formatDistance, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Store } from '../../types';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const CUISINES = [
  { key: 'all', label: 'All' },
  { key: 'filipino', label: 'Filipino' },
  { key: 'chinese', label: 'Chinese' },
  { key: 'japanese', label: 'Japanese' },
  { key: 'korean', label: 'Korean' },
  { key: 'italian', label: 'Italian' },
  { key: 'american', label: 'American' },
  { key: 'thai', label: 'Thai' },
];

const DIETARY_OPTIONS = [
  { key: 'halal', label: 'Halal' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'gluten-free', label: 'Gluten-Free' },
];

const DIETARY_COLORS: Record<string, string> = {
  halal: '#059669',
  vegan: '#16a34a',
  vegetarian: '#65a30d',
  'gluten-free': '#d97706',
  kosher: '#2563eb',
  organic: '#0d9488',
};

interface FoodStore extends Store {
  metadata?: { dietary_tags?: string[]; cuisine?: string };
  distance_meters?: number;
}

export function FoodScreen() {
  const navigation = useNavigation<Nav>();
  const [stores, setStores] = useState<FoodStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);

  const fetchStores = useCallback(async () => {
    try {
      const params: Record<string, string | boolean> = { category: 'restaurant' };
      if (selectedCuisine !== 'all') params.cuisine = selectedCuisine;
      if (selectedDietary.length > 0) params.dietary = selectedDietary.join(',');
      if (openOnly) params.open_now = true;

      const res = await vendorApi.get('/vendors/stores', { params });
      setStores(res.data.data ?? []);
    } catch {
      setStores([]);
    }
  }, [selectedCuisine, selectedDietary, openOnly]);

  useEffect(() => {
    setIsLoading(true);
    fetchStores().finally(() => setIsLoading(false));
  }, [fetchStores]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchStores();
    setIsRefreshing(false);
  };

  const toggleDietary = (key: string) => {
    setSelectedDietary((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );
  };

  const renderRestaurantCard = ({ item }: { item: FoodStore }) => {
    const dietaryTags = item.metadata?.dietary_tags ?? [];
    return (
      <Card
        onPress={() => navigation.navigate('Store', { storeId: item.slug, storeName: item.name })}
        style={{ width: CARD_WIDTH, marginBottom: spacing.md }}
        padding={0}
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: item.banner_url || item.logo_url || undefined }}
            style={{
              width: '100%',
              height: 100,
              borderTopLeftRadius: borderRadius.lg,
              borderTopRightRadius: borderRadius.lg,
              backgroundColor: colors.primary[50],
            }}
            contentFit="cover"
          />
          {item.is_featured && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                backgroundColor: colors.accent[500],
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#1A1A1A' }}>FEATURED</Text>
            </View>
          )}
        </View>

        <View style={{ padding: spacing.sm }}>
          <Text
            style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <Star size={12} color={colors.accent[500]} fill={colors.accent[500]} />
            <Text style={{ fontSize: 12, color: colors.text.secondary }}>
              {item.rating_average.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.muted }}>
              ({item.rating_count})
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <Clock size={12} color={colors.text.muted} />
            <Text style={{ fontSize: 11, color: colors.text.muted }}>
              {item.preparation_time_minutes} min
            </Text>
            {item.minimum_order_value > 0 && (
              <Text style={{ fontSize: 11, color: colors.text.muted }}>
                Min. {formatCurrency(item.minimum_order_value)}
              </Text>
            )}
          </View>

          {dietaryTags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
              {dietaryTags.slice(0, 2).map((tag) => (
                <View
                  key={tag}
                  style={{
                    backgroundColor: (DIETARY_COLORS[tag] ?? '#6b7280') + '18',
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 9, color: DIETARY_COLORS[tag] ?? '#6b7280', fontWeight: '500' }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Hero */}
      <View style={{ padding: spacing.lg, backgroundColor: colors.primary[500] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UtensilsCrossed size={24} color="#FFF" />
          <Text style={{ ...typography.h1, color: '#FFF' }}>{t('food.title')}</Text>
        </View>
        <Text style={{ ...typography.body, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          {t('food.subtitle')}
        </Text>
      </View>

      {/* Cuisine Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 }}
        style={{ flexGrow: 0, backgroundColor: colors.surface }}
      >
        {CUISINES.map((c) => {
          const active = selectedCuisine === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setSelectedCuisine(c.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: active ? colors.primary[500] : colors.background,
                borderWidth: active ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? '600' : '400',
                  color: active ? '#FFF' : colors.text.secondary,
                }}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dietary + Open Now */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          gap: 8,
          backgroundColor: colors.surface,
          flexWrap: 'wrap',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {DIETARY_OPTIONS.map((d) => {
          const active = selectedDietary.includes(d.key);
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => toggleDietary(d.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 16,
                backgroundColor: active ? '#dcfce7' : colors.background,
                borderWidth: 1,
                borderColor: active ? '#16a34a' : colors.border,
                gap: 4,
              }}
            >
              <Leaf size={12} color={active ? '#16a34a' : colors.text.muted} />
              <Text
                style={{ fontSize: 12, color: active ? '#16a34a' : colors.text.secondary, fontWeight: active ? '600' : '400' }}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setOpenOnly(!openOnly)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 16,
            backgroundColor: openOnly ? colors.primary[50] : colors.background,
            borderWidth: 1,
            borderColor: openOnly ? colors.primary[500] : colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: openOnly ? colors.primary[600] : colors.text.secondary,
              fontWeight: openOnly ? '600' : '400',
            }}
          >
            {t('food.openNow')}
          </Text>
        </TouchableOpacity>

        {(selectedDietary.length > 0 || openOnly || selectedCuisine !== 'all') && (
          <TouchableOpacity
            onPress={() => {
              setSelectedCuisine('all');
              setSelectedDietary([]);
              setOpenOnly(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 16,
              backgroundColor: colors.error + '12',
              gap: 4,
            }}
          >
            <X size={12} color={colors.error} />
            <Text style={{ fontSize: 12, color: colors.error }}>{t('food.clearFilters')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Restaurant List */}
      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : stores.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('food.noRestaurants')}
          description={t('food.noRestaurantsDesc')}
        />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 80 }}
          renderItem={renderRestaurantCard}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}
