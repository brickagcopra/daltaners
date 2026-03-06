import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Power, MapPin, Clock, DollarSign, Navigation } from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth.store';
import { useLocationStore } from '../../stores/location.store';
import { Card, Button, StatusBadge, EmptyState, LoadingSpinner } from '../../components/shared';
import { deliveryApi } from '../../services/api';
import { sendLocation, connectDeliveryTracking } from '../../services/socket';
import { colors } from '../../theme';
import { formatCurrency, formatDistance, t } from '../../utils';
import type { DeliveryStackParamList } from '../../navigation/DeliveryNavigator';
import type { DeliveryAssignment, GeoCoordinates } from '../../types';

type Nav = NativeStackNavigationProp<DeliveryStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { currentLocation, getCurrentLocation, startWatching } = useLocationStore();
  const [isOnline, setIsOnline] = useState(false);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await getCurrentLocation();
      const [assignRes, earningsRes] = await Promise.all([
        deliveryApi.get('/delivery/my').catch(() => ({ data: { data: [] } })),
        deliveryApi.get('/delivery/earnings/today').catch(() => ({ data: { data: { total: 0 } } })),
      ]);
      setAssignments(assignRes.data.data ?? []);
      setTodayEarnings(earningsRes.data.data?.total ?? 0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleOnline = async () => {
    if (!isOnline) {
      // Going online
      try {
        await deliveryApi.post('/delivery/online');
        setIsOnline(true);

        // Start GPS tracking
        await connectDeliveryTracking();
        startWatching((coords: GeoCoordinates) => {
          sendLocation(coords.latitude, coords.longitude);
        });
      } catch {
        Alert.alert('Error', 'Failed to go online. Please try again.');
      }
    } else {
      // Going offline
      try {
        await deliveryApi.post('/delivery/offline');
        setIsOnline(false);
      } catch {
        Alert.alert('Error', 'Failed to go offline.');
      }
    }
  };

  const declineDelivery = (deliveryId: string) => {
    Alert.alert(
      t('delivery.declineConfirmTitle'),
      t('delivery.declineConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('delivery.decline'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deliveryApi.post(`/delivery/${deliveryId}/decline`);
              loadData();
            } catch {
              Alert.alert(t('common.error'), t('delivery.declineFailed'));
            }
          },
        },
      ],
    );
  };

  const acceptDelivery = async (deliveryId: string) => {
    try {
      await deliveryApi.post(`/delivery/${deliveryId}/accept`);
      loadData();
      navigation.navigate('ActiveDelivery', { deliveryId });
    } catch {
      Alert.alert('Error', 'Failed to accept delivery.');
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  const activeDelivery = assignments.find((a) => ['accepted', 'at_store', 'picked_up', 'in_transit'].includes(a.status));
  const pendingAssignments = assignments.filter((a) => a.status === 'assigned');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadData(); }} />}
      >
        {/* Header with online toggle */}
        <View style={{ padding: 16, backgroundColor: isOnline ? colors.success : colors.text.secondary }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
                {isOnline ? 'You are online' : 'You are offline'}
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 2 }}>
                {user?.first_name ?? 'Rider'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Power size={20} color="#FFFFFF" />
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Today's Earnings */}
        <Card style={{ margin: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.text.muted }}>{t('delivery.todayEarnings')}</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary[500], marginTop: 4 }}>
            {formatCurrency(todayEarnings)}
          </Text>
        </Card>

        {/* Active Delivery */}
        {activeDelivery && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
              Active Delivery
            </Text>
            <Card
              onPress={() => navigation.navigate('ActiveDelivery', { deliveryId: activeDelivery.id })}
              style={{ borderLeftWidth: 4, borderLeftColor: colors.primary[500] }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
                  #{activeDelivery.order_number}
                </Text>
                <StatusBadge status={activeDelivery.status} />
              </View>
              <View style={{ marginTop: 8, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color={colors.primary[500]} />
                  <Text style={{ fontSize: 13, color: colors.text.secondary }} numberOfLines={1}>
                    {activeDelivery.store_name}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Navigation size={14} color={colors.success} />
                  <Text style={{ fontSize: 13, color: colors.text.secondary }} numberOfLines={1}>
                    {activeDelivery.customer_address}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 14, color: colors.text.muted }}>{formatDistance(activeDelivery.distance_km * 1000)}</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.success }}>
                  {formatCurrency(activeDelivery.delivery_fee + (activeDelivery.tip_amount ?? 0))}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Pending Assignments */}
        {pendingAssignments.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
              {t('delivery.newDelivery')}
            </Text>
            {pendingAssignments.map((assignment) => (
              <Card key={assignment.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>#{assignment.order_number}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.success }}>
                    {formatCurrency(assignment.delivery_fee)}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4 }}>
                  {assignment.store_name} → {assignment.customer_address}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.muted, marginTop: 2 }}>
                  {formatDistance(assignment.distance_km * 1000)} · {assignment.items_count} items
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Button title={t('delivery.decline')} onPress={() => declineDelivery(assignment.id)} variant="outline" size="sm" style={{ flex: 1 }} />
                  <Button title={t('delivery.accept')} onPress={() => acceptDelivery(assignment.id)} size="sm" style={{ flex: 1 }} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {!activeDelivery && pendingAssignments.length === 0 && isOnline && (
          <EmptyState
            title="Waiting for deliveries"
            description="New delivery requests will appear here."
          />
        )}

        {!isOnline && !activeDelivery && (
          <EmptyState
            title="You're offline"
            description="Go online to start receiving delivery requests."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
