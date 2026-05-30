import React, { useEffect, useMemo, useState } from 'react';
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
import Icon from 'react-native-vector-icons/Ionicons';
import { EmptyBlock } from '../components/common/StateBlocks';
import { localMediaService, LocalMediaItem } from '../services/localMediaService';
import {
  ExternalDownload,
  ExternalDownloadFormat,
  ExternalDownloadStatus,
  useAppStore,
} from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { styles } from './styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMATS: ExternalDownloadFormat[] = ['mp3', 'm4a', 'wav'];

const youtubeRegex =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{6,}/;

const STATUS_LABEL: Record<ExternalDownloadStatus, string> = {
  queued: 'En cola',
  downloading: 'Descargando',
  completed: 'Completado',
  failed: 'Error',
};

const STATUS_COLOR: Record<ExternalDownloadStatus, string> = {
  queued: theme.colors.textMuted,
  downloading: theme.colors.primary,
  completed: theme.colors.success,
  failed: theme.colors.danger,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const titleFromUrl = (url: string) => {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return `YouTube ${m?.[1] ?? 'audio'}`;
};

const dateLabel = (ts?: number) => {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

const fetchYoutubeMeta = async (url: string) => {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    if (!res.ok) return null;
    const d = (await res.json()) as { title?: string; thumbnail_url?: string };
    return { title: d.title, thumbnailUrl: d.thumbnail_url };
  } catch {
    return null;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type DownloadItemCardProps = {
  item: ExternalDownload;
  isPlaying: boolean;
  onPlay: () => void;
  onRetry: () => void;
  onRemove: () => void;
};

const DownloadItemCard = ({
  item,
  isPlaying,
  onPlay,
  onRetry,
  onRemove,
}: DownloadItemCardProps) => (
  <View style={styles.downloadItemCard}>
    <View style={styles.dlCardRow}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.dlThumb} />
      ) : (
        <View style={[styles.dlThumb, styles.dlThumbFallback]}>
          <Icon name="musical-note-outline" size={20} color={theme.colors.primary} />
        </View>
      )}

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.downloadItemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <Text style={[styles.downloadItemMeta, { color: STATUS_COLOR[item.status] }]}>
            {STATUS_LABEL[item.status]}
          </Text>
          <Text style={styles.downloadItemMeta}>·</Text>
          <Text style={styles.downloadItemFormat}>{item.format.toUpperCase()}</Text>
          {item.sizeLabel ? (
            <>
              <Text style={styles.downloadItemMeta}>·</Text>
              <Text style={styles.downloadItemMeta}>{item.sizeLabel}</Text>
            </>
          ) : null}
        </View>
        {item.error ? (
          <Text style={[styles.downloadItemMeta, { color: theme.colors.danger }]} numberOfLines={2}>
            {item.error}
          </Text>
        ) : null}
        {isPlaying ? (
          <View style={styles.nowPlayingBadge}>
            <Icon name="musical-notes-outline" size={11} color={theme.colors.success} />
            <Text style={styles.nowPlayingInline}>Reproduciendo</Text>
          </View>
        ) : null}
      </View>

      {item.status === 'completed' ? (
        <Pressable
          onPress={onPlay}
          style={[styles.dlPlayBtn, isPlaying && styles.dlPlayBtnPlaying]}
          hitSlop={8}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={theme.colors.background}
          />
        </Pressable>
      ) : item.status === 'downloading' ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : item.status === 'queued' ? (
        <Icon name="time-outline" size={20} color={theme.colors.textMuted} />
      ) : (
        <Icon name="alert-circle-outline" size={20} color={theme.colors.danger} />
      )}
    </View>

    {item.status === 'downloading' && (
      <View style={styles.downloadProgressTrack}>
        <View
          style={[
            styles.downloadProgressFill,
            { width: `${Math.max(2, item.progress)}%` },
          ]}
        />
      </View>
    )}

    <View style={styles.dlActionsRow}>
      <Text style={styles.downloadItemMeta}>
        {item.status === 'downloading' ? `${item.progress}%` : dateLabel(item.createdAt)}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(item.status === 'failed' || item.status === 'completed') && (
          <Pressable onPress={onRetry} style={styles.dlActionBtn}>
            <Icon name="refresh-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.dlActionBtnText}>Reintentar</Text>
          </Pressable>
        )}
        <Pressable onPress={onRemove} style={styles.dlActionBtn}>
          <Icon name="trash-outline" size={12} color={theme.colors.danger} />
          <Text style={styles.dlDangerText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  </View>
);

type HistoryCardProps = {
  item: ExternalDownload;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
};

