import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, Lock } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { Button, Input } from '../../components/shared';
import { colors } from '../../theme';
import { t } from '../../i18n';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation, route }: Props) {
  const mode = route.params?.mode ?? 'customer';
  const { login, vendorLogin, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    try {
      if (mode === 'vendor') {
        await vendorLogin(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch {
      // Error handled by store
    }
  };

  const title = mode === 'vendor' ? 'Vendor Login' : mode === 'delivery' ? 'Rider Login' : 'Welcome Back';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: colors.primary[500],
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFFFFF' }}>D</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text.primary }}>{title}</Text>
            <Text style={{ fontSize: 15, color: colors.text.secondary, marginTop: 4 }}>
              Sign in to continue
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#991B1B', fontSize: 14 }}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <Input
            label={t('auth.email')}
            placeholder="Enter your email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) clearError();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Mail size={20} color={colors.text.muted} />}
          />

          <Input
            label={t('auth.password')}
            placeholder="Enter your password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) clearError();
            }}
            secureTextEntry
            autoComplete="password"
            leftIcon={<Lock size={20} color={colors.text.muted} />}
          />

          <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
            <Text style={{ color: colors.primary[500], fontSize: 14, fontWeight: '500' }}>
              {t('auth.forgotPassword')}
            </Text>
          </TouchableOpacity>

          <Button
            title={t('auth.login')}
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            size="lg"
          />

          {/* Register link */}
          {mode === 'customer' && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ color: colors.text.secondary, fontSize: 14 }}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={{ color: colors.primary[500], fontSize: 14, fontWeight: '600' }}>
                  {t('auth.register')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
