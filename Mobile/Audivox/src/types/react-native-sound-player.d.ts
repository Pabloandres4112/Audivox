declare module 'react-native-sound-player' {
  type SoundPlayerEventType =
    | 'FinishedLoading'
    | 'FinishedPlaying'
    | 'FinishedLoadingURL'
    | 'FinishedLoadingFile';

  interface SoundPlayerInfo {
    currentTime: number;
    duration: number;
  }

  interface SoundPlayerEventSubscription {
    remove: () => void;
  }

  const SoundPlayer: {
    playUrl(url: string): void;
    pause(): void;
    resume(): void;
    stop(): void;
    getInfo(): Promise<SoundPlayerInfo>;
    addEventListener(
      eventType: SoundPlayerEventType,
      callback: (data: { success: boolean }) => void,
    ): SoundPlayerEventSubscription;
  };

  export default SoundPlayer;
}
