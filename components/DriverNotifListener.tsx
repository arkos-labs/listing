/**
 * DriverNotifListener
 * Écoute en Realtime les notifications envoyées par l'admin au chauffeur connecté.
 * À monter dans _layout.tsx pour les chauffeurs (ou dans (tabs)/_layout.tsx).
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Notification {
  id: string;
  message: string;
}

export function DriverNotifListener() {
  const { user, role } = useAuth();
  const [notif, setNotif] = useState<Notification | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (n: Notification) => {
    setNotif(n);
    Animated.spring(translateY, {
      toValue: 0, useNativeDriver: true, tension: 70, friction: 10,
    }).start();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => dismiss(n.id), 8000);
  };

  const dismiss = async (id?: string) => {
    Animated.timing(translateY, {
      toValue: -120, useNativeDriver: true, duration: 250,
    }).start(() => setNotif(null));
    if (id) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
  };

  // Charger les notifications non lues au démarrage
  useEffect(() => {
    if (!user || role !== 'driver') return;
    supabase
      .from('notifications')
      .select('id, message')
      .eq('driver_id', user.id)
      .eq('is_read', false)
      .order('sent_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) show(data[0]);
      });
  }, [user, role]);

  // Écouter les nouvelles notifications en Realtime
  useEffect(() => {
    if (!user || role !== 'driver') return;

    const channel = supabase
      .channel(`driver_notifs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `driver_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as { id: string; message: string };
          show({ id: n.id, message: n.message });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, role]);

  if (!notif) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <View style={styles.icon}>
        <Bell size={20} color="#fff" fill="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Message de l'admin</Text>
        <Text style={styles.msg}>{notif.message}</Text>
      </View>
      <TouchableOpacity onPress={() => dismiss(notif.id)} style={styles.close}>
        <X size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#134024',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  icon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  msg: { color: '#fff', fontSize: 14, fontWeight: '700' },
  close: { padding: 4 },
});
