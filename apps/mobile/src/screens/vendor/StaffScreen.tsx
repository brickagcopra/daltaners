import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  X,
  Mail,
} from 'lucide-react-native';
import { Card, LoadingSpinner } from '../../components/shared';
import { vendorApi } from '../../services/api';
import { colors, borderRadius } from '../../theme';
import { getInitials, t } from '../../utils';
import type { StoreStaff, StaffRole } from '../../types';
import { useAuthStore } from '../../stores/auth.store';

const ROLE_COLORS: Record<StaffRole, { bg: string; text: string }> = {
  manager: { bg: '#DBEAFE', text: '#1E40AF' },
  staff: { bg: '#D1FAE5', text: '#065F46' },
  cashier: { bg: '#FEF3C7', text: '#92400E' },
};

export function StaffScreen() {
  const { user } = useAuthStore();
  const [staff, setStaff] = useState<StoreStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('staff');
  const [isSending, setIsSending] = useState(false);

  const storeId = (user as { vendorId?: string })?.vendorId;

  const fetchStaff = useCallback(async () => {
    if (!storeId) return;
    try {
      const { data } = await vendorApi.get(`/vendors/stores/${storeId}/staff`);
      setStaff(data.data ?? []);
    } catch {
      setStaff([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStaff();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !storeId) return;
    setIsSending(true);
    try {
      await vendorApi.post(`/vendors/stores/${storeId}/staff`, {
        email: inviteEmail.trim(),
        role: inviteRole,
        permissions: [],
      });
      Alert.alert(t('vendorStaff.inviteSent'), t('vendorStaff.inviteSentMessage'));
      setShowInvite(false);
      setInviteEmail('');
      handleRefresh();
    } catch {
      Alert.alert(t('vendorStaff.inviteError'));
    } finally {
      setIsSending(false);
    }
  };

  const handleRemove = (member: StoreStaff) => {
    Alert.alert(
      t('vendorStaff.removeConfirmTitle'),
      t('vendorStaff.removeConfirmMessage'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorApi.delete(`/vendors/staff/${member.id}`);
              handleRefresh();
            } catch {
              Alert.alert(t('vendorStaff.removeError'));
            }
          },
        },
      ],
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const renderStaff = ({ item }: { item: StoreStaff }) => {
    const roleStyle = ROLE_COLORS[item.role] ?? ROLE_COLORS.staff;
    const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.email || 'Staff Member';

    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Avatar */}
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary[100],
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary[600] }}>
              {getInitials(name)}
            </Text>
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>{name}</Text>
            {item.email && (
              <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>{item.email}</Text>
            )}
          </View>

          {/* Role Badge */}
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: roleStyle.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: roleStyle.text }}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 12 }}>
          {!item.is_active && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FEE2E2' }}>
              <Text style={{ fontSize: 11, color: '#991B1B' }}>Inactive</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => handleRemove(item)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Trash2 size={14} color={colors.error} />
            <Text style={{ fontSize: 12, color: colors.error, marginLeft: 4 }}>Remove</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.surface }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
          {staff.length} {t('vendorStaff.members')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowInvite(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary[500],
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <UserPlus size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginLeft: 6 }}>
            {t('vendorStaff.addStaff')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        renderItem={renderStaff}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Users size={48} color={colors.text.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>
              {t('vendorStaff.noStaff')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center' }}>
              {t('vendorStaff.noStaffDesc')}
            </Text>
          </View>
        }
      />

      {/* Invite Modal */}
      <Modal visible={showInvite} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>
                {t('vendorStaff.addStaff')}
              </Text>
              <TouchableOpacity onPress={() => setShowInvite(false)}>
                <X size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Email */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 6 }}>Email</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 }}>
              <Mail size={16} color={colors.text.muted} />
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="staff@example.com"
                placeholderTextColor={colors.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14, color: colors.text.primary }}
              />
            </View>

            {/* Role Selector */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 6 }}>Role</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['manager', 'staff', 'cashier'] as StaffRole[]).map((role) => {
                const isSelected = inviteRole === role;
                const style = ROLE_COLORS[role];
                return (
                  <TouchableOpacity
                    key={role}
                    onPress={() => setInviteRole(role)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: isSelected ? style.bg : colors.background,
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? style.text : colors.text.muted }}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleInvite}
              disabled={isSending || !inviteEmail.trim()}
              style={{
                backgroundColor: colors.primary[500],
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
                opacity: isSending || !inviteEmail.trim() ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {isSending ? 'Adding...' : t('vendorStaff.addStaff')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
