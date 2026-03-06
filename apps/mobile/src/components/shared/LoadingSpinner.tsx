import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '../../theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'large', message, fullScreen = false }: LoadingSpinnerProps) {
  const content = (
    <>
      <ActivityIndicator size={size} color={colors.primary[500]} />
      {message && (
        <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 12 }}>{message}</Text>
      )}
    </>
  );

  if (fullScreen) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center' }}>{content}</View>
  );
}
