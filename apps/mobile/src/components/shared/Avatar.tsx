import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../theme';
import { getInitials } from '../../utils/format';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ uri, name = '', size = 40, style }: AvatarProps) {
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (uri) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text
        style={{
          fontSize: size * 0.4,
          fontWeight: '600',
          color: colors.primary[600],
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}
