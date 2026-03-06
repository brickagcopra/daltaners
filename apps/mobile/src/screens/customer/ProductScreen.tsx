import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Dimensions, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Minus, Plus, ShoppingCart, Star } from 'lucide-react-native';
import { Button, PriceTag, StarRating, LoadingSpinner, EmptyState } from '../../components/shared';
import { useCartStore } from '../../stores/cart.store';
import { catalogApi, inventoryApi } from '../../services/api';
import { colors } from '../../theme';
import { formatCurrency, t } from '../../utils';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import type { Product, ProductVariant } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<CustomerStackParamList, 'Product'>;

export function ProductScreen({ route }: Props) {
  const { productId } = route.params;
  const { addItem, items } = useCartStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number | null>(null);
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setIsLoading(true);
    try {
      const { data } = await catalogApi.get(`/catalog/products/${productId}`);
      setProduct(data.data);
      if (data.data.variants?.length > 0) {
        setSelectedVariant(data.data.variants[0]);
      }
      // Check stock availability
      if (data.data.store_id) {
        checkStock(data.data.store_id, productId);
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const checkStock = async (storeId: string, prodId: string) => {
    setIsCheckingStock(true);
    try {
      const { data } = await inventoryApi.get(`/inventory/stock/${storeId}/${prodId}`);
      setStockQuantity(data.data?.quantity ?? null);
    } catch {
      // Stock check failed — assume available
      setStockQuantity(null);
    } finally {
      setIsCheckingStock(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!product) return <EmptyState title="Product not found" />;

  const basePrice = product.sale_price ?? product.base_price;
  const variantAdj = selectedVariant?.price_adjustment ?? 0;
  const totalPrice = (basePrice + variantAdj) * quantity;

  const existingItem = items.find(
    (item) => item.product.id === product.id && item.variant?.id === selectedVariant?.id,
  );

  const isOutOfStock = stockQuantity !== null && stockQuantity <= 0;

  const handleAddToCart = () => {
    if (existingItem && product.store_id !== useCartStore.getState().storeId) {
      Alert.alert(
        'Different Store',
        'Adding items from a different store will clear your current cart. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              addItem(product, quantity, selectedVariant);
              if (specialInstructions.trim()) {
                useCartStore.getState().setSpecialInstructions(product.id, specialInstructions.trim(), selectedVariant?.id);
              }
            },
          },
        ],
      );
      return;
    }
    addItem(product, quantity, selectedVariant);
    if (specialInstructions.trim()) {
      useCartStore.getState().setSpecialInstructions(product.id, specialInstructions.trim(), selectedVariant?.id);
    }
    Alert.alert('Added to Cart', `${quantity}x ${product.name} added to your cart.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        {/* Product Images */}
        {product.images.length > 0 && (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImageIndex(index);
              }}
            >
              {product.images.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.url }}
                  style={{ width: SCREEN_WIDTH, height: 300 }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
            {product.images.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 }}>
                {product.images.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: activeImageIndex === index ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: activeImageIndex === index ? colors.primary[500] : '#D1D5DB',
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ padding: 16 }}>
          {/* Name & Price */}
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{product.name}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
            <PriceTag price={product.base_price} salePrice={product.sale_price} size="lg" />
            {product.rating_average > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <StarRating rating={product.rating_average} size={14} />
                <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                  ({product.rating_count})
                </Text>
              </View>
            )}
          </View>

          {product.store?.name && (
            <Text style={{ fontSize: 14, color: colors.text.muted, marginTop: 4 }}>
              Sold by {product.store.name}
            </Text>
          )}

          {/* Description */}
          {product.description && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
                Description
              </Text>
              <Text style={{ fontSize: 14, color: colors.text.secondary, lineHeight: 22 }}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Variants */}
          {product.variants.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
                Options
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {product.variants.map((variant) => (
                  <TouchableOpacity
                    key={variant.id}
                    onPress={() => setSelectedVariant(variant)}
                    style={{
                      borderWidth: 2,
                      borderColor: selectedVariant?.id === variant.id ? colors.primary[500] : colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      backgroundColor: selectedVariant?.id === variant.id ? colors.primary[50] : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: selectedVariant?.id === variant.id ? '600' : '400',
                        color: selectedVariant?.id === variant.id ? colors.primary[600] : colors.text.primary,
                      }}
                    >
                      {variant.name}
                    </Text>
                    {variant.price_adjustment !== 0 && (
                      <Text style={{ fontSize: 12, color: colors.text.muted }}>
                        {variant.price_adjustment > 0 ? '+' : ''}{formatCurrency(variant.price_adjustment)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Stock Status */}
          {stockQuantity !== null && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isOutOfStock ? colors.error : stockQuantity <= 5 ? '#F59E0B' : colors.success,
                }}
              >
                {isOutOfStock
                  ? t('product.outOfStock')
                  : stockQuantity <= 5
                    ? t('product.lowStock', { count: String(stockQuantity) })
                    : t('product.inStock')}
              </Text>
            </View>
          )}

          {/* Quantity */}
          <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>Quantity</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={18} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary, minWidth: 30, textAlign: 'center' }}>
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: colors.primary[500],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Special Instructions */}
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
              {t('product.specialInstructions')}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                color: colors.text.primary,
                minHeight: 60,
                textAlignVertical: 'top',
                backgroundColor: colors.surface,
              }}
              placeholder={t('product.specialInstructionsPlaceholder')}
              placeholderTextColor={colors.text.muted}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              maxLength={200}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: colors.text.muted }}>Total</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
            {formatCurrency(totalPrice)}
          </Text>
        </View>
        <Button
          title={isOutOfStock ? t('product.outOfStock') : "Add to Cart"}
          onPress={handleAddToCart}
          icon={<ShoppingCart size={18} color="#FFFFFF" />}
          size="lg"
          disabled={isOutOfStock}
        />
      </View>
    </View>
  );
}
