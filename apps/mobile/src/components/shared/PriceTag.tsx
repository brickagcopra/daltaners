import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../theme';
import { formatCurrency } from '../../utils/format';

interface PriceTagProps {
  price: number;
  salePrice?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceTag({ price, salePrice, size = 'md' }: PriceTagProps) {
  const fontSizes = { sm: 13, md: 16, lg: 20 };
  const fontSize = fontSizes[size];
  const hasDiscount = salePrice !== undefined && salePrice < price;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text
        style={{
          fontSize,
          fontWeight: '700',
          color: hasDiscount ? colors.error : colors.text.primary,
        }}
      >
        {formatCurrency(hasDiscount ? salePrice : price)}
      </Text>
      {hasDiscount && (
        <Text
          style={{
            fontSize: fontSize - 2,
            color: colors.text.muted,
            textDecorationLine: 'line-through',
          }}
        >
          {formatCurrency(price)}
        </Text>
      )}
    </View>
  );
}
