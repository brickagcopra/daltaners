import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, ShoppingCart, ClipboardList, User } from 'lucide-react-native';
import { colors } from '../theme';

// Screens
import { HomeScreen } from '../screens/customer/HomeScreen';
import { SearchScreen } from '../screens/customer/SearchScreen';
import { StoreScreen } from '../screens/customer/StoreScreen';
import { ProductScreen } from '../screens/customer/ProductScreen';
import { CartScreen } from '../screens/customer/CartScreen';
import { CheckoutScreen } from '../screens/customer/CheckoutScreen';
import { OrderHistoryScreen } from '../screens/customer/OrderHistoryScreen';
import { OrderTrackingScreen } from '../screens/customer/OrderTrackingScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';
import { WalletScreen } from '../screens/customer/WalletScreen';
import { RewardsScreen } from '../screens/customer/RewardsScreen';
import { OrderDetailScreen } from '../screens/customer/OrderDetailScreen';
import { ReviewScreen } from '../screens/customer/ReviewScreen';
import { DisputesScreen } from '../screens/customer/DisputesScreen';
import { DisputeDetailScreen } from '../screens/customer/DisputeDetailScreen';
import { CreateDisputeScreen } from '../screens/customer/CreateDisputeScreen';
import { ReturnsScreen } from '../screens/customer/ReturnsScreen';
import { ReturnDetailScreen } from '../screens/customer/ReturnDetailScreen';
import { CreateReturnScreen } from '../screens/customer/CreateReturnScreen';
import { FoodScreen } from '../screens/customer/FoodScreen';
import { PharmacyScreen } from '../screens/customer/PharmacyScreen';

// ── Type definitions ──
export type CustomerTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

export type CustomerStackParamList = {
  Main: undefined;
  Store: { storeId: string; storeName?: string };
  Product: { productId: string; productName?: string };
  Checkout: undefined;
  OrderTracking: { orderId: string; orderNumber?: string };
  OrderDetail: { orderId: string; orderNumber?: string };
  Review: {
    reviewableType: 'store' | 'product' | 'delivery_personnel';
    reviewableId: string;
    reviewableName: string;
    orderId?: string;
  };
  Wallet: undefined;
  Rewards: undefined;
  Food: undefined;
  Pharmacy: undefined;
  Disputes: undefined;
  DisputeDetail: { disputeId: string; disputeNumber?: string };
  CreateDispute: { orderId: string; orderNumber?: string };
  Returns: undefined;
  ReturnDetail: { returnId: string; requestNumber?: string };
  CreateReturn: { orderId: string };
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

function CustomerTabs() {
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
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrderHistoryScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
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

export function CustomerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Main" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Store"
        component={StoreScreen}
        options={({ route }) => ({ title: route.params.storeName ?? 'Store' })}
      />
      <Stack.Screen
        name="Product"
        component={ProductScreen}
        options={({ route }) => ({ title: route.params.productName ?? 'Product' })}
      />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={({ route }) => ({ title: `Order ${route.params.orderNumber ?? ''}` })}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={({ route }) => ({ title: `Order ${route.params.orderNumber ?? ''}` })}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ title: 'Leave a Review' }}
      />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Rewards' }} />
      <Stack.Screen name="Food" component={FoodScreen} options={{ title: 'Food Delivery' }} />
      <Stack.Screen name="Pharmacy" component={PharmacyScreen} options={{ title: 'Pharmacy' }} />
      <Stack.Screen name="Disputes" component={DisputesScreen} options={{ title: 'My Disputes' }} />
      <Stack.Screen
        name="DisputeDetail"
        component={DisputeDetailScreen}
        options={({ route }) => ({ title: `Dispute ${route.params.disputeNumber ? '#' + route.params.disputeNumber : ''}` })}
      />
      <Stack.Screen name="CreateDispute" component={CreateDisputeScreen} options={{ title: 'Report an Issue' }} />
      <Stack.Screen name="Returns" component={ReturnsScreen} options={{ title: 'My Returns' }} />
      <Stack.Screen
        name="ReturnDetail"
        component={ReturnDetailScreen}
        options={({ route }) => ({ title: `Return ${route.params.requestNumber ? '#' + route.params.requestNumber : ''}` })}
      />
      <Stack.Screen name="CreateReturn" component={CreateReturnScreen} options={{ title: 'Request a Return' }} />
    </Stack.Navigator>
  );
}
