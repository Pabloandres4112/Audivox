import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { artists, songs } from '../services/mockData';
import { localMediaService, LocalMediaItem } from '../services/localMediaService';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  ExternalDownloadFormat,
  ExternalDownloadStatus,
  useAppStore,
} from '../store/useAppStore';
import { styles } from './styles';

const FORMATS: ExternalDownloadFormat[] = ['mp3', 'm4a', 'mp4', 'wav'];

const youtubeRegex =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{6,}/;

const titleFromUrl = (url: string) => {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  const id = match?.[1] || 'track';
  return `YouTube audio ${id}`;
};

const statusText = (status: ExternalDownloadStatus) =>
  (
    {
      queued: 'En cola',
      downloading: 'Descargando',
      completed: 'Completado',
      failed: 'Error',
    } as const
  )[status];

const buildSafeFileName = (title: string, format: ExternalDownloadFormat) => {
  const base = title
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
  return `${base || `track_${Date.now()}`}.${format}`;
};

const dateLabel = (ts?: number) => {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

const fetchYoutubeMetadata = async (url: string) => {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      title?: string;
      thumbnail_url?: string;
    };
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch {
    return null;
  }
};

export const DownloadsScreen = () => {
  const ids = useAppStore(s => s.downloadedIds);
  const toggle = useAppStore(s => s.toggleDownload);
  const externalDownloads = useAppStore(s => s.externalDownloads);
  const enqueueExternalDownload = useAppStore(s => s.enqueueExternalDownload);
  const updateExternalDownload = useAppStore(s => s.updateExternalDownload);
  const addToDownloadHistory = useAppStore(s => s.addToDownloadHistory);
  const removeExternalDownload = useAppStore(s => s.removeExternalDownload);
  const downloadHistory = useAppStore(s => s.downloadHistory);
  const clearCompletedExternalDownloads = useAppStore(
    s => s.clearCompletedExternalDownloads,
  );
  const playSong = usePlayerStore(s => s.playSong);
  const currentSongId = usePlayerStore(s => s.current?.id);

  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<ExternalDownloadFormat>('mp3');
  const [error, setError] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [storageGranted, setStorageGranted] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalMediaItem[]>([]);
  const [imageFiles, setImageFiles] = useState<LocalMediaItem[]>([]);
  const [localStatus, setLocalStatus] = useState('Pendiente de permisos');

  const activeTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const list = songs.filter(song => ids.includes(song.id));

  const sortedExternalDownloads = useMemo(
    () =>
      [...externalDownloads].sort((a, b) => {
        if (a.status === 'downloading' && b.status !== 'downloading') return -1;
        if (b.status === 'downloading' && a.status !== 'downloading') return 1;
        return b.createdAt - a.createdAt;
      }),
    [externalDownloads],
  );

  const sortedHistory = useMemo(
    () =>
      [...downloadHistory].sort(
        (a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt),
      ),
    [downloadHistory],
  );
  const recentHistory = sortedHistory.slice(0, 3);

  useEffect(
    () => () => {
      Object.values(activeTimers.current).forEach(timer => clearInterval(timer));
      activeTimers.current = {};
    },
    [],
  );

  useEffect(() => {
    const init = async () => {
      const path = await localMediaService.ensureAudivoxFolder();
      setFolderPath(path);
    };
    init();
  }, []);

  const requestStorage = async () => {
    const result = await localMediaService.requestStoragePermissions();
    setStorageGranted(result.granted);
    setLocalStatus(result.granted ? 'Permiso concedido' : 'Permiso denegado');
  };

  const scanLocalFolder = async () => {
    if (!storageGranted) {
      setLocalStatus('Primero concede permisos de almacenamiento');
      return;
    }
    const scan = await localMediaService.scanAudivoxFolder();
    setFolderPath(scan.dir);
    setAudioFiles(scan.audio);
    setImageFiles(scan.images);
    setLocalStatus(
      `Escaneo listo: ${scan.audio.length} audio, ${scan.images.length} imagenes`,
    );
  };

  const startSimulatedDownload = (id: string) => {
    updateExternalDownload(id, { status: 'downloading', progress: 1, error: undefined });
    if (activeTimers.current[id]) {
      clearInterval(activeTimers.current[id]);
    }

    activeTimers.current[id] = setInterval(() => {
      const current = useAppStore
        .getState()
        .externalDownloads.find(item => item.id === id);

      if (!current) {
        clearInterval(activeTimers.current[id]);
        delete activeTimers.current[id];
        return;
      }

      const next = Math.min(100, current.progress + Math.floor(8 + Math.random() * 18));
      const isDone = next >= 100;
      const fileName = buildSafeFileName(current.title, current.format);

      updateExternalDownload(id, {
        progress: next,
        status: isDone ? 'completed' : 'downloading',
        completedAt: isDone ? Date.now() : current.completedAt,
        fileName,
        sizeLabel: isDone
          ? `${(2.8 + Math.random() * 6.6).toFixed(1)} MB`
          : current.sizeLabel,
      });

      if (isDone) {
        const completedAt = Date.now();
        const completedItem = {
          ...current,
          status: 'completed' as const,
          progress: 100,
          completedAt,
          fileName,
          sizeLabel: `${(2.8 + Math.random() * 6.6).toFixed(1)} MB`,
        };

        localMediaService
          .saveDemoDownloadedFile(
            current.title,
            current.format,
            current.url,
            current.thumbnailUrl,
          )
          .then(() => {
            addToDownloadHistory(completedItem);
            setSuccessText(`Descarga exitosa: ${completedItem.fileName}`);
            setLocalStatus('Descarga exitosa y archivo guardado en AudivoxMusic');
          })
          .catch(() => {
            setLocalStatus('No se pudo guardar archivo demo local');
          });
        clearInterval(activeTimers.current[id]);
        delete activeTimers.current[id];
      }
    }, 750);
  };

  const submitDownload = async () => {
    const cleanUrl = url.trim();
    if (!youtubeRegex.test(cleanUrl)) {
      setError('Pega una URL valida de YouTube (youtube.com o youtu.be).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessText(null);

    const meta = await fetchYoutubeMetadata(cleanUrl);

    const id = `ext-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    enqueueExternalDownload({
      id,
      url: cleanUrl,
      title: meta?.title || titleFromUrl(cleanUrl),
      thumbnailUrl: meta?.thumbnailUrl,
      format,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    });
    setUrl('');
    startSimulatedDownload(id);
    setIsSubmitting(false);
  };

  const removeItem = (id: string) => {
    if (activeTimers.current[id]) {
      clearInterval(activeTimers.current[id]);
      delete activeTimers.current[id];
    }
    removeExternalDownload(id);
  };

  const toPlayableSong = (
    item: {
      id: string;
      title: string;
      thumbnailUrl?: string;
      fileName?: string;
      url: string;
      completedAt?: number;
    },
    format: ExternalDownloadFormat,
  ) => ({
    id: `ext-${item.id}`,
    title: item.title,
    artistId: 'a1',
    albumId: 'al1',
    duration: 220,
    artwork: item.thumbnailUrl || songs[0].artwork,
    streamUrl: item.fileName
      ? `file://${localMediaService.getAudivoxMusicDir()}/${item.fileName}`
      : item.url,
  });

  const handlePlayExternal = async (
    item: {
      id: string;
      title: string;
      thumbnailUrl?: string;
      fileName?: string;
      url: string;
      status?: ExternalDownloadStatus;
    },
    format: ExternalDownloadFormat,
  ) => {
    if (item.status && item.status !== 'completed') {
      setLocalStatus('Espera a que finalice la descarga para reproducir.');
      return;
    }
    const playable = toPlayableSong(item, format);
    await playSong(playable);
    setSuccessText(`Reproduciendo: ${item.title}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <Text style={styles.pageTitle}>Descargas</Text>
      <Text style={styles.pageSub}>
        Pega una URL de YouTube para descargar en el formato que elijas.
      </Text>

      {successText ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successText}</Text>
        </View>
      ) : null}

      <View style={styles.localControlCard}>
        <Text style={styles.inputLabel}>Modo local (almacenamiento)</Text>
        <Text style={styles.localControlSub} numberOfLines={2}>
          Carpeta: {folderPath || 'Cargando...'}
        </Text>
        <View style={styles.localControlActions}>
          <Pressable onPress={requestStorage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Pedir permisos</Text>
          </Pressable>
          <Pressable onPress={scanLocalFolder} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Escanear carpeta</Text>
          </Pressable>
        </View>
        <Text style={styles.localControlStatus}>{localStatus}</Text>
        <Text style={styles.localControlSub}>
          Audio: {audioFiles.length} · Imagenes: {imageFiles.length}
        </Text>
      </View>

      <View style={styles.downloaderCard}>
        <Text style={styles.inputLabel}>URL de YouTube</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          style={styles.urlInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://youtu.be/..."
          placeholderTextColor="#8492b2"
        />

        <Text style={styles.inputLabel}>Formato de salida</Text>
        <View style={styles.formatRow}>
          {FORMATS.map(item => (
            <Pressable
              key={item}
              onPress={() => setFormat(item)}
              style={[
                styles.formatButton,
                format === item && styles.formatButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  format === item && styles.formatButtonTextActive,
                ]}
              >
                {item.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.downloaderError}>{error}</Text> : null}

        <Pressable
          onPress={submitDownload}
          style={styles.primaryButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#070B12" />
          ) : (
            <Text style={styles.primaryButtonText}>Agregar descarga</Text>
          )}
        </Pressable>

        <Text style={styles.downloaderHint}>
          Nota: descarga simulada UI. Al completar, se crea archivo demo local para
          validar permiso y escaneo.
        </Text>
      </View>

      <View style={styles.downloadsHeaderRow}>
        <Text style={styles.sectionTitle}>Descargas URL</Text>
        {sortedExternalDownloads.some(item => item.status === 'completed') ? (
          <Pressable onPress={clearCompletedExternalDownloads}>
            <Text style={styles.sectionAction}>Limpiar completadas</Text>
          </Pressable>
        ) : null}
      </View>

      {sortedExternalDownloads.length === 0 ? (
        <EmptyBlock
          title="Aun no hay descargas por URL"
          subtitle="Agrega una URL arriba para empezar."
          icon="cloud-download-outline"
        />
      ) : (
        sortedExternalDownloads.map(item => (
          <Pressable
            key={item.id}
            style={styles.downloadItemCard}
            onPress={() => handlePlayExternal(item, item.format)}
          >
            <View style={styles.downloadItemTopRow}>
              <Text style={styles.downloadItemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.downloadItemFormat}>{item.format.toUpperCase()}</Text>
            </View>
            <Text style={styles.downloadItemMeta} numberOfLines={1}>
              {statusText(item.status)} · {item.progress}%
              {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
            </Text>
            {currentSongId === `ext-${item.id}` ? (
              <Text style={styles.nowPlayingInline}>Reproduciendo</Text>
            ) : null}

            <View style={styles.downloadProgressTrack}>
              <View
                style={[
                  styles.downloadProgressFill,
                  { width: `${Math.max(2, item.progress)}%` },
                ]}
              />
            </View>

            <View style={styles.downloadItemActions}>
              {(item.status === 'failed' || item.status === 'completed') && (
                <Pressable
                  onPress={() => startSimulatedDownload(item.id)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Reintentar</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => removeItem(item.id)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Eliminar</Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      )}

      <View style={styles.downloadsHeaderRow}>
        <Text style={styles.sectionTitle}>Historial reciente</Text>
        <Pressable onPress={() => setIsHistoryModalOpen(true)}>
          <Text style={styles.sectionAction}>Ver historial completo</Text>
        </Pressable>
      </View>

      {recentHistory.length === 0 ? (
        <EmptyBlock
          title="Sin historial aun"
          subtitle="Cuando finalice una descarga aparecera aqui."
          icon="time-outline"
        />
      ) : (
        recentHistory.map(item => (
          <Pressable
            key={item.id}
            style={styles.historyCard}
            onPress={() => handlePlayExternal(item, item.format)}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.historyThumb} />
            ) : (
              <View style={styles.historyThumbFallback} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.downloadItemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.downloadItemMeta} numberOfLines={1}>
                {item.fileName || '-'}
              </Text>
              <Text style={styles.downloadItemMeta}>
                {item.format.toUpperCase()} · {item.sizeLabel || '-'} ·{' '}
                {dateLabel(item.completedAt)}
              </Text>
              {currentSongId === `ext-${item.id}` ? (
                <Text style={styles.nowPlayingInline}>Reproduciendo</Text>
              ) : null}
            </View>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Descargas de biblioteca</Text>
      {list.length === 0 ? (
        <EmptyBlock
          title="No hay descargas locales"
          subtitle="Usa detalles de una cancion para guardarla offline."
          icon="cloud-download-outline"
        />
      ) : (
        list.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={() => toggle(song.id)}
          />
        ))
      )}

      {(audioFiles.length > 0 || imageFiles.length > 0) && (
        <View style={styles.localFilesCard}>
          <Text style={styles.sectionTitle}>Archivos encontrados</Text>
          {audioFiles.slice(0, 5).map(file => (
            <Text key={file.path} style={styles.localFileRow} numberOfLines={1}>
              Audio: {file.name}
            </Text>
          ))}
          {imageFiles.slice(0, 5).map(file => (
            <Text key={file.path} style={styles.localFileRow} numberOfLines={1}>
              Imagen: {file.name}
            </Text>
          ))}
        </View>
      )}

      <Modal
        visible={isHistoryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsHistoryModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitle}>Historial completo</Text>
              <Pressable onPress={() => setIsHistoryModalOpen(false)}>
                <Text style={styles.sectionAction}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {sortedHistory.length === 0 ? (
                <EmptyBlock
                  title="Sin descargas"
                  subtitle="No hay elementos en el historial."
                  icon="albums-outline"
                />
              ) : (
                sortedHistory.map(item => (
                  <Pressable
                    key={`${item.id}-history`}
                    style={styles.historyCard}
                    onPress={() => handlePlayExternal(item, item.format)}
                  >
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.historyThumb}
                      />
                    ) : (
                      <View style={styles.historyThumbFallback} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.downloadItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.downloadItemMeta} numberOfLines={1}>
                        {item.fileName || '-'}
                      </Text>
                      <Text style={styles.downloadItemMeta}>
                        {item.format.toUpperCase()} · {item.sizeLabel || '-'} ·{' '}
                        {dateLabel(item.completedAt)}
                      </Text>
                      {currentSongId === `ext-${item.id}` ? (
                        <Text style={styles.nowPlayingInline}>Reproduciendo</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
