import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, Clock, MapPin, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { Card, Avatar, LoadingSpinner } from '../../components/shared';
import { vendorApi } from '../../services/api';
import { colors } from '../../theme';
import { t } from '../../utils';
import type { Store as StoreType } from '../../types';

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [store, setStore] = useState<StoreType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      const { data } = await vendorApi.get('/vendors/stores/me');
      setStore(data.data);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const location = store?.locations?.[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text.primary }}>{t('vendor.settings')}</Text>
        </View>

        {/* Store Info */}
        {store && (
          <Card style={{ margin: 16, marginTop: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar uri={store.logo_url} name={store.name} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>{store.name}</Text>
                <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 2 }}>{store.category}</Text>
              </View>
              <ChevronRight size={20} color={colors.text.muted} />
            </View>
          </Card>
        )}

        {/* Settings items */}
        <View style={{ paddingHorizontal: 16 }}>
          <Card padding={0}>
            <SettingsItem icon={<Store size={20} color={colors.text.secondary} />} label="Store Profile" />
            <SettingsItem icon={<Clock size={20} color={colors.text.secondary} />} label="Operating Hours" />
            <SettingsItem icon={<MapPin size={20} color={colors.text.secondary} />} label="Delivery Settings" />
          </Card>
        </View>

        {/* Account */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.muted, marginBottom: 8, textTransform: 'uppercase' }}>
            Account
          </Text>
          <Card padding={0}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
              <Avatar name={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.text.muted }}>{user?.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={logout}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                gap: 12,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <LogOut size={20} color={colors.error} />
              <Text style={{ fontSize: 15, color: colors.error }}>{t('common.logout')}</Text>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {icon}
      <Text style={{ flex: 1, fontSize: 15, color: colors.text.primary }}>{label}</Text>
      <ChevronRight size={18} color={colors.text.muted} />
    </TouchableOpacity>
  );
}
