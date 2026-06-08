import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { isValidEmail, sanitizeEmailInput, sanitizeNameInput } from '../security/inputValidation';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { styles } from './styles';

export const LoginScreen = () => {
  const login = useAppStore(s => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    const safeName = sanitizeNameInput(name);
    const safeEmail = sanitizeEmailInput(email);
    if (!isValidEmail(safeEmail)) {
      setError('Ingresa un correo válido o deja el campo vacío.');
      return;
    }
    setError(null);
    login({ name: safeName, email: safeEmail || undefined, isGuest: false });
  };

  return (
    <ScrollView contentContainerStyle={styles.fullScreen}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSub}>
          Sign in quickly and continue building your library.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={value => setName(sanitizeNameInput(value, ''))}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={value => setEmail(sanitizeEmailInput(value))}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => login({ name: 'Guest Listener', isGuest: true })}
        >
          <Text style={styles.secondaryButtonText}>Use guest mode</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};
