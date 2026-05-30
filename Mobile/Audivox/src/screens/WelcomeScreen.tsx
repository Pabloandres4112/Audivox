import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MotiView } from 'moti';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { Chip } from './ui';
import { styles } from './styles';

export const WelcomeScreen = ({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) => {
  const login = useAppStore(s => s.login);
  return (
    <ScrollView contentContainerStyle={styles.fullScreen}>
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.welcomeWrap}
      >
        <View style={styles.brandMark}>
          <Icon name="radio-outline" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.welcomeTitle}>Audivox</Text>
        <Text style={styles.welcomeSub}>
          Musica, descubrimiento y reproduccion con una base preparada para crecer.
        </Text>
        <View style={styles.pillRow}>
          <Chip label="Home" active />
          <Chip label="Search" />
          <Chip label="Library" />
          <Chip label="Offline" />
        </View>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.primaryButtonText}>Start experience</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryButtonText}>Login / register</Text>
        </Pressable>
        <Pressable
          onPress={() => login({ name: 'Guest Listener', isGuest: true })}
        >
          <Text style={styles.linkText}>Continue as guest</Text>
        </Pressable>
      </MotiView>
    </ScrollView>
  );
};
