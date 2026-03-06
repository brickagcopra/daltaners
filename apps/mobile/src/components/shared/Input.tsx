import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, ViewStyle, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, leftIcon, containerStyle, secureTextEntry, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry !== undefined;

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? colors.error : colors.border,
          borderRadius: 8,
          backgroundColor: colors.surface,
          height: 48,
          paddingHorizontal: 12,
        }}
      >
        {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.text.primary,
            height: '100%',
          }}
          placeholderTextColor={colors.text.muted}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
            {showPassword ? (
              <EyeOff size={20} color={colors.text.muted} />
            ) : (
              <Eye size={20} color={colors.text.muted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
}
