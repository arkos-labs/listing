/**
 * RealtimeToast.tsx
 *
 * Toast flottant qui apparaît sur tous les appareils connectés
 * dès qu'un utilisateur ajoute de nouvelles courses via Supabase Realtime.
 *
 * Usage : placer <RealtimeToast /> dans _layout.tsx, au-dessus de tout.
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useReference } from '@/context/ReferenceContext';
import { useTheme } from '@/context/ThemeContext';

const TOAST_DURATION_MS = 5000; // se ferme automatiquement après 5s

export function RealtimeToast() {
  const { realtimeNotif, clearNotif } = useReference();
  const { colors } = useTheme();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!realtimeNotif) return;

    // Annuler l'auto-close précédent si une nouvelle notif arrive
    if (timerRef.current) clearTimeout(timerRef.current);

    // Slide-in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-close après TOAST_DURATION_MS
    timerRef.current = setTimeout(() => {
      hide();
    }, TOAST_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [realtimeNotif?.id]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => clearNotif());
  };

  if (!realtimeNotif) return null;

  const { count } = realtimeNotif;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.toast, { backgroundColor: colors.card }]}>
        {/* Barre verte à gauche */}
        <View style={[styles.accentBar, { backgroundColor: '#16a34a' }]} />

        <View style={styles.content}>
          <Text style={styles.emoji}>🚀</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              Nouvelles courses ajoutées
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              {count} course{count > 1 ? 's' : ''} {count > 1 ? 'ont été ajoutées' : 'a été ajoutée'} à la base
            </Text>
          </View>
          <TouchableOpacity onPress={hide} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.closeText, { color: colors.textFaint }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 20,
  },
  toast: {
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  accentBar: {
    width: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    alignSelf: 'flex-start',
    padding: 2,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
