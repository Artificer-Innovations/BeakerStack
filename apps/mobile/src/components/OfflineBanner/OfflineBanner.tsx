import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNetwork } from '../../lib/network/NetworkContext';

const ENABLED = process.env.EXPO_PUBLIC_OFFLINE_RESILIENCE_ENABLED === 'true';

export function OfflineBanner() {
  const { isInternetReachable } = useNetwork();
  const slideAnim = useRef(new Animated.Value(-48)).current;
  const offline = isInternetReachable === false;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: offline ? 0 : -48,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [offline, slideAnim]);

  if (!ENABLED) return null;

  return (
    <Animated.View
      style={[s.banner, { transform: [{ translateY: slideAnim }] }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel="You are offline"
      pointerEvents="none"
    >
      <Text style={s.text}>No internet connection</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
