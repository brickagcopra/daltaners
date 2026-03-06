import React from 'react';
import { View, Text, ViewStyle } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
}

const presets: Record<string, { bg: string; text: string }> = {
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#DBEAFE', text: '#1E40AF' },
  neutral: { bg: '#F3F4F6', text: '#374151' },
};

export function Badge({ label, color, backgroundColor, size = 'sm' }: BadgeProps) {
  const style: ViewStyle = {
    backgroundColor: backgroundColor ?? presets.neutral.bg,
    borderRadius: size === 'sm' ? 4 : 6,
    paddingHorizontal: size === 'sm' ? 6 : 10,
    paddingVertical: size === 'sm' ? 2 : 4,
    alignSelf: 'flex-start',
  };

  return (
    <View style={style}>
      <Text
        style={{
          fontSize: size === 'sm' ? 11 : 13,
          fontWeight: '600',
          color: color ?? presets.neutral.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    pending: { ...presets.warning, label: 'Pending' },
    confirmed: { ...presets.info, label: 'Confirmed' },
    preparing: { bg: '#E0E7FF', text: '#3730A3', label: 'Preparing' },
    ready: { ...presets.success, label: 'Ready' },
    picked_up: { bg: '#CFFAFE', text: '#155E75', label: 'Picked Up' },
    in_transit: { bg: '#FEF9C3', text: '#854D0E', label: 'On the Way' },
    delivered: { ...presets.success, label: 'Delivered' },
    cancelled: { ...presets.error, label: 'Cancelled' },
    active: { ...presets.success, label: 'Active' },
    inactive: { ...presets.neutral, label: 'Inactive' },
    open: { ...presets.success, label: 'Open' },
    closed: { ...presets.error, label: 'Closed' },
  };

  const config = statusMap[status] ?? { ...presets.neutral, label: status };

  return <Badge label={config.label} backgroundColor={config.bg} color={config.text} />;
}
