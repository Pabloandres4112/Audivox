import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import { EmptyBlock } from '../components/common/StateBlocks';
import {
  assertAllowedRemoteUrl,
  BLOCKED_HOST_KEYWORDS,
  isAllowedWebViewRequest,
  WEBVIEW_CSP,
} from '../security/networkPolicy';
import { securityService } from '../security/securityService';
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

const WEB_DOWNLOADER_URL = 'https://v3.y2mate.nu/es/';

// Dominios bloqueados a nivel de navegación (adultos, ilegales, publicidad agresiva)
// JS inyectado en el WebView:
// 1. Bloquea todos los popups/window.open (excepto descarga de audio)
// 2. Oculta iframes de anuncios y overlays flotantes con CSS
// 3. Elimina dinámicamente elementos de ad que se agregan al DOM
// 4. Intercepta clics en enlaces de descarga y los manda a React Native
const WEBVIEW_JS = `
(function() {
  /* ── 1. Bloquear popups ─────────────────────────────────────── */
  window.open = function(url) {
    if (!url) return null;
    if (/\\.(mp3|m4a|webm|ogg|opus|aac|wav)(\\?|$)/i.test(url) || /\\/dl\\//i.test(url)) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DOWNLOAD', url: url }));
    }
    return null; // Bloquea TODO window.open que no sea descarga
  };
  window.alert   = function() {};
  window.confirm = function() { return false; };
  window.prompt  = function() { return null; };

  /* ── 2. CSS anti-anuncios ───────────────────────────────────── */
  var css = [
    /* Iframes externos (publicidad) */
    'iframe:not([src*="y2mate"]) { display:none!important; }',
    /* Clases de anuncios comunes */
    '.adsbox,.adsbygoogle,.ads-wrapper,.ad-container,.ad-banner,.banner-ad,.ad-slot { display:none!important; }',
    /* FuckAdBlock y similares */
    '#fc-shadow,#fc-dialog,.fc-dialog-container,[class*="fc-ab"],[id*="fc-ab"] { display:none!important; }',
    /* Overlays flotantes (pop-under, popads) */
    '#pop_up_box,#pop_up_overlay,.popup-wrapper,.popup-overlay,.popover-ad { display:none!important; }',
    /* Sticky/floating ads */
    '[class*="sticky-ad"],[class*="sticky_ad"],[id*="sticky-ad"],[class*="float-ad"] { display:none!important; }',
    /* Div posicionado fijo con z-index enorme = overlay de publicidad */
    'div[style*="position:fixed"][style*="z-index:99"],div[style*="position: fixed"][style*="z-index: 99"] { display:none!important; }',
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var csp = document.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = ${JSON.stringify(WEBVIEW_CSP)};
  document.head.appendChild(csp);

  /* ── 3. Eliminar ads dinámicos con MutationObserver ────────── */
  var AD_IFRAME_SRCS = ${JSON.stringify(BLOCKED_HOST_KEYWORDS)};
  function removeAd(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'IFRAME') {
      var src = (node.src || '').toLowerCase();
      if (AD_IFRAME_SRCS.some(function(d){ return src.indexOf(d) > -1; })) {
        node.remove();
        return;
      }
    }
    var st = node.style;
    if (st && st.position === 'fixed' && parseInt(st.zIndex||'0') > 9000) {
      node.remove();
    }
  }
  new MutationObserver(function(ms) {
    ms.forEach(function(m) {
      m.addedNodes.forEach(removeAd);
    });
  }).observe(document.body, { childList: true, subtree: true });

  /* ── 4. Interceptar clics en enlaces de descarga ────────────── */
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || !el.href) return;
    var href = el.href;
    var isAudio = /\\.(mp3|m4a|webm|ogg|opus|aac|wav)(\\?|$|#)/i.test(href);
    var isDl = el.getAttribute('download') !== null ||
               /dl\\.y2mate|ytmate|downloadLink|\\/dl\\/|\\/download\\//i.test(href);
    if (isAudio || isDl) {
      e.preventDefault();
      e.stopPropagation();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DOWNLOAD', url: href }));
    }
  }, true);

  true;
})();
`;

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

