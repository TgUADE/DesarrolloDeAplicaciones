import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Brand, FontSize, FontWeight, Radius } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

/** Botón de marca. `primary` (azul lleno) o `secondary` (contorno). */
export function Button({ title, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (pressed || loading || disabled) && styles.dim,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? Brand.textOnPrimary : Brand.primary} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: { backgroundColor: Brand.primary },
  secondary: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  dim: { opacity: 0.7 },
  text: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  textPrimary: { color: Brand.textOnPrimary },
  textSecondary: { color: Brand.text },
});
