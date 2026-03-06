import React from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react-native';
import { Button, Card } from '../../components/shared';
import { colors } from '../../theme';
import type { DeliveryStackParamList } from '../../navigation/DeliveryNavigator';

type Props = NativeStackScreenProps<DeliveryStackParamList, 'Navigation'>;

export function NavigationScreen({ route, navigation }: Props) {
  const { lat, lng, address } = route.params;

  const openInMaps = () => {
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'google.navigation:',
    });

    const url = Platform.select({
      ios: `maps:?daddr=${lat},${lng}&dirflg=d`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps web URL
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
        }
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>Navigation</Text>
      </View>

      {/* Map placeholder */}
      <View style={{ flex: 1, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
        <MapPin size={48} color={colors.text.muted} />
        <Text style={{ fontSize: 16, color: colors.text.secondary, marginTop: 12 }}>
          Map View
        </Text>
        <Text style={{ fontSize: 13, color: colors.text.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
          In production, this will show a live map with turn-by-turn navigation using react-native-maps.
        </Text>
      </View>

      {/* Destination Info */}
      <View style={{ padding: 16, backgroundColor: colors.surface }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={20} color={colors.primary[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.text.muted }}>Destination</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
                {address}
              </Text>
            </View>
          </View>
        </Card>

        <Button
          title="Open in Maps App"
          onPress={openInMaps}
          icon={<ExternalLink size={16} color="#FFFFFF" />}
          fullWidth
          size="lg"
          style={{ marginTop: 12 }}
        />
      </View>
    </SafeAreaView>
  );
}
