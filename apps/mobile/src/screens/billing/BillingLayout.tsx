import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BillingTabBar } from './BillingTabBar';
import { billingStyles } from './styles';

export function BillingLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={billingStyles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={billingStyles.scrollContent}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Go back'
          onPress={() => {
            const parent = navigation.getParent();
            if (parent?.canGoBack()) {
              parent.goBack();
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={billingStyles.backLink}>← Back</Text>
        </Pressable>
        <Text style={billingStyles.h1}>Billing</Text>
        <BillingTabBar />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
