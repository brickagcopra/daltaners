import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '../../theme';

interface InteractiveStarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: number;
}

export function InteractiveStarRating({
  rating,
  onRatingChange,
  size = 32,
}: InteractiveStarRatingProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;

        return (
          <TouchableOpacity
            key={i}
            onPress={() => onRatingChange(starValue)}
            activeOpacity={0.7}
            style={{ padding: 4 }}
          >
            <Star
              size={size}
              color={isFilled ? colors.accent[500] : colors.border}
              fill={isFilled ? colors.accent[500] : 'transparent'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
});
