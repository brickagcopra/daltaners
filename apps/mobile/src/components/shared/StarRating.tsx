import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '../../theme';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 16,
  interactive = false,
  onRate,
}: StarRatingProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.floor(rating);
        const isHalf = !isFilled && starValue <= Math.ceil(rating) && rating % 1 >= 0.5;

        const star = (
          <Star
            key={i}
            size={size}
            color={isFilled || isHalf ? colors.accent[500] : colors.border}
            fill={isFilled ? colors.accent[500] : 'transparent'}
          />
        );

        if (interactive && onRate) {
          return (
            <TouchableOpacity key={i} onPress={() => onRate(starValue)} activeOpacity={0.7}>
              {star}
            </TouchableOpacity>
          );
        }

        return star;
      })}
    </View>
  );
}
