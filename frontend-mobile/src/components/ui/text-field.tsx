import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

interface Props extends TextInputProps {
  label: string;
}

/** Campo de texto con etiqueta, estilo de la guía (superficie + borde de marca). */
export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, style]} placeholderTextColor={Brand.placeholder} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space.md },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Brand.text,
    marginBottom: space.xs + 2,
  },
  input: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: FontSize.base,
    color: Brand.text,
  },
});
