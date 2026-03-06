import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, ClipboardList, Package, Boxes, Settings } from 'lucide-react-native';
import { colors } from '../theme';

// Screens
import { DashboardScreen } from '../screens/vendor/DashboardScreen';
import { OrderManagementScreen } from '../screens/vendor/OrderManagementScreen';
import { ProductManagementScreen } from '../screens/vendor/ProductManagementScreen';
import { InventoryScreen } from '../screens/vendor/InventoryScreen';
import { SettingsScreen } from '../screens/vendor/SettingsScreen';
import { AnalyticsScreen } from '../screens/vendor/AnalyticsScreen';
import { ReviewsScreen } from '../screens/vendor/ReviewsScreen';
import { DisputesScreen } from '../screens/vendor/DisputesScreen';
import { ReturnsScreen } from '../screens/vendor/ReturnsScreen';
import { FinancialsScreen } from '../screens/vendor/FinancialsScreen';
import { PerformanceScreen } from '../screens/vendor/PerformanceScreen';
import { StaffScreen } from '../screens/vendor/StaffScreen';
import { CouponsScreen } from '../screens/vendor/CouponsScreen';
import { AdvertisingScreen } from '../screens/vendor/AdvertisingScreen';
import { ViolationsScreen } from '../screens/vendor/ViolationsScreen';

// ── Type definitions ──
export type VendorTabParamList = {
  DashboardTab: undefined;
  OrdersTab: undefined;
  ProductsTab: undefined;
  InventoryTab: undefined;
  SettingsTab: undefined;
};

export type VendorStackParamList = {
  Main: undefined;
  OrderDetail: { orderId: string; orderNumber?: string };
  ProductForm: { productId?: string };
  Analytics: undefined;
  Reviews: undefined;
  VendorDisputes: undefined;
  VendorReturns: undefined;
  VendorFinancials: undefined;
  VendorPerformance: undefined;
  VendorStaff: undefined;
  VendorCoupons: undefined;
  VendorAdvertising: undefined;
  VendorViolations: undefined;
};

const Tab = createBottomTabNavigator<VendorTabParamList>();
const Stack = createNativeStackNavigator<VendorStackParamList>();

function VendorTabs() {
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
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrderManagementScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductManagementScreen}
        options={{
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={InventoryScreen}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size }) => <Boxes size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function VendorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Main" component={VendorTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="OrderDetail"
        component={OrderManagementScreen}
        options={({ route }) => ({ title: `Order ${route.params.orderNumber ?? ''}` })}
      />
      <Stack.Screen
        name="ProductForm"
        component={ProductManagementScreen}
        options={({ route }) => ({
          title: route.params.productId ? 'Edit Product' : 'New Product',
        })}
      />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
      <Stack.Screen name="VendorDisputes" component={DisputesScreen} options={{ title: 'Disputes' }} />
      <Stack.Screen name="VendorReturns" component={ReturnsScreen} options={{ title: 'Returns' }} />
      <Stack.Screen name="VendorFinancials" component={FinancialsScreen} options={{ title: 'Financials' }} />
      <Stack.Screen name="VendorPerformance" component={PerformanceScreen} options={{ title: 'Performance' }} />
      <Stack.Screen name="VendorStaff" component={StaffScreen} options={{ title: 'Staff' }} />
      <Stack.Screen name="VendorCoupons" component={CouponsScreen} options={{ title: 'Coupons' }} />
      <Stack.Screen name="VendorAdvertising" component={AdvertisingScreen} options={{ title: 'Advertising' }} />
      <Stack.Screen name="VendorViolations" component={ViolationsScreen} options={{ title: 'Policy Violations' }} />
    </Stack.Navigator>
  );
}
