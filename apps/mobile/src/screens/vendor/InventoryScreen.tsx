import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, AlertTriangle } from 'lucide-react-native';
import { Card, StatusBadge, Button, SearchBar, LoadingSpinner, EmptyState } from '../../components/shared';
import { inventoryApi } from '../../services/api';
import { colors } from '../../theme';
import { t } from '../../utils';
import type { StockItem } from '../../types';

export function InventoryScreen() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (search.trim()) params.search = search.trim();
      const { data } = await inventoryApi.get('/inventory/stock', { params });
      setStocks(data.data ?? []);
    } catch {
      setStocks([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const adjustStock = (stockId: string, productName: string, currentQty: number) => {
    Alert.prompt(
      'Adjust Stock',
      `Enter new quantity for ${productName} (current: ${currentQty}):`,
      async (value) => {
        const newQty = parseInt(value, 10);
        if (isNaN(newQty) || newQty < 0) {
          Alert.alert('Invalid', 'Please enter a valid number.');
          return;
        }
        try {
          await inventoryApi.post('/inventory/stock/adjust', {
            stock_id: stockId,
            quantity: newQty - currentQty,
            reason: 'Manual adjustment from mobile app',
          });
          loadInventory();
        } catch {
          Alert.alert('Error', 'Failed to adjust stock.');
        }
      },
      'plain-text',
      currentQty.toString(),
    );
  };

  const renderStock = ({ item }: { item: StockItem }) => {
    const available = item.quantity - item.reserved_quantity;
    const isLow = item.status === 'low_stock';
    const isOut = item.status === 'out_of_stock';

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {(isLow || isOut) && <AlertTriangle size={14} color={isOut ? colors.error : colors.warning} />}
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.primary }} numberOfLines={1}>
                {item.product_name}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <View>
                <Text style={{ fontSize: 11, color: colors.text.muted }}>In Stock</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>{item.quantity}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.text.muted }}>Reserved</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.warning }}>{item.reserved_quantity}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.text.muted }}>Available</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: available > 0 ? colors.success : colors.error }}>
                  {available}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <StatusBadge status={item.status} />
            <Button
              title="Adjust"
              onPress={() => adjustStock(item.id, item.product_name, item.quantity)}
              variant="outline"
              size="sm"
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{t('vendor.inventory')}</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search inventory..." onSubmit={loadInventory} />
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : stocks.length === 0 ? (
        <EmptyState
          icon={<Package size={48} color={colors.text.muted} />}
          title="No inventory"
          description="Your inventory items will appear here."
        />
      ) : (
        <FlatList
          data={stocks}
          keyExtractor={(item) => item.id}
          renderItem={renderStock}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadInventory(); }} />}
        />
      )}
    </SafeAreaView>
  );
}
