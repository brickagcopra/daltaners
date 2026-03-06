import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, Lock, Phone, User } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { Button, Input } from '../../components/shared';
import { colors } from '../../theme';
import { t } from '../../i18n';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleRegister = async () => {
    setValidationError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password) {
      setValidationError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    try {
      await register({
        email: email.trim(),
        password,
        phone: phone.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
    } catch {
      // Error handled by store
    }
  };

  const displayError = validationError || error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text.primary }}>
              Create Account
            </Text>
            <Text style={{ fontSize: 15, color: colors.text.secondary, marginTop: 4 }}>
              Join Daltaners today
            </Text>
          </View>

          {displayError && (
            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#991B1B', fontSize: 14 }}>{displayError}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="First Name"
                placeholder="Juan"
                value={firstName}
                onChangeText={(v) => { setFirstName(v); clearError(); }}
                leftIcon={<User size={20} color={colors.text.muted} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Last Name"
                placeholder="Dela Cruz"
                value={lastName}
                onChangeText={(v) => { setLastName(v); clearError(); }}
              />
            </View>
          </View>

          <Input
            label={t('auth.email')}
            placeholder="juan@email.com"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError(); }}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={20} color={colors.text.muted} />}
          />

          <Input
            label={t('auth.phone')}
            placeholder="09171234567"
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError(); }}
            keyboardType="phone-pad"
            leftIcon={<Phone size={20} color={colors.text.muted} />}
          />

          <Input
            label={t('auth.password')}
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError(); }}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.text.muted} />}
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
            secureTextEntry
            leftIcon={<Lock size={20} color={colors.text.muted} />}
          />

          <Button
            title={t('auth.register')}
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            size="lg"
          />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: colors.text.secondary, fontSize: 14 }}>{t('auth.hasAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ color: colors.primary[500], fontSize: 14, fontWeight: '600' }}>
                {t('auth.login')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