const dateLabel = (ts?: number) => {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type DownloadItemCardProps = {
  item: ExternalDownload;
  isPlaying: boolean;
  onPlay: () => void;
  onRetry: () => void;
  onRemove: () => void;
};

const DownloadItemCard = ({ item, isPlaying, onPlay, onRetry, onRemove }: DownloadItemCardProps) => (
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
        <Text style={styles.downloadItemTitle} numberOfLines={1}>{item.title}</Text>
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
        <Pressable onPress={onPlay} style={[styles.dlPlayBtn, isPlaying && styles.dlPlayBtnPlaying]} hitSlop={8}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={18} color={theme.colors.background} />
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
        <View style={[styles.downloadProgressFill, { width: `${Math.max(2, item.progress)}%` }]} />
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
      <View style={[styles.historyThumb, { alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name="musical-note-outline" size={22} color={theme.colors.primary} />
      </View>
    )}
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.downloadItemTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.downloadItemMeta} numberOfLines={1}>{item.fileName || '-'}</Text>
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
      <Pressable onPress={onPlay} style={[styles.dlPlayBtn, isPlaying && styles.dlPlayBtnPlaying]} hitSlop={8}>
        <Icon name={isPlaying ? 'pause' : 'play'} size={17} color={theme.colors.background} />
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={10}>
        <Icon name="trash-outline" size={16} color={theme.colors.danger} />
      </Pressable>
    </View>
  </View>
);

// ─── WebView Modal ────────────────────────────────────────────────────────────

type WebDownloaderModalProps = {
  visible: boolean;
  onClose: () => void;
  onDownloadUrl: (url: string) => void;
};

const WebDownloaderModal = ({ visible, onClose, onDownloadUrl }: WebDownloaderModalProps) => {
  const wvRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Descargador web');

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'DOWNLOAD' && msg.url) {
        onDownloadUrl(msg.url);
        onClose();
      }
    } catch {}
  }, [onDownloadUrl, onClose]);

  const handleShouldStartLoad = useCallback((request: WebViewNavigation) => {
    const { url } = request;
    const urlLower = url.toLowerCase();

    // Interceptar descarga de audio → React Native la maneja
    const isAudio = /\.(mp3|m4a|webm|ogg|opus|aac|wav)(\?|$)/i.test(urlLower);
    const isDl = /dl\.y2mate|ytmate.*download|\/dl\/[a-z0-9]/i.test(urlLower);
    if (isAudio || isDl) {
      onDownloadUrl(url);
      onClose();
      return false;
    }

    // Bloquear dominios de contenido adulto / ilegal / publicidad agresiva
    return isAllowedWebViewRequest(urlLower);
  }, [onDownloadUrl, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Top bar */}
        <View style={webStyles.topBar}>
          <Pressable onPress={onClose} style={webStyles.topBtn} hitSlop={8}>
            <Icon name="close-outline" size={24} color={theme.colors.text} />
          </Pressable>

          <View style={webStyles.titleWrap}>
            {loading && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 6 }} />}
            <Text style={webStyles.title} numberOfLines={1}>{pageTitle}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable
              onPress={() => wvRef.current?.goBack()}
              style={[webStyles.topBtn, !canGoBack && { opacity: 0.3 }]}
              disabled={!canGoBack}
              hitSlop={8}
            >
              <Icon name="chevron-back-outline" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable
              onPress={() => wvRef.current?.goForward()}
              style={[webStyles.topBtn, !canGoForward && { opacity: 0.3 }]}
              disabled={!canGoForward}
              hitSlop={8}
            >
              <Icon name="chevron-forward-outline" size={22} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Hint */}
        <View style={webStyles.hint}>
          <Icon name="information-circle-outline" size={13} color={theme.colors.primary} />
          <Text style={webStyles.hintText}>
            Pega el link de YouTube → elige MP3 → descarga. El archivo se guarda en AudivoxMusic.
          </Text>
        </View>

        {/* WebView con bloqueo de anuncios y contenido adulto */}
        <WebView
          ref={wvRef}
          source={{ uri: WEB_DOWNLOADER_URL }}
          style={{ flex: 1 }}
          injectedJavaScript={WEBVIEW_JS}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={nav => {
            setCanGoBack(nav.canGoBack);
            setCanGoForward(nav.canGoForward);
            if (nav.title) setPageTitle(nav.title);
          }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled={false}
          sharedCookiesEnabled={false}
          allowsFullscreenVideo={false}
        />
      </SafeAreaView>
    </Modal>
  );
};

