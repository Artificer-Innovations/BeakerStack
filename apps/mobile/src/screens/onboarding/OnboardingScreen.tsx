import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { slides } from './slides';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const { width } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const reduceMotion = useReduceMotion();

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const goToNext = () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: !reduceMotion });
      setActiveIndex(nextIndex);
    } else {
      onComplete();
    }
  };

  const isLast = activeIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onComplete}
        accessibilityLabel="Skip onboarding"
        accessibilityRole="button"
      >
        {!isLast && <Text style={styles.skipText}>Skip</Text>}
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled={true}
      >
        {slides.map((slide, i) => (
          <View
            key={slide.key}
            style={[styles.slide, { backgroundColor: slide.backgroundColor }]}
            accessibilityLabel={`${slide.title}. Slide ${i + 1} of ${slides.length}`}
          >
            {slide.imageSource && (
              <Image
                source={slide.imageSource}
                style={styles.illustration}
                accessibilityRole="none"
                accessible={false}
              />
            )}
            {!slide.imageSource && <View style={[styles.illustration, styles.illustrationPlaceholder]} />}
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={goToNext}
          accessibilityLabel={isLast ? 'Get started with BeakerStack' : 'Next slide'}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{isLast ? 'Get started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: { fontSize: 16, color: '#6b7280' },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: { width: 200, height: 200, marginBottom: 40 },
  illustrationPlaceholder: { backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 16 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 24,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#111827', width: 20 },
  ctaButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
