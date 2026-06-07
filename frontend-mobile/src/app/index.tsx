import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { BrandGradient, FontSize, FontWeight, space } from '@/constants/theme';

/* Pantalla de carga inicial (diseño de la guía: degradé de marca + logo).
   Tras la marca redirige al login. */
export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/login'), 1600);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <LinearGradient
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
});
