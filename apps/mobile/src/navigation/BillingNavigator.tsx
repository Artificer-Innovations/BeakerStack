import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BillingOverviewScreen } from '../screens/billing/BillingOverviewScreen';
import { BillingUsageScreen } from '../screens/billing/BillingUsageScreen';

export type BillingStackParamList = {
  BillingOverview: undefined;
  BillingUsage: undefined;
};

const Stack = createNativeStackNavigator<BillingStackParamList>();

export default function BillingNavigator(): React.ReactElement {
  return (
    <Stack.Navigator
      initialRouteName='BillingOverview'
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name='BillingOverview' component={BillingOverviewScreen} />
      <Stack.Screen name='BillingUsage' component={BillingUsageScreen} />
    </Stack.Navigator>
  );
}
