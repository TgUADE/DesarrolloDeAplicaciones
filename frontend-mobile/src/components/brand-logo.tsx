import { Image, StyleSheet, View } from 'react-native';

import { Brand, Shadow } from '@/constants/theme';

const LOGO = require('../../assets/images/logo.png');

/**
 * Marca de SubastApp (App Icon de la guía de estilo): logo real (mazo + "SA")
 * sobre un cuadrado redondeado en azul de marca. Radio y proporciones tomados
 * del diseño (rx 40 sobre 200 = 0.2).
 */
export function BrandLogo({ size = 120 }: { size?: number }) {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.2, padding: size * 0.12 },
      ]}>
      <Image source={LOGO} style={styles.img} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.elevated,
  },
  img: { width: '100%', height: '100%' },
});
