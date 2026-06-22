import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

/** Cabecera de marca (azul sólido, estilo Home - Subastas) con retroceso y título. */
export function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={26} color="#ffffff" />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.primary,
    paddingBottom: space.md,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  back: {
    position: 'absolute',
    left: space.md,
    bottom: space.md - 2,
    zIndex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
});
