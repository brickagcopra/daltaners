import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  User, MapPin, CreditCard, Bell, Globe, HelpCircle, Info,
  Wallet, Trophy, ChevronRight, LogOut, AlertTriangle, RotateCcw,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar, Card } from '../../components/shared';
import { colors } from '../../theme';
import { t } from '../../i18n';
import type { CustomerStackParamList } from '../../navigation/CustomerNavigator';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthStore();

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: <User size={20} color={colors.text.secondary} />, label: t('profile.personalInfo'), onPress: () => {} },
        { icon: <MapPin size={20} color={colors.text.secondary} />, label: t('profile.addresses'), onPress: () => {} },
        { icon: <Wallet size={20} color={colors.text.secondary} />, label: t('wallet.title'), onPress: () => navigation.navigate('Wallet') },
        { icon: <Trophy size={20} color={colors.text.secondary} />, label: t('rewards.title'), onPress: () => navigation.navigate('Rewards') },
        { icon: <CreditCard size={20} color={colors.text.secondary} />, label: t('profile.paymentMethods'), onPress: () => {} },
        { icon: <AlertTriangle size={20} color={colors.text.secondary} />, label: t('profile.disputes'), onPress: () => navigation.navigate('Disputes') },
        { icon: <RotateCcw size={20} color={colors.text.secondary} />, label: t('profile.returns'), onPress: () => navigation.navigate('Returns') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: <Bell size={20} color={colors.text.secondary} />, label: t('profile.notifications'), onPress: () => {} },
        { icon: <Globe size={20} color={colors.text.secondary} />, label: t('profile.language'), onPress: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: <HelpCircle size={20} color={colors.text.secondary} />, label: t('profile.help'), onPress: () => {} },
        { icon: <Info size={20} color={colors.text.secondary} />, label: t('profile.about'), onPress: () => {} },
        { icon: <LogOut size={20} color={colors.error} />, label: t('common.logout'), onPress: logout, color: colors.error },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        {/* User Header */}
        <View style={{ padding: 24, backgroundColor: colors.surface, alignItems: 'center' }}>
          <Avatar uri={user?.avatar_url} name={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`} size={80} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 12 }}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 2 }}>{user?.email}</Text>
          {user?.phone && (
            <Text style={{ fontSize: 14, color: colors.text.muted, marginTop: 2 }}>{user.phone}</Text>
          )}
        </View>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.muted, paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' }}>
              {section.title}
            </Text>
            <Card style={{ marginHorizontal: 16 }} padding={0}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    gap: 12,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                  }}
                >
                  {item.icon}
                  <Text style={{ flex: 1, fontSize: 15, color: item.color ?? colors.text.primary }}>{item.label}</Text>
                  <ChevronRight size={18} color={colors.text.muted} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
