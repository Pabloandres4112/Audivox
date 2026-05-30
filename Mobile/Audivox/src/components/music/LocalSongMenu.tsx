import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import Icon from 'react-native-vector-icons/Ionicons';
import { LocalMediaItem } from '../../services/localMediaService';
import { theme } from '../../theme';

type Props = {
  item: LocalMediaItem | null;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
};

export const LocalSongMenu = ({
  item,
  isPlaying,
  onPlay,
  onDelete,
  onClose,
}: Props) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const nameNoExt = item.name.replace(/\.[^.]+$/, '');
  const ext = item.name.split('.').pop()?.toUpperCase() ?? 'AUDIO';
  const sizeMB = (item.size / 1024 / 1024).toFixed(1);

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={s.root}>
        {/* Fondo oscuro con fade */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 180 }}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={s.backdrop} onPress={handleClose} />
        </MotiView>

        {/* Sheet deslizante desde abajo */}
        <MotiView
          from={{ translateY: 420 }}
          animate={{ translateY: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.9 }}
          style={s.sheet}
        >
          {/* Indicador de arrastre */}
          <View style={s.handle} />

          {/* Información de la canción */}
          <View style={s.songRow}>
            <View style={[s.artBox, isPlaying && s.artBoxPlaying]}>
              <Icon
                name={isPlaying ? 'musical-notes' : 'musical-note-outline'}
                size={28}
                color={isPlaying ? theme.colors.background : theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.songName} numberOfLines={2}>{nameNoExt}</Text>
              <Text style={s.songMeta}>{ext} · {sizeMB} MB</Text>
              {isPlaying && (
                <View style={s.nowPlayingRow}>
                  <View style={s.nowPlayingDot} />
                  <Text style={s.nowPlayingText}>Reproduciendo ahora</Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.divider} />

          {/* Estado: confirmación de borrado */}
          {confirmDelete ? (
            <View style={s.confirmBox}>
              <View style={s.warnIconWrap}>
                <Icon name="warning-outline" size={28} color={theme.colors.danger} />
              </View>
              <Text style={s.confirmTitle}>¿Eliminar este archivo?</Text>
              <Text style={s.confirmSub}>
                El archivo se borrará del dispositivo.{'\n'}Esta acción no se puede deshacer.
              </Text>
              <Pressable
                style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Icon name="trash-outline" size={18} color="#fff" />
                <Text style={s.deleteBtnText}>
                  {deleting ? 'Eliminando…' : 'Sí, eliminar archivo'}
                </Text>
              </Pressable>
              <Pressable style={s.cancelSecondary} onPress={() => setConfirmDelete(false)}>
                <Text style={s.cancelSecondaryText}>Cancelar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Acción: Reproducir */}
              <Pressable
                style={({ pressed }) => [s.actionRow, pressed && s.actionRowPressed]}
                onPress={() => { onPlay(); handleClose(); }}
              >
                <View style={[s.actionIcon, { backgroundColor: 'rgba(83, 214, 196, 0.14)' }]}>
                  <Icon
                    name={isPlaying ? 'pause' : 'play'}
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={s.actionLabel}>
                  {isPlaying ? 'Pausar reproducción' : 'Reproducir'}
                </Text>
                {isPlaying && <View style={s.activeBadge} />}
              </Pressable>

              {/* Acción: Eliminar */}
              <Pressable
                style={({ pressed }) => [s.actionRow, pressed && s.actionRowPressed]}
                onPress={handleDelete}
              >
                <View style={[s.actionIcon, { backgroundColor: 'rgba(255, 106, 136, 0.14)' }]}>
                  <Icon name="trash-outline" size={22} color={theme.colors.danger} />
                </View>
                <Text style={[s.actionLabel, { color: theme.colors.danger }]}>
                  Eliminar del dispositivo
                </Text>
              </Pressable>

              <View style={s.divider} />

              {/* Cancelar */}
              <Pressable
                style={({ pressed }) => [s.cancelMain, pressed && s.actionRowPressed]}
                onPress={handleClose}
              >
                <Text style={s.cancelMainText}>Cancelar</Text>
              </Pressable>
            </>
          )}
        </MotiView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    backgroundColor: theme.colors.backgroundAlt,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 18,
  },
  // ── Info de canción ──────────────────────────────────────────────────────
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 18,
  },
  artBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artBoxPlaying: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  songName: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 23,
  },
  songMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  nowPlayingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  nowPlayingText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSoft,
    marginVertical: 8,
  },
  // ── Filas de acción ──────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 13,
    paddingHorizontal: 6,
    borderRadius: 16,
  },
  actionRowPressed: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  activeBadge: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.success,
  },
  // ── Cancelar ─────────────────────────────────────────────────────────────
  cancelMain: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 4,
  },
  cancelMainText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  // ── Confirmación de borrado ───────────────────────────────────────────────
  confirmBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  warnIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 106, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmTitle: {
    color: theme.colors.text,
    fontWeight: '900',
    fontSize: 18,
  },
  confirmSub: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.danger,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    marginTop: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  cancelSecondary: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelSecondaryText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 15,
  },
});
