import React, { type ReactNode } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { AppHeader } from '@beakerstack/shared/components/navigation/AppHeader.native';
import { supabase } from '../../lib/supabase';
import { BillingTabBar } from './BillingTabBar';
import { billingStyles } from './styles';

export function BillingLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SafeAreaView style={billingStyles.safe}>
      <AppHeader supabaseClient={supabase} />
      <ScrollView contentContainerStyle={billingStyles.scrollContent}>
        <BillingTabBar />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
