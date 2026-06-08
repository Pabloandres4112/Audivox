import React from 'react';
import { Text, View } from 'react-native';
import { theme } from '../../theme';

export const CompromisedEnvironmentScreen = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    }}
  >
    <Text style={{ color: theme.colors.danger, fontSize: 24, fontWeight: '800' }}>
      Entorno comprometido detectado
    </Text>
    <Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24 }}>
      Audivox se deshabilitó para proteger tus datos porque el dispositivo parece tener
      root o jailbreak.
    </Text>
    <Text style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 22 }}>
      Usa un dispositivo confiable para continuar.
    </Text>
  </View>
);
