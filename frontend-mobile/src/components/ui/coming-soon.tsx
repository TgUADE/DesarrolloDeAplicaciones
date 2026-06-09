import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

/** Pantalla placeholder para pestañas todavía no implementadas. */
export function ComingSoon({ title, message }: { title: string; message: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.soon}>Próximamente</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  header: {
    backgroundColor: Brand.primary,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#fff', marginTop: space.sm },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  soon: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Brand.text },
  message: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center' },
});
