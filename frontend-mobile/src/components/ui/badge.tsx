import { StyleSheet, Text, View } from 'react-native';

import { FontSize, FontWeight, Radius } from '@/constants/theme';

/** Etiqueta tipo pill: fondo tenue del color + texto del color (estilo figma). */
export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
