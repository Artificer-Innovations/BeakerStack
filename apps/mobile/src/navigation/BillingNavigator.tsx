import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { ReactElement } from 'react';
import { BillingOverviewScreen } from '../screens/billing/BillingOverviewScreen';
import { BillingPlansScreen } from '../screens/billing/BillingPlansScreen';
import { BillingInvoicesScreen } from '../screens/billing/BillingInvoicesScreen';

const Tab = createMaterialTopTabNavigator();

export function BillingNavigator(): ReactElement {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#6b7280',
        tabBarIndicatorStyle: { backgroundColor: '#4f46e5' },
        tabBarStyle: { backgroundColor: '#fff' },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
          textTransform: 'none',
        },
      }}
    >
      <Tab.Screen name='Overview' component={BillingOverviewScreen} />
      <Tab.Screen name='Plans' component={BillingPlansScreen} />
      <Tab.Screen name='Invoices' component={BillingInvoicesScreen} />
    </Tab.Navigator>
  );
}
