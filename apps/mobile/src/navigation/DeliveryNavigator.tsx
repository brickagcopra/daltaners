import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Navigation, DollarSign, User } from 'lucide-react-native';
import { colors } from '../theme';

// Screens
import { HomeScreen } from '../screens/delivery/HomeScreen';
import { ActiveDeliveryScreen } from '../screens/delivery/ActiveDeliveryScreen';
import { NavigationScreen } from '../screens/delivery/NavigationScreen';
import { EarningsScreen } from '../screens/delivery/EarningsScreen';
import { ProfileScreen } from '../screens/delivery/ProfileScreen';

// ── Type definitions ──
export type DeliveryTabParamList = {
  HomeTab: undefined;
  EarningsTab: undefined;
  ProfileTab: undefined;
};

export type DeliveryStackParamList = {
  Main: undefined;
  ActiveDelivery: { deliveryId: string; orderId?: string };
  Navigation: { deliveryId: string; lat: number; lng: number; address: string };
};

const Tab = createBottomTabNavigator<DeliveryTabParamList>();
const Stack = createNativeStackNavigator<DeliveryStackParamList>();

function DeliveryTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={EarningsScreen}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ color, size }) => <DollarSign size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function DeliveryNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Main" component={DeliveryTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ActiveDelivery"
        component={ActiveDeliveryScreen}
        options={{ title: 'Active Delivery' }}
      />
      <Stack.Screen
        name="Navigation"
        component={NavigationScreen}
        options={{ title: 'Navigate', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
