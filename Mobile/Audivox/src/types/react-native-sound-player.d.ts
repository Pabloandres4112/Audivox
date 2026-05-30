declare module 'react-native-sound-player' {
  const SoundPlayer: {
    playUrl(url: string): void;
    pause(): void;
    resume(): void;
    stop(): void;
  };

  export default SoundPlayer;
}
