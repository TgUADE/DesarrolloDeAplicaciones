import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { BrandGradient, FontSize, FontWeight, space } from '@/constants/theme';

/* Pantalla inicial: permanece visible hasta que el usuario desliza hacia arriba. */
export default function Splash() {
  const router = useRouter();
  const didNavigate = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_evt, gesture) => {
          const swipedUp = gesture.dy < -60 && gesture.vy < -0.2;
          if (!didNavigate.current && swipedUp) {
            didNavigate.current = true;
            router.replace('/login');
          }
        },
      }),
    [router]
  );

  return (
    <LinearGradient
      {...panResponder.panHandlers}
      colors={BrandGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}>
      <StatusBar style="light" />
      <BrandLogo size={150} />
      <View style={styles.textBlock}>
        <Text style={styles.title}>SubastApp</Text>
        <Text style={styles.subtitle}>Subastas en vivo</Text>
      </View>
      <Text accessibilityLabel="Deslizar hacia arriba" style={styles.chevron}>⌃</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  textBlock: {
    alignItems: 'center',
    gap: space.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  chevron: {
    position: 'absolute',
    bottom: space.xl,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 34,
    fontWeight: FontWeight.bold,
  },
});
