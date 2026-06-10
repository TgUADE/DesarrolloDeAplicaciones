import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/theme';

/**
 * Estrella de "seguir subasta". `locked` (participás) → llena y no se puede desmarcar.
 */
export function StarButton({
  followed,
  locked,
  onToggle,
}: {
  followed: boolean;
  locked?: boolean;
  onToggle?: () => void;
}) {
  return (
    <Pressable
      onPress={locked ? undefined : onToggle}
      disabled={locked}
      hitSlop={10}
      style={styles.btn}>
      <Text style={[styles.star, { color: followed ? Brand.accent : Brand.textMuted }]}>
        {followed ? '★' : '☆'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2 },
  star: { fontSize: 22, lineHeight: 24 },
});
