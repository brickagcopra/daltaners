import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {icon && <View style={{ marginBottom: 16 }}>{icon}</View>}
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary, textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginTop: 8 }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={{ marginTop: 24 }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
