import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { styles } from './styles';

export const LoginScreen = () => {
  const login = useAppStore(s => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

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
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            login({ name: name || 'Listener', email, isGuest: false })
          }
        >
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
