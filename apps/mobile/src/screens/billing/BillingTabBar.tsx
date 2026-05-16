import React from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BillingStackParamList } from '../../navigation/BillingNavigator';
import { billingColors } from './styles';

const TABS: { name: keyof BillingStackParamList; label: string }[] = [
  { name: 'BillingOverview', label: 'Overview' },
  { name: 'BillingUsage', label: 'Usage' },
];

export function BillingTabBar(): React.ReactElement {
  const navigation =
    useNavigation<NativeStackNavigationProp<BillingStackParamList>>();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const active = route.name as keyof BillingStackParamList;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollInner, { minWidth: width - 32 }]}
      >
        {TABS.map(t => {
          const isActive = active === t.name;
          return (
            <Pressable
              key={t.name}
              onPress={() => navigation.navigate(t.name)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: billingColors.border,
    marginBottom: 8,
  },
  scrollInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: billingColors.indigo,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: billingColors.textMuted,
  },
  tabTextActive: {
    color: billingColors.indigo,
  },
});
