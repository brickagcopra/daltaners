import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../stores/auth.store';
import { LoadingSpinner } from '../components/shared';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { VendorNavigator } from './VendorNavigator';
import { DeliveryNavigator } from './DeliveryNavigator';

export function RootNavigator() {
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading Daltaners..." />;
  }

  if (!isAuthenticated || !user) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Route to appropriate navigator based on user role
  const getNavigator = () => {
    switch (user.role) {
      case 'vendor_owner':
      case 'vendor_staff':
        return <VendorNavigator />;
      case 'delivery':
        return <DeliveryNavigator />;
      case 'customer':
      default:
        return <CustomerNavigator />;
    }
  };

  return <NavigationContainer>{getNavigator()}</NavigationContainer>;
}
