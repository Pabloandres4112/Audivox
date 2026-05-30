import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { styles } from './styles';

export const OnboardingScreen = ({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, 'Onboarding'>) => {
  const [index, setIndex] = useState(0);
  const done = useAppStore(s => s.completeOnboarding);
  const slides = [
    {
      title: 'Discover what fits your mood',
      description: 'Trending tracks, artists and playlists in a clean, fast flow.',
      icon: 'sparkles-outline',
    },
    {
      title: 'Control playback without friction',
      description: 'Mini player, queue, shuffle and repeat are always one tap away.',
      icon: 'play-circle-outline',
    },
    {
      title: 'Save data and continue later',
      description: 'Liked songs, downloads and recent activity persist locally.',
      icon: 'cloud-download-outline',
    },
  ] as const;

  const current = slides[index];
  const next = () => {
    if (index === slides.length - 1) {
      done();
      navigation.navigate('Login');
      return;
    }
    setIndex(prev => prev + 1);
  };

  return (
    <View style={styles.fullScreenCenter}>
      <View style={styles.onboardingCard}>
        <View style={styles.onboardingIcon}>
          <Icon name={current.icon} size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.onboardingStep}>
          Step {index + 1}/{slides.length}
        </Text>
        <Text style={styles.onboardingTitle}>{current.title}</Text>
        <Text style={styles.onboardingSub}>{current.description}</Text>
      </View>
      <View style={styles.pagerDots}>
        {slides.map((_, dotIndex) => (
          <View
            key={dotIndex}
            style={[styles.dot, dotIndex === index && styles.dotActive]}
          />
        ))}
      </View>
      <Pressable style={styles.primaryButton} onPress={next}>
        <Text style={styles.primaryButtonText}>
          {index === slides.length - 1 ? 'Finish' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
};
