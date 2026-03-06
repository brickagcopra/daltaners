import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary[500], text: '#FFFFFF' },
  secondary: { bg: colors.secondary[500], text: '#FFFFFF' },
  outline: { bg: 'transparent', text: colors.primary[500], border: colors.primary[500] },
  ghost: { bg: 'transparent', text: colors.text.primary },
  danger: { bg: colors.error, text: '#FFFFFF' },
};

const sizeStyles: Record<string, { paddingV: number; paddingH: number; fontSize: number; height: number }> = {
  sm: { paddingV: 6, paddingH: 12, fontSize: 13, height: 32 },
  md: { paddingV: 10, paddingH: 20, fontSize: 15, height: 44 },
  lg: { paddingV: 14, paddingH: 24, fontSize: 17, height: 52 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    backgroundColor: vStyle.bg,
    borderWidth: vStyle.border ? 1 : 0,
    borderColor: vStyle.border,
    borderRadius: 8,
    height: sStyle.height,
    paddingHorizontal: sStyle.paddingH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: isDisabled ? 0.5 : 1,
    ...(fullWidth ? { width: '100%' as unknown as number } : {}),
    ...style,
  };

  const textStyle: TextStyle = {
    color: vStyle.text,
    fontSize: sStyle.fontSize,
    fontWeight: '600',
  };

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress} disabled={isDisabled} activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={vStyle.text} size="small" />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