const webStyles = {
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
    gap: 4,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700' as const,
    fontSize: 14,
  },
  topBtn: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 8,
  },
  hint: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  hintText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const DownloadsScreen = () => {
  const strictModeEnabled = securityService.isStrictModeEnabled();
  const externalDownloads = useAppStore(s => s.externalDownloads);
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

  const [successText, setSuccessText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isWebOpen, setIsWebOpen] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [storageGranted, setStorageGranted] = useState(false);
  const [audioFiles, setAudioFiles] = useState<LocalMediaItem[]>([]);
  const [localStatus, setLocalStatus] = useState('Permisos pendientes');

  const activeDownloads = useRef<Set<string>>(new Set());

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
    () => [...downloadHistory].sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt)),
    [downloadHistory],
  );

  const recentHistory = sortedHistory.slice(0, 3);

  const playingItemId = useMemo(() => {
    if (!currentSong || !isPlayerPlaying) return null;
    return currentSong.id.startsWith('ext-') ? currentSong.id.slice(4) : null;
  }, [currentSong, isPlayerPlaying]);

  useEffect(() => {
    if (!successText) return;
    const t = setTimeout(() => setSuccessText(null), 4000);
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

  // Auto-iniciar descargas encoladas (pueden venir de SearchScreen)
  useEffect(() => {
    const queued = externalDownloads.filter(
      d => d.status === 'queued' && !activeDownloads.current.has(d.id),
    );
    queued.forEach(item => performDownload(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalDownloads]);

  const requestStorage = async () => {
    const result = await localMediaService.requestStoragePermissions();
    setStorageGranted(result.granted);
    setLocalStatus(result.granted ? 'Permisos concedidos' : 'Permisos denegados');
  };

  const scanLocalFolder = async () => {
    if (!storageGranted) { setLocalStatus('Concede permisos primero.'); return; }
    const scan = await localMediaService.scanAudivoxFolder();
    setFolderPath(scan.dir);
    setAudioFiles(scan.audio);
    setLocalStatus(`Listo: ${scan.audio.length} audio · ${scan.images.length} imágenes`);
  };

  const performDownload = async (
    item: Pick<ExternalDownload, 'id' | 'title' | 'thumbnailUrl' | 'format' | 'url'>,
  ) => {
    const snapshot = useAppStore.getState().externalDownloads.find(d => d.id === item.id);
    const target = snapshot ?? item;
    if (!target) return;

    activeDownloads.current.add(target.id);
    updateExternalDownload(target.id, { status: 'downloading', progress: 1, error: undefined });

    try {
      const result = await localMediaService.downloadRemoteAudio(
        target.url,
        target.title,
        target.format,
        target.thumbnailUrl,
        pct => {
          if (activeDownloads.current.has(target.id)) {
            updateExternalDownload(target.id, { progress: pct });
          }
        },
      );

      if (!activeDownloads.current.has(target.id)) return;

      const completedAt = Date.now();
      const fresh = useAppStore.getState().externalDownloads.find(d => d.id === target.id);
      if (!fresh) return;

      const completedItem: ExternalDownload = {
        ...fresh, status: 'completed', progress: 100, completedAt,
        fileName: result.fileName, sizeLabel: result.sizeLabel,
      };

      updateExternalDownload(target.id, {
        status: 'completed', progress: 100, completedAt,
        fileName: result.fileName, sizeLabel: result.sizeLabel,
      });
      addToDownloadHistory(completedItem);
      setSuccessText(`Descarga lista: ${result.fileName}`);
      scanLocalFolder().catch(() => {});
    } catch (err) {
      if (!activeDownloads.current.has(target.id)) return;
      const msg = err instanceof Error ? err.message : String(err);
      updateExternalDownload(target.id, { status: 'failed', progress: 0, error: msg });
      setErrorText(msg);
    } finally {
      activeDownloads.current.delete(target.id);
    }
  };

  // Llamado cuando el WebView intercepta una URL de descarga
  const handleWebDownload = useCallback((url: string) => {
    const id = `ext-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const guessTitle = url.split('/').pop()?.split('?')[0]?.replace(/\.[^.]+$/, '') || `descarga_${Date.now()}`;
    const guessExt = (url.match(/\.(mp3|m4a|webm|ogg|opus|aac|wav)/i)?.[1] ?? 'mp3') as ExternalDownloadFormat;

    const item: ExternalDownload = {
      id, url, title: decodeURIComponent(guessTitle).slice(0, 80),
      format: guessExt, status: 'queued', progress: 0, createdAt: Date.now(),
    };

    try {
      assertAllowedRemoteUrl(url);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'URL de descarga bloqueada.');
      return;
    }

    useAppStore.getState().enqueueExternalDownload(item);
    performDownload(item);
    if (!strictModeEnabled) {
      setSuccessText('Descarga iniciada desde el navegador web');
    }
  }, [strictModeEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeItem = (id: string) => {
    activeDownloads.current.delete(id);
    const item = useAppStore.getState().externalDownloads.find(d => d.id === id);
    if (item?.fileName) localMediaService.unlinkDownloadedFile(item.fileName).catch(() => {});
    removeExternalDownload(id);
  };

  const removeHistoryItem = (id: string) => {
    const item = useAppStore.getState().downloadHistory.find(d => d.id === id);
    if (item?.fileName) localMediaService.unlinkDownloadedFile(item.fileName).catch(() => {});
    removeFromDownloadHistory(id);
  };

  const handlePlayItem = async (item: {
    id: string; title: string; thumbnailUrl?: string;
    fileName?: string; url: string; status?: ExternalDownloadStatus; format: ExternalDownloadFormat;
  }) => {
    if (item.status && item.status !== 'completed') {
      setLocalStatus('Espera a que la descarga finalice para reproducir.');
      return;
    }
    const dir = localMediaService.getAudivoxMusicDir();
    const localUri = item.fileName ? `file://${dir}/${item.fileName}` : null;
    if (!localUri) { setErrorText('No hay archivo local. Descarga la canción primero.'); return; }

    const song = {
      id: `ext-${item.id}`, title: item.title, artistId: 'local', albumId: 'local',
      duration: 0, artwork: item.thumbnailUrl ?? '', streamUrl: localUri,
    };
    const ok = await playSong(song);
    if (ok) { setSuccessText(`Reproduciendo: ${item.title}`); setErrorText(null); }
    else setErrorText('No se pudo reproducir. El archivo puede estar corrupto.');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollPage}>
        <View>
          <Text style={styles.pageTitle}>Descargas</Text>
          <Text style={styles.pageSub}>Descarga música de YouTube y gestiona tus archivos offline.</Text>
        </View>

        {/* ── Card: Descargador web ── */}
        <Pressable style={styles.webDlCard} onPress={() => setIsWebOpen(true)}>
          <View style={styles.webDlIconWrap}>
            <Icon name="globe-outline" size={26} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.webDlTitle}>Descargar de YouTube</Text>
            <Text style={styles.webDlSub}>
              Abre el descargador web · pega el link · elige MP3 · descarga
            </Text>
          </View>
          <Icon name="open-outline" size={18} color={theme.colors.textMuted} />
        </Pressable>

        {/* Banners */}
        {!strictModeEnabled && successText ? (
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

        {/* ── Carpeta local ── */}
        <View style={styles.localControlCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="folder-open-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.inputLabel} numberOfLines={1}>
              {folderPath ? folderPath.split('/').slice(-2).join('/') : 'Inicializando…'}
            </Text>
          </View>
          <View style={styles.localControlActions}>
            <Pressable onPress={requestStorage} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Permisos</Text>
            </Pressable>
            <Pressable onPress={scanLocalFolder} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Escanear</Text>
            </Pressable>
          </View>
          <Text style={[styles.localControlStatus, !storageGranted && { color: theme.colors.textMuted }]}>
            {localStatus}
          </Text>
          {audioFiles.length > 0 && (
            <Text style={styles.localControlSub}>Audio: {audioFiles.length}</Text>
          )}
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
            title="Sin descargas activas"
            subtitle="Abre el descargador web, convierte un video a MP3 y la descarga aparecerá aquí."
            icon="cloud-download-outline"
          />
        ) : (
          sortedExternalDownloads.map(item => (
            <DownloadItemCard
              key={item.id}
              item={item}
              isPlaying={playingItemId === item.id}
              onPlay={() => handlePlayItem(item)}
              onRetry={() => performDownload(item)}
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
                <Text style={[styles.sectionAction, { color: theme.colors.danger }]}>Borrar todo</Text>
              </Pressable>
            )}
            {!strictModeEnabled ? (
              <Pressable onPress={() => setIsHistoryModalOpen(true)}>
                <Text style={styles.sectionAction}>Ver todo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {strictModeEnabled ? (
          <Text style={styles.pageSub}>
            Modo estricto activo: se silencian popups y avisos no esenciales.
          </Text>
        ) : null}

        {recentHistory.length === 0 ? (
          <EmptyBlock title="Sin historial" subtitle="Las descargas completadas aparecerán aquí." icon="time-outline" />
        ) : (
          recentHistory.map(item => (
            <HistoryCard
              key={item.id} item={item} isPlaying={playingItemId === item.id}
              onPlay={() => handlePlayItem(item)} onRemove={() => removeHistoryItem(item.id)}
            />
          ))
        )}

        {/* ── Archivos locales ── */}
        {audioFiles.length > 0 && (
          <View style={styles.localFilesCard}>
            <Text style={styles.sectionTitle}>Archivos en AudivoxMusic</Text>
            {audioFiles.slice(0, 8).map(file => (
              <Text key={file.path} style={styles.localFileRow} numberOfLines={1}>
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Modal historial ── */}
      <Modal visible={!strictModeEnabled && isHistoryModalOpen} animationType="slide" transparent onRequestClose={() => setIsHistoryModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitle}>Historial ({sortedHistory.length})</Text>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                {sortedHistory.length > 0 && (
                  <Pressable onPress={() => { clearDownloadHistory(); setIsHistoryModalOpen(false); }}>
                    <Text style={[styles.sectionAction, { color: theme.colors.danger }]}>Borrar todo</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setIsHistoryModalOpen(false)}>
                  <Text style={styles.sectionAction}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {sortedHistory.length === 0 ? (
                <EmptyBlock title="Sin descargas" subtitle="El historial está vacío." icon="albums-outline" />
              ) : (
                sortedHistory.map(item => (
                  <HistoryCard
                    key={`hist-${item.id}`} item={item} isPlaying={playingItemId === item.id}
                    onPlay={() => handlePlayItem(item)} onRemove={() => removeHistoryItem(item.id)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal WebView descargador ── */}
      <WebDownloaderModal
        visible={isWebOpen}
        onClose={() => setIsWebOpen(false)}
        onDownloadUrl={handleWebDownload}
      />
    </>
  );
};
