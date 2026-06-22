import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

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
      <Ionicons
        name={followed ? 'star' : 'star-outline'}
        size={22}
        color={followed ? Brand.accent : Brand.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2 },
});
