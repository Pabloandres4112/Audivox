import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { songs } from '../services/mockData';
import { Song } from '../types/music';

// Track reproducido recientemente (Audius o local). Se guarda en el store para
// que LibraryScreen pueda mostrar historial real sin depender de mockData.
export type RecentTrack = {
  id: string;
  title: string;
  artistName: string;
  artworkUrl?: string;
  duration: number;
  genre?: string;
  streamUrl: string;
};

type Profile = { name: string; email?: string; isGuest: boolean };
export type ExternalDownloadFormat = 'mp3' | 'm4a' | 'mp4' | 'wav';
export type ExternalDownloadStatus =
  | 'queued'
  | 'downloading'
  | 'completed'
  | 'failed';
export interface ExternalDownload {
  id: string;
  url: string;
  title: string;
  thumbnailUrl?: string;
  sourceType?: 'audius' | 'youtube-backend' | 'direct-url';
  format: ExternalDownloadFormat;
  detectedFormat?: string;
  contentType?: string;
  contentLength?: number;
  expectedDurationSec?: number;
  status: ExternalDownloadStatus;
  progress: number;
  createdAt: number;
  completedAt?: number;
  fileName?: string;
  sizeLabel?: string;
  error?: string;
}
interface AppState {
  onboardingDone: boolean;
  profile?: Profile;
  modePreference: 'online' | 'offline';
  isConnected: boolean;
  likedIds: string[];
  downloadedIds: string[];
  recentIds: string[];
  recentlyPlayedTracks: RecentTrack[];
  externalDownloads: ExternalDownload[];
  downloadHistory: ExternalDownload[];
  completeOnboarding: () => void;
  login: (p: Profile) => void;
  logout: () => void;
  toggleLike: (id: string) => void;
  toggleDownload: (id: string) => void;
  markRecent: (id: string) => void;
  addRecentTrack: (track: RecentTrack) => void;
  likedSongs: () => Song[];
  setModePreference: (mode: 'online' | 'offline') => void;
  setConnected: (connected: boolean) => void;
  enqueueExternalDownload: (download: ExternalDownload) => void;
  updateExternalDownload: (
    id: string,
    patch: Partial<ExternalDownload>,
  ) => void;
  addToDownloadHistory: (download: ExternalDownload) => void;
  removeFromDownloadHistory: (id: string) => void;
  clearDownloadHistory: () => void;
  removeExternalDownload: (id: string) => void;
  clearCompletedExternalDownloads: () => void;
}
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboardingDone: false,
      modePreference: 'online',
      isConnected: true,
      likedIds: [],
      downloadedIds: [],
      recentIds: [],
      recentlyPlayedTracks: [],
      externalDownloads: [],
      downloadHistory: [],
      completeOnboarding: () => set({ onboardingDone: true }),
      login: profile => set({ profile }),
      logout: () => set({ profile: undefined }),
      toggleLike: id =>
        set(s => ({
          likedIds: s.likedIds.includes(id)
            ? s.likedIds.filter(x => x !== id)
            : [id, ...s.likedIds],
        })),
      toggleDownload: id =>
        set(s => ({
          downloadedIds: s.downloadedIds.includes(id)
            ? s.downloadedIds.filter(x => x !== id)
            : [id, ...s.downloadedIds],
        })),
      markRecent: id =>
        set(s => ({
          recentIds: [id, ...s.recentIds.filter(x => x !== id)].slice(0, 20),
        })),
      addRecentTrack: track =>
        set(s => ({
          recentlyPlayedTracks: [
            track,
            ...s.recentlyPlayedTracks.filter(t => t.id !== track.id),
          ].slice(0, 30),
        })),
      likedSongs: () => songs.filter(s => get().likedIds.includes(s.id)),
      setModePreference: mode => set({ modePreference: mode }),
      setConnected: connected => set({ isConnected: connected }),
      enqueueExternalDownload: download =>
        set(s => ({
          externalDownloads: [download, ...s.externalDownloads],
        })),
      updateExternalDownload: (id, patch) =>
        set(s => ({
          externalDownloads: s.externalDownloads.map(item =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      addToDownloadHistory: download =>
        set(s => ({
          downloadHistory: [
            download,
            ...s.downloadHistory.filter(item => item.id !== download.id),
          ],
        })),
      removeFromDownloadHistory: id =>
        set(s => ({
          downloadHistory: s.downloadHistory.filter(item => item.id !== id),
        })),
      clearDownloadHistory: () => set({ downloadHistory: [] }),
      removeExternalDownload: id =>
        set(s => ({
          externalDownloads: s.externalDownloads.filter(item => item.id !== id),
        })),
      clearCompletedExternalDownloads: () =>
        set(s => ({
          externalDownloads: s.externalDownloads.filter(
            item => item.status !== 'completed',
          ),
        })),
    }),
    {
      name: 'audivox-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: s => ({
        onboardingDone: s.onboardingDone,
        profile: s.profile,
        modePreference: s.modePreference,
        isConnected: s.isConnected,
        likedIds: s.likedIds,
        downloadedIds: s.downloadedIds,
        recentIds: s.recentIds,
        recentlyPlayedTracks: s.recentlyPlayedTracks,
        externalDownloads: s.externalDownloads,
        downloadHistory: s.downloadHistory,
      }),
    },
  ),
);