const HistoryCard = ({ item, isPlaying, onPlay, onRemove }: HistoryCardProps) => (
  <View style={styles.historyCard}>
    {item.thumbnailUrl ? (
      <Image source={{ uri: item.thumbnailUrl }} style={styles.historyThumb} />
    ) : (
      <View style={[styles.historyThumb, styles.historyThumbFallback]}>
        <Icon name="musical-note-outline" size={22} color={theme.colors.primary} />
      </View>
    )}
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.downloadItemTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.downloadItemMeta} numberOfLines={1}>
        {item.fileName || '-'}
      </Text>
      <Text style={styles.downloadItemMeta}>
        {item.format.toUpperCase()} · {item.sizeLabel || '-'} · {dateLabel(item.completedAt)}
      </Text>
      {isPlaying ? (
        <View style={styles.nowPlayingBadge}>
          <Icon name="musical-notes-outline" size={11} color={theme.colors.success} />
          <Text style={styles.nowPlayingInline}>Reproduciendo</Text>
        </View>
      ) : null}
    </View>
    <View style={{ gap: 6, alignItems: 'center' }}>
      <Pressable
        onPress={onPlay}
        style={[styles.dlPlayBtn, isPlaying && styles.dlPlayBtnPlaying]}
        hitSlop={8}
      >
        <Icon name={isPlaying ? 'pause' : 'play'} size={17} color={theme.colors.background} />
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={10}>
        <Icon name="trash-outline" size={16} color={theme.colors.danger} />
      </Pressable>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const DownloadsScreen = () => {
  const externalDownloads = useAppStore(s => s.externalDownloads);
  const enqueueExternalDownload = useAppStore(s => s.enqueueExternalDownload);
  const updateExternalDownload = useAppStore(s => s.updateExternalDownload);
  const addToDownloadHistory = useAppStore(s => s.addToDownloadHistory);
  const removeExternalDownload = useAppStore(s => s.removeExternalDownload);
  const removeFromDownloadHistory = useAppStore(s => s.removeFromDownloadHistory);
  const clearDownloadHistory = useAppStore(s => s.clearDownloadHistory);
  const downloadHistory = useAppStore(s => s.downloadHistory);
  const clearCompletedExternalDownloads = useAppStore(s => s.clearCompletedExternalDownloads);

  const playSong = usePlayerStore(s => s.playSong);
  const currentSong = usePlayerStore(s => s.current);
  const isPlayerPlaying = usePlayerStore(s => s.isPlaying);

  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<ExternalDownloadFormat>('mp3');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [storageGranted, setStorageGranted] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalMediaItem[]>([]);
  const [imageFiles, setImageFiles] = useState<LocalMediaItem[]>([]);
  const [localStatus, setLocalStatus] = useState('Permisos pendientes');

  // Tracking activo de descargas (para cancelación futura)
  const activeDownloads = React.useRef<Set<string>>(new Set());

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

  const playingItemId = useMemo(() => {
    if (!currentSong || !isPlayerPlaying) return null;
    return currentSong.id.startsWith('ext-') ? currentSong.id.slice(4) : null;
  }, [currentSong, isPlayerPlaying]);

  useEffect(() => {
    if (!successText) return;
    const t = setTimeout(() => setSuccessText(null), 6000);
    return () => clearTimeout(t);
  }, [successText]);

  useEffect(() => {
    if (!errorText) return;
    const t = setTimeout(() => setErrorText(null), 8000);
    return () => clearTimeout(t);
  }, [errorText]);

  useEffect(() => {
    localMediaService.ensureAudivoxFolder().then(setFolderPath).catch(() => {});
  }, []);

  const requestStorage = async () => {
    const result = await localMediaService.requestStoragePermissions();
    setStorageGranted(result.granted);
    setLocalStatus(result.granted ? 'Permisos concedidos' : 'Permisos denegados');
  };

  const scanLocalFolder = async () => {
    if (!storageGranted) {
      setLocalStatus('Concede permisos primero.');
      return;
    }
    const scan = await localMediaService.scanAudivoxFolder();
    setFolderPath(scan.dir);
    setAudioFiles(scan.audio);
    setImageFiles(scan.images);
    setLocalStatus(`Listo: ${scan.audio.length} audio · ${scan.images.length} imágenes`);
  };

  // ── Descarga real vía cobalt.tools ──────────────────────────────────────────
  const performDownload = async (id: string) => {
    const snapshot = useAppStore.getState().externalDownloads.find(d => d.id === id);
    if (!snapshot) return;

    activeDownloads.current.add(id);
    updateExternalDownload(id, { status: 'downloading', progress: 1, error: undefined });

    try {
      const result = await localMediaService.downloadYouTubeAudio(
        snapshot.url,
        snapshot.title,
        snapshot.format,
        snapshot.thumbnailUrl,
        (pct) => {
          if (activeDownloads.current.has(id)) {
            updateExternalDownload(id, { progress: pct });
          }
        },
      );

      if (!activeDownloads.current.has(id)) return; // fue eliminado

      const completedAt = Date.now();
      const fresh = useAppStore.getState().externalDownloads.find(d => d.id === id);
      if (!fresh) return;

      const completedItem: ExternalDownload = {
        ...fresh,
        status: 'completed',
        progress: 100,
        completedAt,
        fileName: result.fileName,
        sizeLabel: result.sizeLabel,
      };

      updateExternalDownload(id, {
        status: 'completed',
        progress: 100,
        completedAt,
        fileName: result.fileName,
        sizeLabel: result.sizeLabel,
      });
      addToDownloadHistory(completedItem);
      setSuccessText(`Descarga exitosa: ${result.fileName} (${result.sizeLabel ?? ''})`);
      setLocalStatus('Archivo guardado en AudivoxMusic');

    } catch (err) {
      if (!activeDownloads.current.has(id)) return;
      const msg = err instanceof Error ? err.message : String(err);
      updateExternalDownload(id, { status: 'failed', progress: 0, error: msg });
      setErrorText(msg);
    } finally {
      activeDownloads.current.delete(id);
    }
  };

  const submitDownload = async () => {
    const cleanUrl = url.trim();
    if (!youtubeRegex.test(cleanUrl)) {
      setErrorText('URL inválida. Usa youtube.com o youtu.be');
      return;
    }
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);

    const meta = await fetchYoutubeMeta(cleanUrl);
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
    setIsSubmitting(false);

    // Inicia descarga real (no bloquea el UI)
    performDownload(id);
  };

  const removeItem = (id: string) => {
    activeDownloads.current.delete(id); // cancela callback de progreso
    removeExternalDownload(id);
  };

  const handlePlayItem = async (item: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    fileName?: string;
    url: string;
    status?: ExternalDownloadStatus;
    format: ExternalDownloadFormat;
  }) => {
    if (item.status && item.status !== 'completed') {
      setLocalStatus('Espera a que la descarga finalice para reproducir.');
      return;
    }

    const dir = localMediaService.getAudivoxMusicDir();
    const localUri = item.fileName ? `file://${dir}/${item.fileName}` : null;

    const song = {
      id: `ext-${item.id}`,
      title: item.title,
      artistId: 'a1',
      albumId: 'al1',
      duration: 0,
      artwork: item.thumbnailUrl ?? '',
      streamUrl: localUri ?? '',
    };

    if (!localUri) {
      setErrorText('No hay archivo local. Descarga la canción primero.');
      return;
    }

    const ok = await playSong(song);

    if (ok) {
      setSuccessText(`Reproduciendo: ${item.title}`);
      setErrorText(null);
    } else {
      setErrorText(
        'No se pudo reproducir. El archivo puede estar corrupto o no es audio válido.',
      );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>

      <View>
        <Text style={styles.pageTitle}>Descargas</Text>
        <Text style={styles.pageSub}>Descarga música de YouTube y escúchala offline.</Text>
      </View>

      {successText ? (
        <View style={styles.successBanner}>
          <Icon name="checkmark-circle-outline" size={14} color={theme.colors.success} />
          <Text style={styles.successBannerText}>{successText}</Text>
        </View>
      ) : null}

      {errorText ? (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={14} color={theme.colors.danger} />
          <Text style={styles.errorBannerText}>{errorText}</Text>
        </View>
      ) : null}

      {/* ── Permisos y escaneo ── */}
      <View style={styles.localControlCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="folder-open-outline" size={15} color={theme.colors.primary} />
          <Text style={styles.inputLabel}>Carpeta: {folderPath || 'Inicializando...'}</Text>
        </View>
        <View style={styles.localControlActions}>
          <Pressable onPress={requestStorage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Pedir permisos</Text>
          </Pressable>
          <Pressable onPress={scanLocalFolder} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Escanear</Text>
          </Pressable>
        </View>
        <Text style={[styles.localControlStatus, !storageGranted && { color: theme.colors.textMuted }]}>
          {localStatus}
        </Text>
        {(audioFiles.length > 0 || imageFiles.length > 0) && (
          <Text style={styles.localControlSub}>
            Audio: {audioFiles.length} · Imágenes: {imageFiles.length}
          </Text>
        )}
      </View>

      {/* ── Descargador ── */}
      <View style={styles.downloaderCard}>
        <Text style={styles.sectionTitle}>Nueva descarga</Text>

        <Text style={styles.inputLabel}>URL de YouTube</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          style={styles.urlInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://youtu.be/..."
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.inputLabel}>Formato</Text>
        <View style={styles.formatRow}>
          {FORMATS.map(f => (
            <Pressable
              key={f}
              onPress={() => setFormat(f)}
              style={[styles.formatButton, format === f && styles.formatButtonActive]}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  format === f && styles.formatButtonTextActive,
                ]}
              >
                {f.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={submitDownload} style={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.primaryButtonText}>Descargar</Text>
          )}
        </Pressable>

        <View style={styles.demoBanner}>
          <Icon name="information-circle-outline" size={13} color={theme.colors.accent} />
          <Text style={styles.demoBannerText}>
            Usa cobalt.tools para obtener el audio real. Si la API falla, la descarga
            marcará error en lugar de guardar audio incorrecto.
          </Text>
        </View>
      </View>

      {/* ── Descargas activas ── */}
      <View style={styles.downloadsHeaderRow}>
        <Text style={styles.sectionTitle}>
          Descargas{sortedExternalDownloads.length > 0 ? ` (${sortedExternalDownloads.length})` : ''}
        </Text>
        {sortedExternalDownloads.some(i => i.status === 'completed') ? (
          <Pressable onPress={clearCompletedExternalDownloads}>
            <Text style={styles.sectionAction}>Limpiar</Text>
          </Pressable>
        ) : null}
      </View>

      {sortedExternalDownloads.length === 0 ? (
        <EmptyBlock
          title="Sin descargas"
          subtitle="Agrega una URL de YouTube arriba."
          icon="cloud-download-outline"
        />
      ) : (
        sortedExternalDownloads.map(item => (
          <DownloadItemCard
            key={item.id}
            item={item}
            isPlaying={playingItemId === item.id}
            onPlay={() => handlePlayItem(item)}
            onRetry={() => performDownload(item.id)}
            onRemove={() => removeItem(item.id)}
          />
        ))
      )}

      {/* ── Historial reciente ── */}
      <View style={styles.downloadsHeaderRow}>
        <Text style={styles.sectionTitle}>Historial reciente</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {sortedHistory.length > 0 && (
            <Pressable onPress={clearDownloadHistory}>
              <Text style={[styles.sectionAction, { color: theme.colors.danger }]}>
                Borrar todo
              </Text>
            </Pressable>
          )}
          <Pressable onPress={() => setIsHistoryModalOpen(true)}>
            <Text style={styles.sectionAction}>Ver todo</Text>
          </Pressable>
        </View>
      </View>

      {recentHistory.length === 0 ? (
        <EmptyBlock
          title="Sin historial"
          subtitle="Cuando finalice una descarga aparecerá aquí."
          icon="time-outline"
        />
      ) : (
        recentHistory.map(item => (
          <HistoryCard
            key={item.id}
            item={item}
            isPlaying={playingItemId === item.id}
            onPlay={() => handlePlayItem(item)}
            onRemove={() => removeFromDownloadHistory(item.id)}
          />
        ))
      )}


      {/* ── Archivos en AudivoxMusic ── */}
      {(audioFiles.length > 0 || imageFiles.length > 0) && (
        <View style={styles.localFilesCard}>
          <Text style={styles.sectionTitle}>Archivos en AudivoxMusic</Text>
          {audioFiles.slice(0, 8).map(file => (
            <Text key={file.path} style={styles.localFileRow} numberOfLines={1}>
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </Text>
          ))}
          {imageFiles.slice(0, 4).map(file => (
            <Text key={file.path} style={styles.localFileRow} numberOfLines={1}>
              {file.name}
            </Text>
          ))}
        </View>
      )}

      {/* ── Modal historial ── */}
      <Modal
        visible={isHistoryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsHistoryModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitle}>Historial ({sortedHistory.length})</Text>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                {sortedHistory.length > 0 && (
                  <Pressable
                    onPress={() => {
                      clearDownloadHistory();
                      setIsHistoryModalOpen(false);
                    }}
                  >
                    <Text style={[styles.sectionAction, { color: theme.colors.danger }]}>
                      Borrar todo
                    </Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setIsHistoryModalOpen(false)}>
                  <Text style={styles.sectionAction}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {sortedHistory.length === 0 ? (
                <EmptyBlock
                  title="Sin descargas"
                  subtitle="El historial está vacío."
                  icon="albums-outline"
                />
              ) : (
                sortedHistory.map(item => (
                  <HistoryCard
                    key={`hist-${item.id}`}
                    item={item}
                    isPlaying={playingItemId === item.id}
                    onPlay={() => handlePlayItem(item)}
                    onRemove={() => removeFromDownloadHistory(item.id)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
