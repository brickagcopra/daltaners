import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, CreditCard, Bell, HelpCircle, FileText, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar, Card } from '../../components/shared';
import { colors } from '../../theme';
import { t } from '../../i18n';

export function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const menuItems = [
    { icon: <User size={20} color={colors.text.secondary} />, label: 'Personal Information', onPress: () => {} },
    { icon: <CreditCard size={20} color={colors.text.secondary} />, label: 'Payout Settings', onPress: () => {} },
    { icon: <FileText size={20} color={colors.text.secondary} />, label: 'Documents', onPress: () => {} },
    { icon: <Bell size={20} color={colors.text.secondary} />, label: 'Notifications', onPress: () => {} },
    { icon: <HelpCircle size={20} color={colors.text.secondary} />, label: 'Help & Support', onPress: () => {} },
    { icon: <LogOut size={20} color={colors.error} />, label: t('common.logout'), onPress: logout, color: colors.error },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        {/* Profile Header */}
        <View style={{ padding: 24, backgroundColor: colors.surface, alignItems: 'center' }}>
          <Avatar uri={user?.avatar_url} name={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`} size={80} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 12 }}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 2 }}>Delivery Rider</Text>
          <Text style={{ fontSize: 14, color: colors.text.muted, marginTop: 2 }}>{user?.email}</Text>
        </View>

        {/* Menu */}
        <View style={{ padding: 16 }}>
          <Card padding={0}>
            {menuItems.map((item, index) => (
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

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
